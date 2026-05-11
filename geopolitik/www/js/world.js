/**
 * Geopolitik — Le monde extérieur
 * 6 grandes puissances rivales/alliées, indice de tension mondiale.
 */

export const POWERS = {
  USA:    { id: "USA",    name: "États-Unis",    flag: "🇺🇸", baseInfluence: 800, archetype: "democratie" },
  CHINA:  { id: "CHINA",  name: "Chine",         flag: "🇨🇳", baseInfluence: 750, archetype: "autocratie" },
  EU:     { id: "EU",     name: "Union Eur.",    flag: "🇪🇺", baseInfluence: 600, archetype: "democratie" },
  RUSSIA: { id: "RUSSIA", name: "Russie",        flag: "🇷🇺", baseInfluence: 400, archetype: "autocratie" },
  INDIA:  { id: "INDIA",  name: "Inde",          flag: "🇮🇳", baseInfluence: 450, archetype: "democratie" },
  GULF:   { id: "GULF",   name: "Golfe",         flag: "🌅", baseInfluence: 300, archetype: "theocratie" }
};

export class World {
  constructor() {
    // Tension mondiale (0 = paix totale, 100 = pré-WW3)
    this.tension = 30;
    // Relations bilatérales avec le joueur (-100 = ennemi, +100 = allié)
    this.relations = {};
    for (const id of Object.keys(POWERS)) {
      this.relations[id] = 0;
    }
    // Influence cumulée (varie au fil du temps — concurrent du joueur)
    this.powerInfluence = {};
    for (const [id, p] of Object.entries(POWERS)) {
      this.powerInfluence[id] = p.baseInfluence;
    }
  }

  /**
   * Tick : les autres puissances bougent aussi
   */
  tick(rng, nationDoctrine) {
    // Tension : drift léger
    const drift = (rng() - 0.5) * 1.2;
    this.tension = Math.max(0, Math.min(100, this.tension + drift));

    // Relations : évoluent selon doctrine
    for (const id of Object.keys(POWERS)) {
      const arch = POWERS[id].archetype;
      let relDelta = 0;

      // Affinité idéologique
      if (nationDoctrine === "DEMOCRATIE_LIBERALE" && arch === "democratie") relDelta += 0.3;
      if (nationDoctrine === "AUTOCRATIE" && arch === "autocratie") relDelta += 0.4;
      if (nationDoctrine === "AUTOCRATIE" && arch === "democratie") relDelta -= 0.5;
      if (nationDoctrine === "DEMOCRATIE_LIBERALE" && arch === "autocratie") relDelta -= 0.3;
      if (nationDoctrine === "ISOLATIONNISME") relDelta -= 0.2;
      if (nationDoctrine === "THEOCRATIE" && arch === "theocratie") relDelta += 0.5;

      // Random
      relDelta += (rng() - 0.5) * 0.5;

      this.relations[id] = Math.max(-100, Math.min(100, this.relations[id] + relDelta));

      // Power influence drift
      const powerDrift = (rng() - 0.48) * 3; // slight positive drift
      this.powerInfluence[id] = Math.max(100, this.powerInfluence[id] + powerDrift);
    }
  }

  /**
   * Diplomatie : action active du joueur — coûte du diplomacy stat.
   * Retourne { ok, newRelation }
   */
  diplomaticAction(powerId, nation, type) {
    const cost = type === "summit" ? 15 : type === "alliance" ? 30 : 5;
    if (nation.diplomacy < cost) return { ok: false, error: "low_diplomacy" };

    nation.diplomacy -= cost;
    let delta = 0;
    if (type === "summit")    delta = 8 + Math.random() * 4;
    if (type === "alliance")  delta = 15 + Math.random() * 10;
    if (type === "rebuke")    delta = -12 - Math.random() * 6;

    this.relations[powerId] = Math.max(-100, Math.min(100, this.relations[powerId] + delta));
    return { ok: true, newRelation: this.relations[powerId], delta };
  }

  /**
   * Compte les alliés (rel >= +50) et rivaux (rel <= -50)
   */
  getAllies() {
    return Object.keys(POWERS).filter(id => this.relations[id] >= 50);
  }

  getRivals() {
    return Object.keys(POWERS).filter(id => this.relations[id] <= -50);
  }

  /**
   * Top puissance mondiale (pour comparer au joueur)
   */
  getTopPowerInfluence() {
    return Math.max(...Object.values(this.powerInfluence));
  }

  serialize() {
    return {
      tension: this.tension,
      relations: { ...this.relations },
      powerInfluence: { ...this.powerInfluence }
    };
  }

  static deserialize(data) {
    const w = new World();
    if (!data) return w;
    w.tension = data.tension ?? 30;
    w.relations = { ...(data.relations || w.relations) };
    w.powerInfluence = { ...(data.powerInfluence || w.powerInfluence) };
    return w;
  }
}
