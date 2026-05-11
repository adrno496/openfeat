/**
 * Crypto Trader Tycoon — Random market events
 * Trigger basé sur probabilité par tick, durée variable, modifie le marché.
 */

export const EVENTS = [
  {
    id: "halving",
    name: "Halving Bitcoin",
    description: "L'émission de BTC est réduite de moitié. Boost haussier sur Bitcoin.",
    headline: "📰 BTC HALVING — l'émission divisée par 2",
    duration: 60,
    probability: 0.005,
    severity: "good",
    modifiers: { BTC: { drift: 0.0008, volMult: 1.2 } }
  },
  {
    id: "etf_approval",
    name: "Approbation ETF",
    description: "La SEC approuve un ETF crypto. Argent institutionnel afflue.",
    headline: "📰 ETF APPROUVÉ — capitaux institutionnels en route",
    duration: 80,
    probability: 0.004,
    severity: "good",
    modifiers: { ALL: { drift: 0.0006, volMult: 1.1 } }
  },
  {
    id: "fomo_retail",
    name: "FOMO Retail",
    description: "Les particuliers entrent en masse. Pump généralisé suivi de volatilité.",
    headline: "📰 FOMO retail détectée — pump en cours",
    duration: 50,
    probability: 0.008,
    severity: "good",
    modifiers: { DOGE: { drift: 0.0015, volMult: 1.5 }, PEPE: { drift: 0.002, volMult: 1.7 }, ALL: { drift: 0.0003, volMult: 1.0 } }
  },
  {
    id: "elon_tweet",
    name: "Tweet d'Elon",
    description: "Un tweet absurde fait pumper les memecoins.",
    headline: "📰 Tweet inattendu — DOGE en orbite",
    duration: 25,
    probability: 0.012,
    severity: "good",
    modifiers: { DOGE: { drift: 0.005, volMult: 2.0 }, PEPE: { drift: 0.004, volMult: 2.0 } }
  },
  {
    id: "cpi_beat",
    name: "Inflation modérée",
    description: "CPI plus faible qu'attendu. Risk-on général.",
    headline: "📰 CPI < attentes — risk-on",
    duration: 40,
    probability: 0.010,
    severity: "good",
    modifiers: { ALL: { drift: 0.0005, volMult: 0.9 } }
  },
  {
    id: "fed_dovish",
    name: "Fed dovish",
    description: "Powell évoque une pause des hausses. Liquidité en hausse.",
    headline: "📰 Fed dovish — la liquidité revient",
    duration: 70,
    probability: 0.008,
    severity: "good",
    modifiers: { ALL: { drift: 0.0004, volMult: 1.0 } }
  },
  {
    id: "exchange_hack",
    name: "Hack d'exchange",
    description: "Un exchange majeur est piraté. Panique sur le marché.",
    headline: "🚨 Hack majeur — panique en cours",
    duration: 35,
    probability: 0.006,
    severity: "bad",
    modifiers: { ALL: { drift: -0.001, volMult: 1.6 } }
  },
  {
    id: "regulatory_crackdown",
    name: "Régulation US",
    description: "La SEC publie un rapport agressif. Sell-off institutionnel.",
    headline: "🚨 SEC enforcement — institutions vendeuses",
    duration: 60,
    probability: 0.005,
    severity: "bad",
    modifiers: { ALL: { drift: -0.0008, volMult: 1.4 } }
  },
  {
    id: "stablecoin_depeg",
    name: "Stablecoin depeg",
    description: "Un stablecoin majeur perd son peg. Liquidations en cascade.",
    headline: "🚨 USDT à 0.94$ — liquidations en cascade",
    duration: 30,
    probability: 0.003,
    severity: "bad",
    modifiers: { ALL: { drift: -0.0015, volMult: 2.0 } }
  },
  {
    id: "ftx_moment",
    name: "Effondrement d'exchange",
    description: "Un exchange top-10 fait faillite. Krach généralisé.",
    headline: "🚨 EXCHANGE EN FAILLITE — black swan",
    duration: 45,
    probability: 0.002,
    severity: "catastrophic",
    modifiers: { ALL: { drift: -0.002, volMult: 2.5 } }
  },
  {
    id: "geopolitical_shock",
    name: "Choc géopolitique",
    description: "Tensions géopolitiques majeures. Bitcoin en valeur refuge ?",
    headline: "🌍 Tensions géopolitiques — flight to safety",
    duration: 50,
    probability: 0.005,
    severity: "mixed",
    modifiers: { BTC: { drift: 0.0006, volMult: 1.3 }, ALL: { drift: -0.0003, volMult: 1.4 } }
  },
  {
    id: "vc_funding_round",
    name: "Méga-levée VC",
    description: "Une levée de fonds majeure dans la crypto. Confiance restaurée.",
    headline: "📰 Levée VC record — capital de confiance",
    duration: 50,
    probability: 0.007,
    severity: "good",
    modifiers: { ETH: { drift: 0.0007, volMult: 1.0 }, SOL: { drift: 0.0008, volMult: 1.1 } }
  }
];

export class EventEngine {
  constructor() {
    this.cooldown = 0;
    this.recentEvents = []; // dernières apparitions (anti-répétition)
  }

  /**
   * Tick — décide si un événement déclenche, applique au marché.
   */
  tick(market, rng) {
    // Cooldown global pour éviter trop d'événements consécutifs
    if (this.cooldown > 0) {
      this.cooldown -= 1;
      return null;
    }
    if (market.activeEvent) return null;

    for (const event of EVENTS) {
      // Anti-répétition : ne pas redéclencher le même event dans les 200 derniers ticks
      if (this.recentEvents.find(e => e.id === event.id && market.tick - e.tick < 200)) continue;

      const r = rng();
      if (r < event.probability) {
        market.setEvent(event);
        this.recentEvents.push({ id: event.id, tick: market.tick });
        if (this.recentEvents.length > 10) this.recentEvents.shift();
        this.cooldown = 30;
        return event;
      }
    }
    return null;
  }

  serialize() {
    return { cooldown: this.cooldown, recentEvents: [...this.recentEvents] };
  }

  static deserialize(data) {
    const e = new EventEngine();
    if (data) {
      e.cooldown = data.cooldown || 0;
      e.recentEvents = [...(data.recentEvents || [])];
    }
    return e;
  }
}
