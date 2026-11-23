"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { CONTACT_EMAILS } from "@/lib/site";
import { LangToggle, useLang } from "./LangProvider";
import { Reveal } from "./Reveal";
import { formatEventDate } from "@/lib/i18n";
import { speakerLine } from "@/lib/seats";
import type { PublicEvent } from "@/lib/events";

const PEOPLE: { name: string; linkedin: string | null }[] = [
  { name: "Daniela Olavarrieta", linkedin: "https://www.linkedin.com/in/daniela-olavarrieta-gonzalez/" },
  { name: "Tomás Diez Canedo", linkedin: "https://www.linkedin.com/in/tomas-diez/" },
];

export function Home({ events }: { events: PublicEvent[] }) {
  const { t, lang } = useLang();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const shown = events.filter((e) => e.status === tab);
  const next = events.find((e) => e.status === "upcoming" && e.starts_at);

  return (
    <>
      <header className="hero">
        <Image className="hero-img" src="/hero.jpg" alt="" fill priority sizes="100vw" />
        <nav className="label">
          <span>Sobremesa</span>
          <div className="nav-right">
            <LangToggle />
            <Link className="cta" href="/speaker">{t.ctaSpeaker}</Link>
          </div>
        </nav>
        <div />
        <div>
          <h1 className="title">Sobremesa<br />Dinners</h1>
          <div className="credits label">
            <span>San Francisco · Berkeley</span>
            {next && (
              <span>
                No. {next.number} — {[formatEventDate(next.starts_at, lang), next.city && t[next.city]].filter(Boolean).join(" · ")}
              </span>
            )}
          </div>
        </div>
      </header>

      <Reveal className="intro">
        <div className="book">
          <div className="page left">
            <span className="runhead label soft">Sobremesa</span>
            <div className="word">so·bre·me·sa</div>
            <div className="meta soft">/so·βɾe·ˈme·sa/ &nbsp; <span>{t.pos}</span></div>
            <p className="text">{t.def}</p>
            <span className="folio label soft">1</span>
          </div>
          <div className="page right">
            <span className="runhead label soft">Dinners</span>
            <p className="text">{t.desc}</p>
            <p className="facts label soft">{t.facts}</p>
            <span className="folio label soft">2</span>
          </div>
        </div>
      </Reveal>

      <Reveal className="block events" id="eventos">
        <div className="head">
          <h2>{t.events}</h2>
          <div className="tabs meta-lg" role="tablist">
            {(["upcoming", "past"] as const).map((k) => (
              <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
                {t[k]}
              </button>
            ))}
          </div>
        </div>
        {shown.length === 0 ? (
          <p className="empty body soft">{t.pastEmpty}</p>
        ) : (
          shown.map((e) => {
            const date = formatEventDate(e.starts_at, lang);
            const city = e.city ? t[e.city] : null;
            const when = date ? [date, city].filter(Boolean).join(" · ") : null;
            const credits = speakerLine(e);
            return (
              <Link className="event" key={e.id} href={`/cena/${e.number}`}>
                <span className="meta-lg soft">No. {e.number}</span>
                <h3 className="body">{lang === "es" ? e.title_es : e.title_en}</h3>
                <div className="when">
                  <span className={`meta-lg ${when ? "" : "soft"}`}>{when ?? t.tbd}</span>
                  {credits.length > 0 && (
                    <ul className="credits-list label soft">
                      {credits.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </Reveal>

      <Reveal className="block story">
        <div className="head"><h2>{t.about}</h2></div>
        <div className="about">
          <ul className="people">
            {PEOPLE.map((p) => (
              <li key={p.name}>
                {p.linkedin ? (
                  <a href={p.linkedin} target="_blank" rel="noopener noreferrer">
                    <span className="body">{p.name}</span>
                    <span className="meta-lg">LinkedIn ↗</span>
                  </a>
                ) : (
                  <span className="body">{p.name}</span>
                )}
              </li>
            ))}
          </ul>
          <p className="body">{t.story}</p>
        </div>
      </Reveal>

      <Reveal className="block community">
        <div className="head"><h2>{t.community}</h2></div>
        <div className="links label">
          <Link href="/speaker">{t.imSpeaker}</Link>
          <Link href="/estudiante">{t.imStudent}</Link>
          <Link href="/proponer">{t.propose}</Link>
        </div>
      </Reveal>

      <Footer />
    </>
  );
}

export function Footer() {
  return (
    <footer>
      <div className="credits label">
        <span>Sobremesa Dinners · 2026</span>
        {CONTACT_EMAILS.length > 0 && (
          <span>
            {CONTACT_EMAILS.map((email, i) => (
              <span key={email}>
                {i > 0 && <>&nbsp;·&nbsp; </>}
                <a href={`mailto:${email}`}>{email}</a>
              </span>
            ))}
          </span>
        )}
      </div>
    </footer>
  );
}
