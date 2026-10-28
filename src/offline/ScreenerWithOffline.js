// Use this wherever the app currently renders <PuzzleBoxScreener ... />.
//
// Online it renders the normal screener, unchanged. With no signal (or when
// the teacher chooses "Screen offline", via `preferOffline`) it opens the
// offline screener: the downloaded, encrypted package inside
// OfflineScreenerShell, which handles expiry, watermarking and copy blocking.
//
// The choice is made once when the screener opens, so it never switches
// mode in the middle of a screening.

import React, { useState } from "react";
import PuzzleBoxScreener from "../components/screener/PuzzleBoxScreener";
import OfflineScreenerShell from "./OfflineScreenerShell";

 
// Top-level wrapper that decides whether the screener runs online or from
// the offline package. The rest of the app renders this one component and
// doesn't need to know which mode is active.
//
// preferOffline: lets a caller force offline mode even when a connection
// exists (e.g. a "use offline screener" toggle or a low-bandwidth setting).
// ...props: everything else is passed straight through to PuzzleBoxScreener.


export default function ScreenerWithOffline({ preferOffline = false, ...props }) {


  // Decide the mode once, on first render. The lazy initialiser form of
  // useState runs only once, and there is deliberately no setter, so the
  // mode is fixed for the lifetime of this component. That stops the
  // screener from switching modes mid-session if the connection drops or
  // returns while a child is partway through an assessment.
  // navigator.onLine is only a hint: it reports whether the device has a
  // network interface, not whether the server is actually reachable.

  const [offlineMode] = useState(() => preferOffline || !navigator.onLine);

   // Online path: render the normal screener, which talks to the backend.

  if (!offlineMode) return <PuzzleBoxScreener {...props} />;


   // Offline path: the shell handles the licence and decryption flow
  // (the checks you showed earlier). It uses a render prop, so it only
  // calls the function below once the package is unlocked and the licence
  // is valid. For "locked" or "expired" states I'd expect the shell to
  // show its own message instead, but I can't see that from here.

  return (
    <OfflineScreenerShell>
      {(screener, licence) => (

        // Same screener component, now given the decrypted screener
        // content and licence via the `offline` prop so it reads from
        // local data instead of the network.
        
        <PuzzleBoxScreener {...props} offline={{ screener, licence }} />
      )}
    </OfflineScreenerShell>
  );
}
