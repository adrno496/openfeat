/**
 * Geopolitik — Progression
 * Tiers basés sur l'influence mondiale (composite weighted).
 */

export const TIERS = [
  { tier: 0, name: "Petit pays",         minInfluence: 0,     title: "Chef de petit pays" },
  { tier: 1, name: "Régional",           minInfluence: 100,   title: "Acteur régional" },
  { tier: 2, name: "Puissance moyenne",  minInfluence: 250,   title: "Puissance moyenne" },
  { tier: 3, name: "Grande puissance",   minInfluence: 500,   title: "Grande puissance" },
  { tier: 4, name: "Puissance majeure",  minInfluence: 900,   title: "Puissance majeure" },
  { tier: 5, name: "Superpuissance",     minInfluence: 1500,  title: "Superpuissance" },
  { tier: 6, name: "Hégémon",            minInfluence: 2500,  title: "Hégémon mondial" },
  { tier: 7, name: "Dominateur",         minInfluence: 4000,  title: "Dominateur du siècle" }
];

export function getTier(influence) {
  let current = TIERS[0];
  for (const t of TIERS) {
    if (influence >= t.minInfluence) current = t;
  }
  return current;
}

export function getNextTier(influence) {
  for (const t of TIERS) {
    if (influence < t.minInfluence) return t;
  }
  return null;
}

export const ACHIEVEMENTS = [
  { id: "first_century",   name: "Première centaine",       description: "Atteindre 100 d'influence",                           reward: { treasury: 30 },  check: (s) => s.maxInfluence >= 100 },
  { id: "regional_power",  name: "Acteur régional",         description: "Devenir une puissance régionale (250)",               reward: { treasury: 80 },  check: (s) => s.maxInfluence >= 250 },
  { id: "great_power",     name: "Grande puissance",        description: "Devenir une grande puissance (500)",                  reward: { treasury: 200 }, check: (s) => s.maxInfluence >= 500 },
  { id: "super_power",     name: "Superpuissance",          description: "Atteindre le statut de superpuissance (1500)",        reward: { treasury: 800 }, check: (s) => s.maxInfluence >= 1500 },
  { id: "hegemon",         name: "Hégémon",                 description: "Dominer le monde (2500 d'influence)",                  reward: { treasury: 2000 }, check: (s) => s.maxInfluence >= 2500 },
  { id: "tech_lead",       name: "Tech Lead",               description: "Atteindre 200 en Tech",                                 reward: { treasury: 150 }, check: (s) => s.maxTech >= 200 },
  { id: "war_machine",     name: "Machine de guerre",       description: "Atteindre 300 en Militaire",                            reward: { treasury: 200 }, check: (s) => s.maxMilitary >= 300 },
  { id: "diplomatic_genius", name: "Génie diplomatique",    description: "Avoir 3 alliés majeurs simultanément",                  reward: { treasury: 300 }, check: (s) => s.maxAllies >= 3 },
  { id: "trade_empire",    name: "Empire commercial",       description: "Atteindre 500 en Économie",                             reward: { treasury: 400 }, check: (s) => s.maxEconomy >= 500 },
  { id: "stable_society",  name: "Modèle de stabilité",     description: "Maintenir 90+ de stabilité pendant 60 mois",            reward: { treasury: 250 }, check: (s) => s.stableMonths >= 60 },
  { id: "crisis_survivor", name: "Survivant",               description: "Survivre à 3 crises majeures",                          reward: { treasury: 500 }, check: (s) => s.crisesSurvived >= 3 },
  { id: "first_doctrine",  name: "Évolution doctrinale",    description: "Changer de doctrine pour la première fois",             reward: { treasury: 100 }, check: (s) => s.doctrineChanges >= 1 },
  { id: "pacifist",        name: "Pacifiste hégémonique",   description: "Atteindre 1000 d'influence avec Militaire < 100",       reward: { treasury: 800 }, check: (s) => s.maxInfluence >= 1000 && s.minMilitaryAtPeak < 100 },
  { id: "isolationist_win", name: "Splendide isolement",   description: "Atteindre 800 d'influence sous Isolationnisme",         reward: { treasury: 600 }, check: (s) => s.maxIsolationistInfluence >= 800 },
  { id: "peace_century",   name: "Siècle de paix",          description: "Tenir 100 mois sans qu'un événement négatif touche votre pays", reward: { treasury: 400 }, check: (s) => s.peacefulMonths >= 100 }
];

