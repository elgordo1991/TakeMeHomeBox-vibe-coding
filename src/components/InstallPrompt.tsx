import React, { useEffect, useState } from 'react';
import { Share, X } from 'lucide-react';

// Chrome/Edge/Android fire this event when the app can be installed.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'tmhb-install-dismissed-at';
const SNOOZE_DAYS = 14;

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as unknown as { standalone?: boolean }).standalone === true;

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

const recentlyDismissed = () => {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return at > 0 && Date.now() - at < SNOOZE_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
};

const InstallPrompt: React.FC = () => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIos, setShowIos] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => setVisible(false);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    // iOS never fires beforeinstallprompt, so show instructions instead.
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (isIos()) {
      timer = setTimeout(() => {
        setShowIos(true);
        setVisible(true);
      }, 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* storage unavailable: just hide for this visit */
    }
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === 'accepted') setVisible(false);
    else dismiss();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-24 z-40 px-4 safe-area-pb animate-slide-up" role="dialog" aria-label="Install TakeMeHomeBox">
      <div className="card-dark mx-auto flex max-w-sm items-center gap-3 p-3 pr-2 shadow-lift">
        <img src="/icons/icon-192.png" alt="" className="h-12 w-12 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-ink">Get the app</p>
          {showIos ? (
            <p className="text-xs leading-snug text-muted">
              Tap <Share className="inline h-3.5 w-3.5 -translate-y-px" aria-label="Share" /> then{' '}
              <span className="font-bold">Add to Home Screen</span>
            </p>
          ) : (
            <p className="text-xs leading-snug text-muted">Add TakeMeHomeBox to your home screen</p>
          )}
        </div>
        {!showIos && deferred && (
          <button onClick={install} className="btn-primary shrink-0 px-4 py-2 text-sm shadow-none">
            Install
          </button>
        )}
        <button
          onClick={dismiss}
          aria-label="Not now"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-subtle hover:bg-sand hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt;
