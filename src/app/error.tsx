"use client";

import { AlertCircle } from "lucide-react";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <main className="global-error" role="alert">
      <AlertCircle aria-hidden="true" />
      <p className="eyebrow">Page interrupted</p>
      <h1>AccessReady couldn’t finish loading.</h1>
      <p>Your source material is still in this browser. Try rendering the page again.</p>
      <button className="primary-button" type="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
