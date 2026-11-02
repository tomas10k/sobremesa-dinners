"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { LangToggle, useLang } from "./LangProvider";
import { Reveal } from "./Reveal";
import { formatEventDate } from "@/lib/i18n";
import type { PublicEvent } from "@/lib/events";

// TODO: real LinkedIn URLs
const PEOPLE = [
  { name: "Daniela Olavarrieta", linkedin: "#" },
  { name: "Tomás Diez Canedo", linkedin: "#" },
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

      <Reveal className="block events">
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
            return (
              <article className="event" key={e.id}>
                <span className="meta-lg soft">No. {e.number}</span>
                <h3 className="body">{lang === "es" ? e.title_es : e.title_en}</h3>
                <span className={`meta-lg when ${when ? "" : "soft"}`}>{when ?? t.tbd}</span>
              </article>
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
                <a href={p.linkedin} target="_blank" rel="noopener noreferrer">
                  <span className="body">{p.name}</span>
                  <span className="meta-lg">LinkedIn ↗</span>
                </a>
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
        <span>
          <a href="mailto:diezcanedot@gmail.com">diezcanedot@gmail.com</a> &nbsp;·&nbsp;{" "}
          <a href="mailto:dolavarrietag@gmail.com">dolavarrietag@gmail.com</a>
        </span>
      </div>
    </footer>
  );
}
