import { useEffect, useState } from "react";

export function InstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<any>(null);
  const [show, setShow] = useState(false);

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone;

  useEffect(() => {
    // Already installed
    if (isStandalone) {
      setShow(false);
      return;
    }

    const handler = (e: any) => {
      e.preventDefault();
      setPromptEvent(e);
      setShow(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // iPhone never fires beforeinstallprompt
    if (isIOS) {
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
    if (promptEvent) {
      promptEvent.prompt();

      const result = await promptEvent.userChoice;

      if (result.outcome === "accepted") {
        setShow(false);
      }

      setPromptEvent(null);
    } else {
      alert(
        "Your browser isn't currently offering the install prompt.\n\nYou can still install DGTrack from your browser menu."
      );
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[9999]">
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-sm w-[90%]">

        <h2 className="text-xl font-bold mb-3">
          Install DGTrack
        </h2>

        {isIOS ? (
          <>
            <p className="mb-4">
              Install DGTrack on your iPhone.
            </p>

            <ol className="space-y-2 text-sm">
              <li>1. Tap the Share button.</li>
              <li>2. Tap Add to Home Screen.</li>
            </ol>

            <button
              onClick={() => setShow(false)}
              className="mt-6 w-full bg-blue-600 text-white py-2 rounded"
            >
              Got it
            </button>
          </>
        ) : (
          <>
            <p className="mb-5">
              Install DGTrack for faster access and offline use.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShow(false)}
                className="flex-1 border py-2 rounded"
              >
                Later
              </button>

              <button
                onClick={install}
                className="flex-1 bg-blue-600 text-white py-2 rounded"
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