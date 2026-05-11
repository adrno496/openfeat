/**
 * Geopolitik — Doctrines (mode de gouvernance)
 * Modificateurs permanents tant que la doctrine est active.
 * Switch coûte une pénalité de stabilité pendant 12 mois.
 */

export const DOCTRINES = {
  DEMOCRATIE_LIBERALE: {
    id: "DEMOCRATIE_LIBERALE",
    name: "Démocratie Libérale",
    icon: "📜",
    description: "Modèle équilibré. Modificateurs neutres, mais soft power élevé.",
    unlockTier: 0,
    multipliers: { ECONOMY: 1.0, MILITARY: 1.0, TECH: 1.05, DIPLOMACY: 1.15, SOCIETY: 1.05 },
    color: "#3d6dd9"
  },
  AUTOCRATIE: {
    id: "AUTOCRATIE",
    name: "Autocratie",
    icon: "👑",
    description: "Concentration du pouvoir. Boost militaire et tech, malus diplomatique.",
    unlockTier: 1,
    multipliers: { ECONOMY: 1.05, MILITARY: 1.30, TECH: 1.10, DIPLOMACY: 0.75, SOCIETY: 0.90 },
    color: "#c83a3a"
  },
  TECHNOCRATIE: {
    id: "TECHNOCRATIE",
    name: "Technocratie",
    icon: "⚙️",
    description: "Gouvernance par les experts. Boost majeur tech et économie.",
    unlockTier: 2,
    multipliers: { ECONOMY: 1.15, MILITARY: 0.95, TECH: 1.40, DIPLOMACY: 0.95, SOCIETY: 0.90 },
    color: "#8a4fb8"
  },
  MERCANTILISME: {
    id: "MERCANTILISME",
    name: "Mercantilisme",
    icon: "💰",
    description: "Maximisation économique. PIB en flèche mais relations tendues.",
    unlockTier: 2,
    multipliers: { ECONOMY: 1.35, MILITARY: 0.90, TECH: 1.05, DIPLOMACY: 0.85, SOCIETY: 1.00 },
    color: "#d4a843"
  },
  THEOCRATIE: {
    id: "THEOCRATIE",
    name: "Théocratie",
    icon: "☪",
    description: "Cohésion identitaire forte. Stabilité maximale, malus tech et diplo.",
    unlockTier: 3,
    multipliers: { ECONOMY: 0.95, MILITARY: 1.10, TECH: 0.70, DIPLOMACY: 0.80, SOCIETY: 1.30 },
    color: "#0db77b"
  },
  ISOLATIONNISME: {
    id: "ISOLATIONNISME",
    name: "Isolationnisme",
    icon: "🏝",
    description: "Repli stratégique. Immunité à la moitié des événements externes, malus diplo.",
    unlockTier: 3,
    multipliers: { ECONOMY: 1.10, MILITARY: 1.05, TECH: 1.00, DIPLOMACY: 0.50, SOCIETY: 1.15 },
    color: "#8a8b8f",
    immuneToExternal: true
  },
  EMPIRE_HEGEMONIQUE: {
    id: "EMPIRE_HEGEMONIQUE",
    name: "Empire Hégémonique",
    icon: "🌐",
    description: "Domination mondiale assumée. Tous les multiplicateurs au max — coûte cher en stabilité.",
    unlockTier: 5,
    multipliers: { ECONOMY: 1.25, MILITARY: 1.30, TECH: 1.20, DIPLOMACY: 0.70, SOCIETY: 0.85 },
    color: "#e8be58"
  }
};

export function getDoctrine(id) {
  return DOCTRINES[id] || DOCTRINES.DEMOCRATIE_LIBERALE;
}

export function isDoctrineUnlocked(doctrineId, currentTier) {
  const d = DOCTRINES[doctrineId];
  return d && currentTier >= d.unlockTier;
}

/**
 * Switch doctrine : retourne { ok, error }.
 * Pénalité : -20 stability, cooldown de 12 mois.
 */
export function switchDoctrine(nation, newDoctrineId, currentTier) {
  if (!isDoctrineUnlocked(newDoctrineId, currentTier)) {
    return { ok: false, error: "locked" };
  }
  if (nation.doctrine === newDoctrineId) {
    return { ok: false, error: "same_doctrine" };
  }
  if (nation.doctrineSwitchCooldown > 0) {
    return { ok: false, error: "cooldown", remaining: nation.doctrineSwitchCooldown };
  }
  nation.doctrine = newDoctrineId;
  nation.stability = Math.max(20, nation.stability - 20);
  nation.doctrineSwitchCooldown = 12;
  return { ok: true };
}
