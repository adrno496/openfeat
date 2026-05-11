/**
 * Geopolitik — Événements mondiaux
 * Probabilité par tick (1 tick = 1 mois). Modifient les secteurs temporairement.
 */

export const EVENTS = [
  // POSITIFS
  {
    id: "boom_global",
    name: "Boom économique mondial",
    headline: "📈 BOOM MONDIAL — la croissance accélère partout",
    description: "Une décennie de croissance synchronisée commence. Tous les pays profitent.",
    duration: 24,
    probability: 0.008,
    severity: "good",
    modifiers: { ECONOMY: 1.25 }
  },
  {
    id: "tech_breakthrough",
    name: "Percée IA / Révolution industrielle",
    headline: "🤖 PERCÉE IA — la productivité bondit",
    description: "Une révolution technologique s'amorce. Ceux qui investissent en tech rafleront tout.",
    duration: 36,
    probability: 0.005,
    severity: "good",
    modifiers: { TECH: 1.40, ECONOMY: 1.10 }
  },
  {
    id: "diplomatic_summit",
    name: "Sommet diplomatique mondial",
    headline: "🤝 SOMMET MONDIAL — fenêtre diplomatique",
    description: "Les grandes puissances se rencontrent. Opportunité pour bâtir des alliances.",
    duration: 12,
    probability: 0.012,
    severity: "good",
    modifiers: { DIPLOMACY: 1.30 }
  },
  {
    id: "demographic_dividend",
    name: "Dividende démographique",
    headline: "👥 DIVIDENDE DÉMOGRAPHIQUE — population active en hausse",
    description: "Une génération nombreuse entre sur le marché du travail. Boost durable.",
    duration: 48,
    probability: 0.004,
    severity: "good",
    modifiers: { ECONOMY: 1.15, SOCIETY: 1.20 }
  },
  {
    id: "trade_route",
    name: "Nouvelle route commerciale",
    headline: "🚢 NOUVELLE ROUTE — les flux commerciaux explosent",
    description: "Une route maritime majeure s'ouvre. Profitez si votre économie est solide.",
    duration: 30,
    probability: 0.007,
    severity: "good",
    modifiers: { ECONOMY: 1.20 }
  },

  // NEUTRES / MIXTES
  {
    id: "election_cycle",
    name: "Cycle électoral USA",
    headline: "🗳 ÉLECTIONS USA — pivot de politique étrangère",
    description: "Washington pivote. Les relations avec les superpuissances se redessinent.",
    duration: 18,
    probability: 0.010,
    severity: "neutral",
    modifiers: { DIPLOMACY: 0.85 }
  },
  {
    id: "regional_conflict",
    name: "Conflit régional",
    headline: "⚔️ CONFLIT RÉGIONAL — tensions militaires",
    description: "Une guerre limitée éclate. Investissez en militaire ou subissez la pression.",
    duration: 20,
    probability: 0.011,
    severity: "neutral",
    modifiers: { MILITARY: 1.15, ECONOMY: 0.90, DIPLOMACY: 0.85 }
  },
  {
    id: "migration_crisis",
    name: "Crise migratoire",
    headline: "🚶 CRISE MIGRATOIRE — pressions intérieures",
    description: "Flux migratoires majeurs. La cohésion sociale est testée.",
    duration: 24,
    probability: 0.008,
    severity: "neutral",
    modifiers: { SOCIETY: 0.85, DIPLOMACY: 0.95 }
  },

  // NÉGATIFS
  {
    id: "financial_crisis",
    name: "Crise financière mondiale",
    headline: "📉 CRISE FINANCIÈRE — récession mondiale",
    description: "L'économie mondiale s'effondre. Survivre est la priorité.",
    duration: 24,
    probability: 0.006,
    severity: "bad",
    modifiers: { ECONOMY: 0.70, SOCIETY: 0.90 }
  },
  {
    id: "pandemic",
    name: "Pandémie mondiale",
    headline: "🦠 PANDÉMIE — l'économie à l'arrêt",
    description: "Une pandémie paralyse le monde. Les pays les plus stables s'en sortent mieux.",
    duration: 18,
    probability: 0.003,
    severity: "bad",
    modifiers: { ECONOMY: 0.65, SOCIETY: 0.80, MILITARY: 0.90 }
  },
  {
    id: "cyber_attack",
    name: "Cyberattaque massive",
    headline: "💻 CYBERATTAQUE MONDIALE — infrastructures touchées",
    description: "Les pays moins avancés en tech subissent le plus.",
    duration: 12,
    probability: 0.009,
    severity: "bad",
    modifiers: { TECH: 0.85, ECONOMY: 0.92 }
  },
  {
    id: "energy_shock",
    name: "Choc énergétique",
    headline: "⚡ CHOC ÉNERGÉTIQUE — flambée des coûts",
    description: "Les prix de l'énergie explosent. L'industrie souffre.",
    duration: 18,
    probability: 0.008,
    severity: "bad",
    modifiers: { ECONOMY: 0.80, SOCIETY: 0.92 }
  },
  {
    id: "climate_disaster",
    name: "Catastrophe climatique",
    headline: "🌪 CATASTROPHE CLIMATIQUE — pertes massives",
    description: "Événement climatique extrême. Les économies fragiles vacillent.",
    duration: 15,
    probability: 0.005,
    severity: "bad",
    modifiers: { ECONOMY: 0.85, SOCIETY: 0.85 }
  },
  {
    id: "great_power_war",
    name: "Tensions superpuissances",
    headline: "🚨 TENSIONS USA-CHINE — guerre froide 2.0",
    description: "Les superpuissances se cherchent. Les neutres sont écartelés.",
    duration: 36,
    probability: 0.003,
    severity: "bad",
    modifiers: { DIPLOMACY: 0.75, MILITARY: 1.10, ECONOMY: 0.92 }
  },
  {
    id: "civil_unrest",
    name: "Instabilité interne",
    headline: "🔥 TROUBLES INTÉRIEURS — gouvernance contestée",
    description: "Manifestations massives. La stabilité est en jeu.",
    duration: 12,
    probability: 0.007,
    severity: "bad",
    modifiers: { SOCIETY: 0.75, ECONOMY: 0.92 },
    onlyIfStability: 50 // ne déclenche que si stability < 50
  }
];

