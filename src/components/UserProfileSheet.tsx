import React, { useEffect, useState } from 'react';
import { X, Gift, Package, Loader } from 'lucide-react';
import { BoxListing } from '../services/firestore';
import { getPublicProfile, PublicProfile } from '../services/social';
import { getRank } from '../utils/ranks';
import { ratingSummary } from '../utils/rating';
import { getImageUrl } from '../utils/imageUpload';

interface Props {
  uid: string;
  fallbackName: string;
  activeListings: BoxListing[]; // already loaded by the map
  onClose: () => void;
  onOpenListing: (listing: BoxListing) => void;
}

const memberSinceText = (iso?: string) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};

const UserProfileSheet: React.FC<Props> = ({ uid, fallbackName, activeListings, onClose, onOpenListing }) => {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getPublicProfile(uid)
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [uid]);

  const name = profile?.username || fallbackName;
  const rank = getRank(profile?.itemsGiven, profile?.itemsTaken);
  const theirBoxes = activeListings.filter((l) => l.userId === uid && !l.isSpotted);
  const since = memberSinceText(profile?.memberSince);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 backdrop-blur-sm animate-fade-in sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`${name}'s profile`}
      onClick={onClose}
    >
      <div className="card-dark w-full max-w-md max-h-[85vh] overflow-y-auto p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex justify-end">
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1 text-subtle hover:bg-sand hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader className="h-6 w-6 animate-spin text-muted" />
          </div>
        ) : (
          <>
            <div className="mb-5 text-center">
              <div className="mx-auto mb-3 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-accent-soft text-4xl shadow-soft">
                {profile?.avatar ? (
                  <img src={getImageUrl(profile.avatar)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span>{rank.emoji}</span>
                )}
              </div>
              <h2 className="text-2xl font-black">{name}</h2>
              <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-accent-soft px-3 py-1">
                <span>{rank.emoji}</span>
                <span className="text-sm font-bold text-accent-dark">{rank.title}</span>
              </div>
              {since && <p className="mt-2 text-xs text-subtle">Member since {since}</p>}
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-line bg-sand/50 p-3 text-center">
                <Gift className="mx-auto mb-1 h-5 w-5 text-accent" />
                <p className="text-xl font-black">{profile?.itemsGiven ?? 0}</p>
                <p className="text-xs font-semibold text-muted">Boxes given</p>
              </div>
              <div className="rounded-2xl border border-line bg-sand/50 p-3 text-center">
                <Package className="mx-auto mb-1 h-5 w-5 text-leaf" />
                <p className="text-xl font-black">{profile?.itemsTaken ?? 0}</p>
                <p className="text-xs font-semibold text-muted">Boxes found</p>
              </div>
            </div>

            <h3 className="mb-2 text-sm font-extrabold uppercase tracking-wider text-subtle">
              Boxes out now ({theirBoxes.length})
            </h3>
            {theirBoxes.length === 0 ? (
              <p className="rounded-2xl bg-sand/50 p-4 text-center text-sm text-subtle">No boxes out right now.</p>
            ) : (
              <div className="space-y-2">
                {theirBoxes.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => onOpenListing(l)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-2 text-left transition hover:shadow-soft"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-sand text-xl">
                      {l.images?.[0] ? <img src={getImageUrl(l.images[0])} alt="" className="h-full w-full object-cover" /> : '📦'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-extrabold text-ink">{l.title}</p>
                      <p className="text-xs text-subtle">
                        {ratingSummary(l).emoji} {ratingSummary(l).count ? ratingSummary(l).text : 'New'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UserProfileSheet;
