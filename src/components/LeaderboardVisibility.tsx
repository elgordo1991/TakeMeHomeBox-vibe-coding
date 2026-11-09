import React, { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { getPublicProfile, setHideFromLeaderboard } from '../services/social';

const LeaderboardVisibility: React.FC<{ uid: string }> = ({ uid }) => {
  const [visible, setVisible] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPublicProfile(uid)
      .then((p) => setVisible(!p?.hideFromLeaderboard))
      .catch(() => undefined);
  }, [uid]);

  const toggle = async () => {
    const next = !visible;
    setVisible(next);
    setBusy(true);
    try {
      await setHideFromLeaderboard(uid, !next);
    } catch (e) {
      console.error('Leaderboard setting failed:', e);
      setVisible(!next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 p-4">
      <div className="flex items-center space-x-3">
        <Trophy className={`h-5 w-5 ${visible ? 'text-accent' : 'text-subtle'}`} />
        <div>
          <p className="font-medium text-muted">Show me on Local legends</p>
          <p className="text-sm text-subtle">Appear on the monthly top givers board near your boxes</p>
        </div>
      </div>
      <button
        onClick={toggle}
        disabled={busy}
        role="switch"
        aria-checked={visible}
        aria-label="Show me on Local legends"
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
          visible ? 'bg-accent' : 'bg-line-strong'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            visible ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
};

export default LeaderboardVisibility;
