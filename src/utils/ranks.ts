// Ranks earned through activity (boxes given + boxes found).
export const RANKS = [
  { min: 50, emoji: '💎', title: 'Treasure Hunter', level: 5 },
  { min: 25, emoji: '🪙', title: 'Giver', level: 4 },
  { min: 15, emoji: '🎒', title: 'Scavenger', level: 3 },
  { min: 5, emoji: '🧹', title: 'Forager', level: 2 },
  { min: 0, emoji: '🆕', title: 'Noob', level: 1 },
] as const;

export type Rank = (typeof RANKS)[number];

export const getRank = (itemsGiven = 0, itemsTaken = 0): Rank => {
  const total = (itemsGiven || 0) + (itemsTaken || 0);
  return RANKS.find((r) => total >= r.min) ?? RANKS[RANKS.length - 1];
};