export class ProgressionTracker {
  constructor() {
    this.maxInfluence = 0;
    this.maxEconomy = 100;
    this.maxMilitary = 50;
    this.maxTech = 30;
    this.maxAllies = 0;
    this.stableMonths = 0;
    this.peacefulMonths = 0;
    this.crisesSurvived = 0;
    this.doctrineChanges = 0;
    this.minMilitaryAtPeak = 999; // tracked when reaching influence >= 1000
    this.maxIsolationistInfluence = 0;
    this.achievementsUnlocked = new Set();

    this._lastEventCount = 0;
    this._stableStreak = 0;
    this._peaceStreak = 0;
  }

  update(nation, world, eventEngine) {
    const inf = nation.influenceScore();
    if (inf > this.maxInfluence) this.maxInfluence = inf;
    if (nation.economy > this.maxEconomy) this.maxEconomy = nation.economy;
    if (nation.military > this.maxMilitary) this.maxMilitary = nation.military;
    if (nation.tech > this.maxTech) this.maxTech = nation.tech;

    const allies = world.getAllies().length;
    if (allies > this.maxAllies) this.maxAllies = allies;

    // Stability streak
    if (nation.stability >= 90) {
      this._stableStreak += 1;
      if (this._stableStreak > this.stableMonths) this.stableMonths = this._stableStreak;
    } else {
      this._stableStreak = 0;
    }

    // Peaceful streak (no negative events)
    const negativeActive = eventEngine.activeEvents.filter(e => e.severity === "bad").length;
    if (negativeActive === 0) {
      this._peaceStreak += 1;
      if (this._peaceStreak > this.peacefulMonths) this.peacefulMonths = this._peaceStreak;
    } else {
      this._peaceStreak = 0;
    }

    // Pacifist tracker (when influence >= 1000)
    if (inf >= 1000 && nation.military < this.minMilitaryAtPeak) {
      this.minMilitaryAtPeak = nation.military;
    }

    // Isolationist
    if (nation.doctrine === "ISOLATIONNISME" && inf > this.maxIsolationistInfluence) {
      this.maxIsolationistInfluence = inf;
    }
  }

  recordCrisisSurvived() { this.crisesSurvived += 1; }
  recordDoctrineChange() { this.doctrineChanges += 1; }

  checkAchievements() {
    const newly = [];
    for (const ach of ACHIEVEMENTS) {
      if (this.achievementsUnlocked.has(ach.id)) continue;
      if (ach.check(this)) {
        this.achievementsUnlocked.add(ach.id);
        newly.push(ach);
      }
    }
    return newly;
  }

  serialize() {
    return {
      maxInfluence: this.maxInfluence,
      maxEconomy: this.maxEconomy,
      maxMilitary: this.maxMilitary,
      maxTech: this.maxTech,
      maxAllies: this.maxAllies,
      stableMonths: this.stableMonths,
      peacefulMonths: this.peacefulMonths,
      crisesSurvived: this.crisesSurvived,
      doctrineChanges: this.doctrineChanges,
      minMilitaryAtPeak: this.minMilitaryAtPeak,
      maxIsolationistInfluence: this.maxIsolationistInfluence,
      achievementsUnlocked: [...this.achievementsUnlocked],
      _stableStreak: this._stableStreak,
      _peaceStreak: this._peaceStreak
    };
  }

  static deserialize(data) {
    const p = new ProgressionTracker();
    if (!data) return p;
    Object.assign(p, data);
    p.achievementsUnlocked = new Set(data.achievementsUnlocked || []);
    return p;
  }
}
