"use client";

import { useState } from "react";
import { browserClient } from "@/lib/supabase/browser";

export function GoogleSignIn() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="a-btn primary big"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await browserClient().auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { prompt: "select_account" } },
        });
      }}
    >
      {busy ? "Abriendo Google…" : "Entrar con Google"}
    </button>
  );
}
