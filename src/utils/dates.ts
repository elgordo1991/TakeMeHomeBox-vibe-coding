// Turn any date-like value we might get for a listing into a JS Date.
// Firestore gives Timestamps, but cached listings (saved as JSON) come back as
// plain { seconds, nanoseconds } objects, and pending server writes are null.
export const toJsDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'object') {
    const v = value as { toDate?: () => Date; seconds?: number; _seconds?: number };
    if (typeof v.toDate === 'function') return v.toDate();
    const seconds = v.seconds ?? v._seconds;
    if (typeof seconds === 'number') return new Date(seconds * 1000);
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
};

export const timeAgo = (value: unknown): string => {
  const created = toJsDate(value);
  if (!created) return 'Just now';

  const diffMs = Date.now() - created.getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
};
