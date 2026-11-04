"use client";

import Image from "next/image";
import Link from "next/link";
import { LangToggle, useLang } from "./LangProvider";
import { Footer } from "./Home";
import { formatEventDate } from "@/lib/i18n";
import { canApplyAsStudent, canJoinAsSpeaker } from "@/lib/seats";
import type { PublicEvent } from "@/lib/events";

export function EventPage({ event }: { event: PublicEvent }) {
  const { t, lang } = useLang();
  const title = lang === "es" ? event.title_es : event.title_en;
  const description = (lang === "es" ? event.description_es : event.description_en) || event.description_es;
  const when = [formatEventDate(event.starts_at, lang) ?? t.tbd, event.city && t[event.city]].filter(Boolean).join(" · ");
  const upcoming = event.status === "upcoming";
  const apply = canApplyAsStudent(event);
  const join = canJoinAsSpeaker(event);
  // Keep the row even when only some speakers have a photo.
  const anyPhoto = event.speakers.some((s) => s.photo_url);

  return (
    <>
      <nav className="topbar label">
        <Link href="/#eventos">{t.allEvents}</Link>
        <LangToggle />
      </nav>

      <main className="block event-page" style={{ paddingTop: 24 }}>
        <div className="head">
          <h2>{title}</h2>
          <span className="meta-lg soft">No. {event.number}</span>
          <p className="meta-lg when">{when}</p>
        </div>

        {description && <p className="body ev-desc">{description}</p>}

        <section className="ev-speakers">
          <h3 className="meta-lg">{t.evSpeakers}</h3>
          {event.speakers.length === 0 ? (
            <p className="body soft">{t.evSpeakersSoon}</p>
          ) : (
            <ul>
              {event.speakers.map((s, i) => (
                <li key={i}>
                  {s.photo_url ? (
                    <Image className="ev-photo" src={s.photo_url} alt={s.name ?? ""} width={320} height={400} sizes="(max-width: 640px) 40vw, 240px" />
                  ) : (
                    anyPhoto && <div className="ev-photo blank" aria-hidden="true" />
                  )}
                  {s.name && <span className="body">{s.name}</span>}
                  <span className={s.name ? "label soft" : "body"}>{s.role}</span>
                  <span className="label soft">{s.company}</span>
                </li>
              ))}
            </ul>
          )}
          {join && event.speakers.length > 0 && (
            <p className="label soft">{t.evSeatsLeft}: {event.seats_left}</p>
          )}
        </section>

        {upcoming && (
          <div className="links label">
            {apply && <Link href={`/estudiante?cena=${event.number}`}>{t.evApply}</Link>}
            {join && <Link href={`/speaker?cena=${event.number}`}>{t.evJoin}</Link>}
          </div>
        )}
        {upcoming && (!apply || !join) && (
          <p className="label soft ev-note">
            {[!apply && t.evClosed, !join && t.evFull].filter(Boolean).join(" ")}
          </p>
        )}
      </main>
      <Footer />
    </>
  );
}
