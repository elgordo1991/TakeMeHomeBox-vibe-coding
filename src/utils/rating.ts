// Box quality rating scale (1–5).
export const RATING_SCALE = [
  { value: 1, emoji: '🗑️', label: 'Junk' },
  { value: 2, emoji: '💩', label: 'Poor' },
  { value: 3, emoji: '📦', label: 'Okay' },
  { value: 4, emoji: '✨', label: 'Great' },
  { value: 5, emoji: '💎', label: 'Treasure' },
] as const;

export const ratingStep = (avg: number) => {
  const rounded = Math.min(5, Math.max(1, Math.round(avg)));
  return RATING_SCALE[rounded - 1];
};

type Rated = { rating?: number; ratings?: { userId: string; rating: number }[] };

export const ratingCount = (listing: Rated) => listing.ratings?.length ?? 0;

// Short summary for cards, e.g. "✨ 4.2" or "New".
export const ratingSummary = (listing: Rated) => {
  const count = ratingCount(listing);
  if (!count || !listing.rating) return { emoji: '🆕', text: 'New', count: 0 };
  const step = ratingStep(listing.rating);
  return { emoji: step.emoji, text: listing.rating.toFixed(1), count, label: step.label };
};

export const myRating = (listing: Rated, userId?: string) =>
  userId ? listing.ratings?.find((r) => r.userId === userId)?.rating ?? null : null;