export class EventEngine {
  constructor() {
    this.cooldown = 0;
    this.activeEvents = []; // [{ id, ticksLeft, headline, severity, modifiers }]
    this.recent = []; // pour anti-répétition
  }

  /**
   * Tick — décide si un nouvel event déclenche.
   */
  tick(nation, world, rng, doctrineDef) {
    // Decay active events
    this.activeEvents = this.activeEvents
      .map(e => ({ ...e, ticksLeft: e.ticksLeft - 1 }))
      .filter(e => e.ticksLeft > 0);

    if (this.cooldown > 0) {
      this.cooldown -= 1;
      return null;
    }

    // Tension mondiale = booster de probabilité d'events négatifs
    const tensionFactor = world.tension / 50; // 1.0 à tension=50

    for (const event of EVENTS) {
      // Anti-répétition (200 ticks min)
      if (this.recent.find(r => r.id === event.id && nation.history.length - r.tick < 200)) continue;

      // Conditions spéciales
      if (event.onlyIfStability !== undefined && nation.stability >= event.onlyIfStability) continue;

      let prob = event.probability;
      if (event.severity === "bad") prob *= tensionFactor;

      if (rng() < prob) {
        // Isolationnisme : 50% de chance d'ignorer les events négatifs
        if (doctrineDef?.immuneToExternal && event.severity === "bad" && rng() < 0.5) {
          this.cooldown = 6;
          return null;
        }

        // Apply modifiers as nation modifiers
        for (const [sector, mult] of Object.entries(event.modifiers || {})) {
          nation.applyEventModifier({
            source: event.id,
            sector,
            mult,
            duration: event.duration
          });
        }

        // Tension impact
        if (event.severity === "bad") world.tension = Math.min(100, world.tension + 8);
        if (event.severity === "good") world.tension = Math.max(0, world.tension - 4);

        const active = {
          id: event.id,
          name: event.name,
          headline: event.headline,
          description: event.description,
          severity: event.severity,
          ticksLeft: event.duration,
          duration: event.duration
        };
        this.activeEvents.push(active);
        this.recent.push({ id: event.id, tick: nation.history.length });
        if (this.recent.length > 12) this.recent.shift();
        this.cooldown = 8;
        return event;
      }
    }
    return null;
  }

  serialize() {
    return {
      cooldown: this.cooldown,
      activeEvents: [...this.activeEvents],
      recent: [...this.recent]
    };
  }

  static deserialize(data) {
    const e = new EventEngine();
    if (!data) return e;
    e.cooldown = data.cooldown || 0;
    e.activeEvents = [...(data.activeEvents || [])];
    e.recent = [...(data.recent || [])];
    return e;
  }
}
