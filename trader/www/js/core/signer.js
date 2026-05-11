// Hyperliquid signing — implements the L1-action phantom-agent flow.
// Reference: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/signing
//
//   actionHash = keccak256( msgpack(action) || nonce_BE8 || vaultByte[+vaultAddr20] )
//   phantomAgent = { source: isMainnet?'a':'b', connectionId: actionHash }
//   sig = signTypedData({ Exchange, 1, chainId=1337, 0x0..0 }, { Agent }, phantomAgent)
//
// ethers.js v6 is loaded from CDN as `window.ethers`.
// msgpack-lite is loaded from CDN as `window.msgpack`.

const ethers = window.ethers;

// L1 action signing domain (constant — chainId is always 1337 for HL)
const L1_DOMAIN = {
  name: 'Exchange',
  version: '1',
  chainId: 1337,
  verifyingContract: '0x0000000000000000000000000000000000000000',
};

const L1_TYPES = {
  Agent: [
    { name: 'source', type: 'string' },
    { name: 'connectionId', type: 'bytes32' },
  ],
};

// User-signed action domain (chainId is real Arbitrum / Sepolia)
function userDomain(isMainnet) {
  return {
    name: 'HyperliquidSignTransaction',
    version: '1',
    chainId: isMainnet ? 42161 : 421614,
    verifyingContract: '0x0000000000000000000000000000000000000000',
  };
}

export class HLSigner {
  constructor(privateKey) {
    if (!privateKey) throw new Error('HLSigner: privateKey is required');
    this.wallet = new ethers.Wallet(privateKey);
    this.address = this.wallet.address;
  }

  getAddress() { return this.address; }

  /**
   * Sign an L1 action (order, cancel, updateLeverage, ...).
   * Returns `{ r, s, v }` ready to drop into the /exchange request body.
   */
  async signL1Action(action, nonce, vaultAddress, isMainnet) {
    const connectionId = computeActionHash(action, nonce, vaultAddress);
    const phantomAgent = {
      source: isMainnet ? 'a' : 'b',
      connectionId,
    };
    const sig = await this.wallet.signTypedData(L1_DOMAIN, L1_TYPES, phantomAgent);
    return splitSig(sig);
  }

  /**
   * Sign a user-signed action (usdSend, withdraw3, ...).
   * `types` and `primaryType` describe the EIP-712 structure of the action.
   */
  async signUserAction(action, types, isMainnet) {
    const sig = await this.wallet.signTypedData(userDomain(isMainnet), types, action);
    return splitSig(sig);
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Internal helpers

function computeActionHash(action, nonce, vaultAddress) {
  const packed = window.msgpack.encode(action);

  const nonceBytes = new Uint8Array(8);
  // BE 8-byte nonce. Math.floor handles the millis range; high 32 bits via /2^32.
  const high = Math.floor(nonce / 0x100000000);
  const low = nonce >>> 0;
  nonceBytes[0] = (high >>> 24) & 0xff;
  nonceBytes[1] = (high >>> 16) & 0xff;
  nonceBytes[2] = (high >>> 8) & 0xff;
  nonceBytes[3] = high & 0xff;
  nonceBytes[4] = (low >>> 24) & 0xff;
  nonceBytes[5] = (low >>> 16) & 0xff;
  nonceBytes[6] = (low >>> 8) & 0xff;
  nonceBytes[7] = low & 0xff;

  let vaultBytes;
  if (vaultAddress) {
    const addr = vaultAddress.toLowerCase().replace(/^0x/, '');
    if (addr.length !== 40) throw new Error('vaultAddress must be a 20-byte hex');
    vaultBytes = new Uint8Array(21);
    vaultBytes[0] = 0x01;
    for (let i = 0; i < 20; i++) {
      vaultBytes[1 + i] = parseInt(addr.substr(i * 2, 2), 16);
    }
  } else {
    vaultBytes = new Uint8Array([0x00]);
  }

  // Concat
  const total = new Uint8Array(packed.length + nonceBytes.length + vaultBytes.length);
  total.set(packed, 0);
  total.set(nonceBytes, packed.length);
  total.set(vaultBytes, packed.length + nonceBytes.length);

  return ethers.keccak256(total);
}

function splitSig(sigHex) {
  // ethers v6 returns 0x{r}{s}{v} as 65 bytes
  const sig = ethers.Signature.from(sigHex);
  return {
    r: sig.r,
    s: sig.s,
    v: sig.v,
  };
}

// Generate a fresh wallet (used by setup screen).
export function generateWallet() {
  const w = ethers.Wallet.createRandom();
  return { privateKey: w.privateKey, address: w.address };
}

// Validate a private key and return the matching address. Throws on invalid input.
export function addressFromPrivateKey(pk) {
  return new ethers.Wallet(pk).address;
}
