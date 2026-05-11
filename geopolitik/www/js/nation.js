/**
 * Geopolitik — État de la nation du joueur
 * 5 piliers : Economy / Military / Tech / Diplomacy / Society
 * Allocation budgétaire à somme constante (1.0 total)
 */

export const SECTORS = {
  ECONOMY:   { id: "ECONOMY",   name: "Économie",     icon: "💰", color: "#d4a843", description: "Génère du Trésor. Booste l'influence à long terme." },
  MILITARY:  { id: "MILITARY",  name: "Militaire",    icon: "🪖", color: "#c83a3a", description: "Projection de force. Indispensable contre les conflits." },
  TECH:      { id: "TECH",      name: "Technologie",  icon: "🔬", color: "#8a4fb8", description: "Edge à long terme. Multiplie tous les autres secteurs." },
  DIPLOMACY: { id: "DIPLOMACY", name: "Diplomatie",   icon: "🤝", color: "#3d6dd9", description: "Soft power. Améliore les relations et débloque des alliances." },
  SOCIETY:   { id: "SOCIETY",   name: "Société",      icon: "🏛", color: "#0db77b", description: "Stabilité interne. Évite les révoltes et booste la démographie." }
};

const DEFAULT_ALLOCATION = {
  ECONOMY: 0.30,
  MILITARY: 0.20,
  TECH: 0.20,
  DIPLOMACY: 0.15,
  SOCIETY: 0.15
};

// Country name generator
const COUNTRY_PREFIXES = ["République de", "République populaire de", "Royaume de", "Fédération de", "Union de", "Émirat de", "Confédération de"];
const COUNTRY_NAMES = ["Sylvania", "Talandor", "Veridia", "Norhaven", "Eskarion", "Mardova", "Zantarica", "Auronia", "Tergesta", "Calenor", "Vasalka", "Brentia", "Drunia", "Khalivar", "Solantis"];

export function generateCountryName(rng = Math.random) {
  const prefix = COUNTRY_PREFIXES[Math.floor(rng() * COUNTRY_PREFIXES.length)];
  const name = COUNTRY_NAMES[Math.floor(rng() * COUNTRY_NAMES.length)];
  return `${prefix} ${name}`;
}

export class Nation {
  constructor(name) {
    this.name = name || generateCountryName();
    this.year = 2026;
    this.month = 1;

    // 5 piliers — valeurs absolues
    this.economy = 100;
    this.military = 50;
    this.tech = 30;
    this.diplomacy = 40;
    this.society = 60;

    // Trésor (budget cumulé)
    this.treasury = 50;

    // Doctrine actuelle
    this.doctrine = "DEMOCRATIE_LIBERALE";
    this.doctrineSwitchCooldown = 0;

    // Allocation budgétaire
    this.allocation = { ...DEFAULT_ALLOCATION };

    // Stabilité interne (peut chuter avec mauvaise gestion)
    this.stability = 80;

    // Active modifiers from events (decayés au tick)
    this.modifiers = []; // [{ source, sector, mult, ticksLeft }]

    // Historique pour le chart
    this.history = [{ tick: 0, influence: this.influenceScore() }];
  }

  /**
   * Calcule l'influence mondiale (composite weighted).
   */
  influenceScore() {
    return Math.round(
      0.30 * this.economy +
      0.22 * this.military +
      0.20 * this.tech +
      0.15 * this.diplomacy +
      0.13 * this.society
    );
  }

