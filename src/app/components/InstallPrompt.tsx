import { useEffect, useState } from "react";

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);

  const isIOS =
    /iphone|ipad|ipod/i.test(window.navigator.userAgent);

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone;

  useEffect(() => {
    if (isStandalone) return;

    const handler = (e: any) => {
      e.preventDefault();

      setDeferredPrompt(e);

      setShow(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // iPhone
    if (isIOS && !isStandalone) {
      setShow(true);
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handler
      );
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();

    await deferredPrompt.userChoice;

    setDeferredPrompt(null);

    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[9999]">

      <div className="bg-white dark:bg-slate-900 rounded-xl w-[90%] max-w-sm p-6 shadow-xl">

        <h2 className="text-xl font-bold mb-2">
          Install DGTrack
        </h2>

        {isIOS ? (
          <>
            <p className="text-gray-600 dark:text-gray-300">
              Install DGTrack on your iPhone.
            </p>

            <div className="mt-4 space-y-2 text-sm">

              <p>1. Tap the <b>Share</b> button.</p>

              <p>2. Tap <b>Add to Home Screen</b>.</p>

            </div>

            <button
              onClick={() => setShow(false)}
              className="mt-6 w-full bg-blue-600 text-white py-2 rounded-lg"
            >
              Got it
            </button>
          </>
        ) : (
          <>
            <p className="text-gray-600 dark:text-gray-300">
              Install DGTrack for faster access and offline support.
            </p>

            <div className="flex gap-3 mt-6">

              <button
                onClick={() => setShow(false)}
                className="flex-1 border rounded-lg py-2"
              >
                Later
              </button>

              <button
                onClick={install}
                className="flex-1 bg-blue-600 text-white rounded-lg py-2"
              >
                Install
              </button>

            </div>
          </>
        )}
      </div>

    </div>
  );
}