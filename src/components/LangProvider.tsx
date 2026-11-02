"use client";

import { createContext, useContext, useState } from "react";
import { dictionaries, LANG_COOKIE, type Dict, type Lang } from "@/lib/i18n";

type Ctx = { lang: Lang; t: Dict; setLang: (lang: Lang) => void };

const LangContext = createContext<Ctx | null>(null);

export function LangProvider({ initial, children }: { initial: Lang; children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initial);

  function setLang(next: Lang) {
    setLangState(next);
    document.documentElement.lang = next;
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <LangContext.Provider value={{ lang, t: dictionaries[lang], setLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang(): Ctx {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside <LangProvider>");
  return ctx;
}

export function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="lang" role="group" aria-label="Idioma / Language">
      {(["es", "en"] as const).map((l) => (
        <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