  /**
   * Avance d'un mois : applique allocation, modifiers, événements.
   * Retourne les changements pour notification UI.
   */
  tick(rng, doctrineDef) {
    this.month += 1;
    if (this.month > 12) {
      this.month = 1;
      this.year += 1;
    }

    if (this.doctrineSwitchCooldown > 0) this.doctrineSwitchCooldown -= 1;

    // Trésor : tax revenue ~5% du GDP, +bonus économie
    const taxRate = 0.05 * (1 + (this.economy - 100) / 500);
    const grossRevenue = this.economy * taxRate;
    this.treasury += grossRevenue;

    // Total budget allocable ce mois
    const monthlyBudget = Math.max(2, this.treasury * 0.10);
    this.treasury -= monthlyBudget;

    // Apply allocation × budget × growth multipliers (avec doctrine)
    const sectors = ["ECONOMY", "MILITARY", "TECH", "DIPLOMACY", "SOCIETY"];
    const mults = doctrineDef ? doctrineDef.multipliers : {};
    const changes = {};
    for (const sec of sectors) {
      const allocPct = this.allocation[sec] || 0;
      const spend = monthlyBudget * allocPct;
      const baseGrowth = spend * 0.6; // 60% efficiency

      const mult = mults[sec] ?? 1.0;
      const modMult = this.getActiveModMultiplier(sec);
      const growth = baseGrowth * mult * modMult;

      // Random drift (geopolitical noise)
      const noise = (rng() - 0.5) * 2;

      const before = this[sec.toLowerCase()];
      const decay = before * 0.005; // léger decay 0.5% mensuel (entropy)
      const newVal = Math.max(5, before + growth + noise - decay);
      this[sec.toLowerCase()] = newVal;
      changes[sec] = newVal - before;
    }

    // Stability dynamics : si on néglige Society, ça baisse
    const societyHealth = this.society / Math.max(50, (this.economy + this.military) / 2);
    const stabilityDelta = (societyHealth - 0.5) * 0.5 + (rng() - 0.5) * 0.8;
    this.stability = Math.max(0, Math.min(100, this.stability + stabilityDelta));

    // Decay modifiers
    this.modifiers = this.modifiers
      .map(m => ({ ...m, ticksLeft: m.ticksLeft - 1 }))
      .filter(m => m.ticksLeft > 0);

    // Save history
    const inf = this.influenceScore();
    this.history.push({ tick: this.history.length, influence: inf, year: this.year, month: this.month });
    if (this.history.length > 250) this.history.shift();

    return { changes, influence: inf };
  }

  getActiveModMultiplier(sector) {
    let m = 1.0;
    for (const mod of this.modifiers) {
      if (mod.sector === sector || mod.sector === "ALL") {
        m *= mod.mult;
      }
    }
    return m;
  }

  /**
   * Réalloue le budget — la somme doit faire 1.0
   */
  setAllocation(sector, value) {
    const others = Object.keys(this.allocation).filter(k => k !== sector);
    const remaining = 1 - value;
    const totalOthers = others.reduce((s, k) => s + this.allocation[k], 0);
    if (totalOthers > 0) {
      for (const o of others) {
        this.allocation[o] = (this.allocation[o] / totalOthers) * remaining;
      }
    } else {
      const each = remaining / others.length;
      for (const o of others) this.allocation[o] = each;
    }
    this.allocation[sector] = value;
  }

  /**
   * Applique un événement → modifiers temporaires
   */
  applyEventModifier({ source, sector, mult, duration }) {
    this.modifiers.push({ source, sector, mult, ticksLeft: duration });
  }

  serialize() {
    return {
      name: this.name,
      year: this.year,
      month: this.month,
      economy: this.economy,
      military: this.military,
      tech: this.tech,
      diplomacy: this.diplomacy,
      society: this.society,
      treasury: this.treasury,
      doctrine: this.doctrine,
      doctrineSwitchCooldown: this.doctrineSwitchCooldown,
      allocation: { ...this.allocation },
      stability: this.stability,
      modifiers: [...this.modifiers],
      history: this.history.slice(-100)
    };
  }

  static deserialize(data) {
    if (!data) return new Nation();
    const n = new Nation(data.name);
    Object.assign(n, data);
    n.allocation = { ...data.allocation };
    n.modifiers = [...(data.modifiers || [])];
    n.history = [...(data.history || [{ tick: 0, influence: 100 }])];
    return n;
  }
}
