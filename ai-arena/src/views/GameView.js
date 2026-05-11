import { state } from '../state.js';
import { PROVIDERS, callProvider, getModel } from '../providers/index.js';
import { estimateCost, formatCost } from '../providers/pricing.js';
import { MODES } from '../modes/index.js';
import { navigate } from '../router.js';
import { toast } from '../components/Toast.js';

export function GameView(root) {
  const game = state.game;
  if (!game) { navigate('home'); return; }
  const mode = MODES[game.modeId];
  const built = mode.build(game.subject, game.customPrompts || {});

  // Display names
  const displayName = (side) => {
    const cfg = game[side];
    if (cfg.name && cfg.name.trim()) return cfg.name.trim();
    const m = getModel(cfg.provider, cfg.model);
    return m ? m.label : cfg.model;
  };
  const initials = (s) => (s || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() || 'AI';

  const unlimited = !game.turns || game.turns === 0;
  const session = {
    transcript: [],
    turn: 0,
    maxTurns: unlimited ? Infinity : game.turns,
    unlimited,
    nextSide: 'A',
    paused: false,
    busy: false,
    finished: false,
    pendingPlayerInjection: null,
    usage: {
      A: { input: 0, output: 0, cost: 0, calls: 0 },
      B: { input: 0, output: 0, cost: 0, calls: 0 }
    }
  };

  // Initial layout
  root.innerHTML = `
    <div class="game-shell">
      <div class="game-info-bar">
        <span class="game-mode-pill">${mode.emoji} ${mode.name}</span>
        <div class="game-vs">
          <span class="ai-tag-red">${displayName('A')}</span>
          <span class="text-muted">vs</span>
          <span class="ai-tag-blue">${displayName('B')}</span>
        </div>
        <span class="text-muted" id="turnCounter">Tour 0${unlimited ? ' / ♾️' : ' / ' + session.maxTurns}</span>
      </div>
      <div class="usage-bar" id="usageBar">
        <div class="usage-side usage-side-red">
          <span class="ai-tag-red">●</span>
          <span data-side="A" data-stat="tokens">0 tok</span>
          <span class="text-muted">·</span>
          <span data-side="A" data-stat="cost">$0</span>
        </div>
        <div class="usage-total">
          Total : <strong data-stat="totalTokens">0 tok</strong>
          · <strong data-stat="totalCost">$0</strong>
        </div>
        <div class="usage-side usage-side-blue">
          <span class="ai-tag-blue">●</span>
          <span data-side="B" data-stat="tokens">0 tok</span>
          <span class="text-muted">·</span>
          <span data-side="B" data-stat="cost">$0</span>
        </div>
      </div>
      ${game.subject ? `<div style="padding: 12px 16px; background: var(--surface-2); border-bottom: 1px solid var(--border); font-size: 13px;"><strong>Sujet :</strong> ${escapeHtml(game.subject)}</div>` : ''}
      <div class="messages-area" id="messagesArea"></div>
      <div class="game-controls">
        <button class="btn btn-small" id="pauseBtn">${state.settings.autoPlay ? '⏸ Pause' : '▶ Auto'}</button>
        <button class="btn btn-small btn-primary" id="nextBtn">▶ Prochain tour</button>
        <button class="btn btn-small" id="interveneBtn">✍️ Intervenir</button>
        <button class="btn btn-small" id="endBtn">🏁 Terminer</button>
      </div>
    </div>
  `;

  const area = root.querySelector('#messagesArea');
  const turnCounter = root.querySelector('#turnCounter');

  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function renderMessage(entry) {
    const wrap = document.createElement('div');
    if (entry.side === 'P') {
      wrap.className = 'message message-player';
      wrap.innerHTML = `
        <div class="avatar avatar-player">👤</div>
        <div>
          <div class="bubble-meta">Joueur</div>
          <div class="bubble">${escapeHtml(entry.text)}</div>
        </div>`;
    } else {
      const sideClass = entry.side === 'A' ? 'red' : 'blue';
      const name = displayName(entry.side);
      const provider = PROVIDERS[game[entry.side].provider].label;
      wrap.className = `message message-${sideClass}`;
      wrap.innerHTML = `
        <div class="avatar avatar-${sideClass}">${initials(name)}</div>
        <div>
          <div class="bubble-meta">
            <strong>${escapeHtml(name)}</strong>
            <span class="provider-badge pb-${game[entry.side].provider}">${provider}</span>
          </div>
          <div class="bubble ${entry.error ? 'bubble-error' : ''}">${entry.error ? '⚠️ ' : ''}${escapeHtml(entry.text)}</div>
        </div>`;
    }
    area.appendChild(wrap);
    area.scrollTop = area.scrollHeight;
    return wrap;
  }

  function renderTyping(side) {
    const sideClass = side === 'A' ? 'red' : 'blue';
    const name = displayName(side);
    const wrap = document.createElement('div');
    wrap.className = `message message-${sideClass}`;
    wrap.id = 'typingBubble';
    wrap.innerHTML = `
      <div class="avatar avatar-${sideClass}">${initials(name)}</div>
      <div>
        <div class="bubble-meta"><strong>${escapeHtml(name)}</strong></div>
        <div class="bubble" style="color: var(--${sideClass === 'red' ? 'red' : 'blue'})">
          <div class="typing"><span></span><span></span><span></span></div>
        </div>
      </div>`;
    area.appendChild(wrap);
    area.scrollTop = area.scrollHeight;
  }

  function removeTyping() {
    const t = document.getElementById('typingBubble');
    if (t) t.remove();
  }

  // Build messages history for the model whose turn it is
  function buildHistoryFor(side) {
    // For side A, A messages = "assistant", B messages = "user"
    const messages = [];
    // Always start with seed user message so the API is content-valid
    messages.push({ role: 'user', content: built.seedUserMessage });

    for (const e of session.transcript) {
      if (e.error) continue;
      if (e.side === 'P') {
        messages.push({ role: 'user', content: `[Joueur] ${e.text}` });
      } else if (e.side === side) {
        messages.push({ role: 'assistant', content: e.text });
      } else {
        messages.push({ role: 'user', content: e.text });
      }
    }

    // If a player injection just happened, prepend it
    if (session.pendingPlayerInjection) {
      messages.push({ role: 'user', content: `[Le Joueur intervient] ${session.pendingPlayerInjection}` });
      session.pendingPlayerInjection = null;
    }

    return messages;
  }

  async function playTurn() {
    if (session.finished || session.busy) return;
    session.busy = true;
    setControlsBusy(true);

    const side = session.nextSide;
    const cfg = game[side];
    const sysPrompt = side === 'A' ? built.systemA : built.systemB;
    const messages = buildHistoryFor(side);

    renderTyping(side);

    const { text, error, usage } = await callProvider(
      cfg.provider,
      { key: state.settings.providers[cfg.provider].key, model: cfg.model },
      messages,
      sysPrompt,
      { maxTokens: state.settings.maxTokensPerTurn, temperature: 0.8 }
    );

    removeTyping();

    if (usage) {
      const u = session.usage[side];
      u.input += usage.input || 0;
      u.output += usage.output || 0;
      u.calls += 1;
      const cost = estimateCost(cfg.provider, cfg.model, usage.input || 0, usage.output || 0);
      if (cost != null) u.cost += cost;
      updateUsageBar();
    }

    session.transcript.push({ side, text: text || '(réponse vide)', error, ts: Date.now() });
    renderMessage(session.transcript[session.transcript.length - 1]);

    session.turn += 1;
    session.nextSide = side === 'A' ? 'B' : 'A';
    turnCounter.textContent = `Tour ${session.turn}${session.unlimited ? ' / ♾️' : ' / ' + session.maxTurns}`;

    session.busy = false;
    setControlsBusy(false);

    if (session.turn >= session.maxTurns) {
      session.finished = true;
      showEndScreen();
      return;
    }

    if (state.settings.autoPlay && !session.paused) {
      setTimeout(() => playTurn(), 1500);
    }
  }

  function updateUsageBar() {
    const bar = root.querySelector('#usageBar');
    if (!bar) return;
    let totalTok = 0, totalCost = 0;
    for (const side of ['A', 'B']) {
      const u = session.usage[side];
      const tok = u.input + u.output;
      totalTok += tok;
      totalCost += u.cost;
      bar.querySelector(`[data-side="${side}"][data-stat="tokens"]`).textContent = `${tok.toLocaleString('fr-FR')} tok`;
      bar.querySelector(`[data-side="${side}"][data-stat="cost"]`).textContent = formatCost(u.cost);
    }
    bar.querySelector('[data-stat="totalTokens"]').textContent = `${totalTok.toLocaleString('fr-FR')} tok`;
    bar.querySelector('[data-stat="totalCost"]').textContent = formatCost(totalCost);
  }

  function setControlsBusy(busy) {
    root.querySelector('#nextBtn').disabled = busy || session.finished;
  }

  function showEndScreen() {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal">
        <h2>🏁 Partie terminée</h2>
        <p class="text-muted mt-2">${session.turn} tours joués entre <span class="ai-tag-red">${escapeHtml(displayName('A'))}</span> et <span class="ai-tag-blue">${escapeHtml(displayName('B'))}</span>.</p>
        <div class="card mt-4" style="background: var(--surface-2); padding: 12px;">
          <div class="card-title">📊 Consommation</div>
          <div class="flex-between" style="font-size: 13px;">
            <span class="ai-tag-red">${escapeHtml(displayName('A'))}</span>
            <span>${(session.usage.A.input + session.usage.A.output).toLocaleString('fr-FR')} tok</span>
            <span>${formatCost(session.usage.A.cost)}</span>
          </div>
          <div class="flex-between" style="font-size: 13px; margin-top: 6px;">
            <span class="ai-tag-blue">${escapeHtml(displayName('B'))}</span>
            <span>${(session.usage.B.input + session.usage.B.output).toLocaleString('fr-FR')} tok</span>
            <span>${formatCost(session.usage.B.cost)}</span>
          </div>
          <div class="flex-between" style="font-size: 14px; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border); font-weight: 700;">
            <span>Total</span>
            <span>${(session.usage.A.input + session.usage.A.output + session.usage.B.input + session.usage.B.output).toLocaleString('fr-FR')} tok</span>
            <span>${formatCost(session.usage.A.cost + session.usage.B.cost)}</span>
          </div>
        </div>
        ${mode.canVote ? `
          <div class="mt-4">
            <p class="mb-2"><strong>Qui a remporté ?</strong></p>
            <div class="flex-gap">
              <button class="btn btn-primary" data-vote="A">🔴 ${escapeHtml(displayName('A'))}</button>
              <button class="btn btn-blue" data-vote="B">🔵 ${escapeHtml(displayName('B'))}</button>
              <button class="btn" data-vote="tie">🤝 Égalité</button>
            </div>
          </div>` : ''}
        <div class="flex-gap mt-4" style="flex-wrap: wrap;">
          <button class="btn" id="exportTxt">📄 Exporter (.txt)</button>
          <button class="btn" id="copyTranscript">📋 Copier</button>
          <button class="btn btn-primary" id="replay">🔁 Rejouer</button>
          <button class="btn" id="changeMode">🎮 Autre mode</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelectorAll('[data-vote]').forEach((b) => {
      b.onclick = () => {
        const v = b.dataset.vote;
        toast(`Vote enregistré : ${v === 'tie' ? 'Égalité' : displayName(v)}`, 'success');
        b.parentElement.querySelectorAll('button').forEach((bb) => bb.disabled = true);
      };
    });
    modal.querySelector('#exportTxt').onclick = exportTranscript;
    modal.querySelector('#copyTranscript').onclick = async () => {
      try {
        await navigator.clipboard.writeText(buildTranscriptText());
        toast('Transcript copié', 'success');
      } catch { toast('Échec de la copie', 'error'); }
    };
    modal.querySelector('#replay').onclick = () => { document.body.removeChild(modal); navigate('lobby', { modeId: game.modeId }); };
    modal.querySelector('#changeMode').onclick = () => { document.body.removeChild(modal); navigate('home'); };
  }

  function buildTranscriptText() {
    const header = `AI ARENA — ${mode.emoji} ${mode.name}\nSujet : ${game.subject || '(libre)'}\n${displayName('A')} (${PROVIDERS[game.A.provider].label}) vs ${displayName('B')} (${PROVIDERS[game.B.provider].label})\n${'='.repeat(40)}\n\n`;
    const body = session.transcript.map((e) => {
      const who = e.side === 'P' ? 'JOUEUR' : (e.side === 'A' ? displayName('A').toUpperCase() : displayName('B').toUpperCase());
      const tag = e.error ? '[ERREUR] ' : '';
      return `--- ${who} ---\n${tag}${e.text}\n`;
    }).join('\n');
    return header + body;
  }

  function exportTranscript() {
    const txt = buildTranscriptText();
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-arena-${mode.id}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Controls
  root.querySelector('#nextBtn').onclick = () => playTurn();

  root.querySelector('#pauseBtn').onclick = (e) => {
    if (state.settings.autoPlay) {
      session.paused = !session.paused;
      e.currentTarget.textContent = session.paused ? '▶ Reprendre' : '⏸ Pause';
      if (!session.paused && !session.busy) playTurn();
    } else {
      // Toggle autoplay on
      state.settings.autoPlay = true;
      session.paused = false;
      e.currentTarget.textContent = '⏸ Pause';
      if (!session.busy) playTurn();
    }
  };

  root.querySelector('#interveneBtn').onclick = () => openInterveneModal();
  root.querySelector('#endBtn').onclick = () => {
    if (confirm('Terminer la partie maintenant ?')) {
      session.finished = true;
      showEndScreen();
    }
  };

  function openInterveneModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal">
        <h2>✍️ Intervenir</h2>
        <p class="subtitle">Ton message sera injecté dans le contexte des deux IA au prochain tour.</p>
        <textarea id="injectText" rows="4" placeholder="Ex: 'Et si on changeait d'angle ?'"></textarea>
        <div class="flex-gap mt-4">
          <button class="btn btn-primary" id="injectSend">Envoyer</button>
          <button class="btn" id="injectCancel">Annuler</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    const ta = modal.querySelector('#injectText');
    ta.focus();
    modal.querySelector('#injectCancel').onclick = () => modal.remove();
    modal.querySelector('#injectSend').onclick = () => {
      const txt = ta.value.trim();
      if (!txt) return;
      session.pendingPlayerInjection = txt;
      session.transcript.push({ side: 'P', text: txt, ts: Date.now() });
      renderMessage(session.transcript[session.transcript.length - 1]);
      modal.remove();
      toast('Message injecté pour le prochain tour', 'info');
    };
  }

  // Auto-start first turn
  if (state.settings.autoPlay) {
    setTimeout(() => playTurn(), 600);
  }
}
