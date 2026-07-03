import { useEffect, useState } from "react";

export function InstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<any>(null);
  const [show, setShow] = useState(false);

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  const isAndroid = /android/i.test(navigator.userAgent);

  const isWindows = navigator.userAgent.includes("Windows");

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

      console.log("beforeinstallprompt fired");

      setPromptEvent(e);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Always show install card if app isn't installed
    setShow(true);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handler
      );
    };
  }, []);

  const install = async () => {
    // Native install prompt available
    if (promptEvent) {
      promptEvent.prompt();

      const choice = await promptEvent.userChoice;

      if (choice.outcome === "accepted") {
        setShow(false);
      }

      setPromptEvent(null);

      return;
    }

    // Browser doesn't expose prompt
    alert(
      "Your browser isn't currently offering the install prompt.\n\nUse the instructions shown below to install DGTrack."
    );
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[9999]">
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-[90%] max-w-md">

        <h2 className="text-xl font-bold mb-3">
          Install DGTrack
        </h2>

        {/* iPhone */}
        {isIOS && (
          <>
            <p className="mb-4">
              Install DGTrack on your iPhone.
            </p>

            <ol className="space-y-2 text-sm mb-6">
              <li>1. Tap the Share button.</li>
              <li>2. Tap <b>Add to Home Screen</b>.</li>
            </ol>

            <button
              onClick={() => setShow(false)}
              className="w-full bg-blue-600 text-white py-2 rounded"
            >
              Got it
            </button>
          </>
        )}

        {/* Windows */}
        {isWindows && !isIOS && (
          <>
            <p className="mb-4">
              Install DGTrack for faster access and offline support.
            </p>

            {!promptEvent && (
              <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3 text-sm mb-5 space-y-2">
                <p><b>Chrome</b></p>
                <p>• Click the Install icon in the address bar.</p>
                <p>• Or Menu (⋮) → Cast, save and share → Install DGTrack.</p>

                <hr />

                <p><b>Microsoft Edge</b></p>
                <p>• Menu (...) → Apps → Install DGTrack.</p>
              </div>
            )}

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
                {promptEvent ? "Install" : "Open Install Guide"}
              </button>
            </div>
          </>
        )}

        {/* Android */}
        {isAndroid && !isIOS && !isWindows && (
          <>
            <p className="mb-4">
              Install DGTrack for faster access and offline support.
            </p>

            {!promptEvent && (
              <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3 text-sm mb-5">
                Open your browser menu (⋮) and tap
                <b> Install app</b> or
                <b> Add to Home screen</b>.
              </div>
            )}

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
                {promptEvent ? "Install" : "Open Install Guide"}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}