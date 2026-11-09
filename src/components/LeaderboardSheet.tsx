import React, { useEffect, useState } from 'react';
import { X, Loader, Trophy } from 'lucide-react';
import { getLocalLegends, Legend, LEGENDS_RADIUS_KM } from '../services/social';
import { getRank } from '../utils/ranks';
import { getImageUrl } from '../utils/imageUpload';

interface Props {
  center: { lat: number; lng: number };
  usingMyLocation: boolean;
  currentUid?: string;
  onClose: () => void;
  onOpenProfile: (uid: string, name: string) => void;
}

const MEDALS = ['🥇', '🥈', '🥉'];

const LeaderboardSheet: React.FC<Props> = ({ center, usingMyLocation, currentUid, onClose, onOpenProfile }) => {
  const [legends, setLegends] = useState<Legend[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const month = new Date().toLocaleDateString(undefined, { month: 'long' });

  useEffect(() => {
    getLocalLegends(center)
      .then(setLegends)
      .catch((e) => {
        console.error('Leaderboard failed:', e);
        setError("Couldn't load the leaderboard. Please try again.");
      });
  }, [center.lat, center.lng]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 backdrop-blur-sm animate-fade-in sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legends-title"
      onClick={onClose}
    >
      <div className="card-dark w-full max-w-md max-h-[85vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="rounded-t-3xl bg-gradient-to-br from-accent to-accent-dark p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white/80">{month} · within {LEGENDS_RADIUS_KM} km</p>
              <h2 id="legends-title" className="mt-1 flex items-center gap-2 text-2xl font-black text-white">
                <Trophy className="h-6 w-6" /> Local legends
              </h2>
              <p className="mt-1 text-sm text-white/85">Top givers near {usingMyLocation ? 'you' : 'the map centre'} this month</p>
            </div>
            <button onClick={onClose} aria-label="Close" className="rounded-full p-1 text-white/80 hover:bg-white/15 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-4">
          {error && <p className="p-4 text-center text-sm text-red-600">{error}</p>}
          {!error && legends === null && (
            <div className="flex justify-center py-10">
              <Loader className="h-6 w-6 animate-spin text-muted" />
            </div>
          )}
          {legends && legends.length === 0 && (
            <div className="py-8 text-center">
              <p className="mb-1 text-4xl">📦</p>
              <p className="font-extrabold text-ink">No boxes given nearby yet this month</p>
              <p className="text-sm text-subtle">List one and you'll top the board!</p>
            </div>
          )}
          {legends && legends.length > 0 && (
            <ol className="space-y-2">
              {legends.map((l, i) => {
                const rank = getRank(l.profile?.itemsGiven, l.profile?.itemsTaken);
                const isMe = l.uid === currentUid;
                return (
                  <li key={l.uid}>
                    <button
                      onClick={() => onOpenProfile(l.uid, l.username)}
                      className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition hover:shadow-soft ${
                        isMe ? 'border-accent bg-accent-soft/60' : 'border-line bg-surface'
                      }`}
                    >
                      <span className="w-8 shrink-0 text-center text-xl font-black text-subtle">{MEDALS[i] ?? i + 1}</span>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sand text-lg">
                        {l.avatar ? <img src={getImageUrl(l.avatar)} alt="" className="h-full w-full object-cover" /> : rank.emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-extrabold text-ink">
                          {l.username}
                          {isMe && <span className="ml-1 text-xs font-bold text-accent-dark">(you)</span>}
                        </p>
                        <p className="text-xs text-subtle">
                          {rank.emoji} {rank.title}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-lg font-black text-ink">{l.boxesGiven}</p>
                        <p className="text-[11px] font-semibold text-subtle">{l.boxesGiven === 1 ? 'box' : 'boxes'}</p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
          <p className="mt-4 text-center text-xs text-subtle">Resets on the 1st of every month. You can hide yourself in Profile → Settings.</p>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardSheet;
