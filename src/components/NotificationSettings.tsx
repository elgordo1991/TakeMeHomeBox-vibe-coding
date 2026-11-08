import React, { useEffect, useState } from 'react';
import { Bell, BellOff, Loader } from 'lucide-react';
import {
  RADIUS_OPTIONS,
  PushAvailability,
  getPushAvailability,
  loadNotifySettings,
  enablePush,
  disablePush,
  updateRadius,
} from '../services/push';

const ERROR_TEXT: Record<string, string> = {
  blocked: 'Notifications are blocked for this site. Allow them in your browser or phone settings, then try again.',
  'not-granted': 'You need to allow notifications to get alerts.',
  'no-location': "We need your location once to know which boxes are near you. Allow location and try again.",
};

const HELP_TEXT: Partial<Record<PushAvailability, string>> = {
  'ios-needs-install': 'On iPhone, add TakeMeHomeBox to your Home Screen first (Share → Add to Home Screen), then open it from there.',
  unsupported: "This browser doesn't support notifications. Try Chrome, or install the app.",
  'not-configured': 'Notifications are not set up yet.',
  blocked: ERROR_TEXT.blocked,
};

const NotificationSettings: React.FC<{ uid: string }> = ({ uid }) => {
  const [availability, setAvailability] = useState<PushAvailability | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [radiusKm, setRadiusKm] = useState(3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [avail, settings] = await Promise.all([
        getPushAvailability(),
        loadNotifySettings(uid).catch(() => ({ enabled: false, radiusKm: 3 })),
      ]);
      if (cancelled) return;
      setAvailability(avail);
      setEnabled(settings.enabled && avail === 'ok');
      setRadiusKm(settings.radiusKm);
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const toggle = async () => {
    if (busy || availability !== 'ok') return;
    setBusy(true);
    setError(null);
    try {
      if (enabled) {
        await disablePush(uid);
        setEnabled(false);
      } else {
        await enablePush(uid, radiusKm);
        setEnabled(true);
      }
    } catch (e) {
      const code = e instanceof Error ? e.message : '';
      if (code === 'blocked') setAvailability('blocked');
      setError(ERROR_TEXT[code] ?? "Couldn't change notifications. Please try again.");
      console.error('Notification toggle failed:', e);
    } finally {
      setBusy(false);
    }
  };

  const chooseRadius = async (km: number) => {
    setRadiusKm(km);
    if (enabled) await updateRadius(uid, km).catch((e) => console.error('Radius update failed:', e));
  };

  const canToggle = availability === 'ok';
  const help = availability ? HELP_TEXT[availability] : undefined;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          {enabled ? <Bell className="h-5 w-5 text-accent" /> : <BellOff className="h-5 w-5 text-subtle" />}
          <div>
            <p className="font-medium text-muted">New box alerts</p>
            <p className="text-sm text-subtle">Get a notification when a box is listed near you</p>
          </div>
        </div>
        <button
          onClick={toggle}
          disabled={!canToggle || busy}
          role="switch"
          aria-checked={enabled}
          aria-label="New box alerts"
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
            enabled ? 'bg-accent' : 'bg-line-strong'
          }`}
        >
          {busy ? (
            <Loader className="mx-auto h-4 w-4 animate-spin text-white" />
          ) : (
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          )}
        </button>
      </div>

      {enabled && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-subtle">Alert me within</p>
          <div className="flex gap-2">
            {RADIUS_OPTIONS.map((km) => (
              <button
                key={km}
                onClick={() => chooseRadius(km)}
                aria-pressed={radiusKm === km}
                className={`flex-1 rounded-full border py-2 text-sm font-bold transition-colors ${
                  radiusKm === km ? 'border-ink bg-ink text-white' : 'border-line bg-surface text-muted hover:border-line-strong'
                }`}
              >
                {km} km
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-subtle">Distance is measured from where you turned alerts on.</p>
        </div>
      )}

      {!enabled && help && <p className="mt-3 rounded-2xl bg-sand/60 p-3 text-xs leading-snug text-muted">{help}</p>}
      {error && <p className="mt-3 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
};

export default NotificationSettings;
