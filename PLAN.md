# Sobremesa Dinners — Plan

Latino networking from a place of cultural alignment: small dinners (3 speakers + 7–12 MBA students) in SF or Berkeley, where connection happens the way it does at home — at the table, after the meal.

Owners: Tomás Diez Canedo (diezcanedot@gmail.com) · Daniela Olavarrieta (dolavarrietag@gmail.com)

---

## 1. Visual direction (from invite No. 1)

| Element | Decision |
|---|---|
| Background | Eggshell linen/silk weave (`#EEE8DA`), built in CSS/SVG noise so it's crisp at any size; hemstitch (dotted) inset border like the napkin edge |
| Headline type | Embroidered look: wide heavy grotesque, satin-stitch texture clipped to the letters, slight raised shadow, loose thread tails |
| Font | Best match: **Archivo** (Google Fonts, variable width axis) — Expanded ExtraBold for headlines, normal width for body. Alternates to compare: *Familjen Grotesk*, *Schibsted Grotesk* |
| Palette | Forest thread `#2E5B45` · Brick/terracotta `#A54640` · Wine `#6B1E2B` · Candle `#E2C25C` · Linen `#EEE8DA` · Ink `#22352C` |
| Illustration | The candle → glasses → bottle line drawing as running-stitch SVG (dashed stroke), reused as section dividers; one continuous thread connecting sections = "connection" |
| Rules | No gradients-on-white, no glassmorphism, no icon grids, no stock photos. Real photos of real dinners as soon as No. 1 happens |

## 2. Site map (Spanish default, ES | EN toggle top-right)

Direction (v2): A24 / film-credits feel — one ink color on linen, film grain, lots of empty space, minimal text. Only the title is embroidered.

1. **Hero** — embroidered *Sobremesa Dinners*, full screen, credit-style corners (SF · Berkeley / next dinner)
2. **Definición** — *so·bre·me·sa*, dictionary style
3. **Descripción** — "Una cena para compartir, a la latina…"
4. **¿Cómo funciona?** — 3 speakers · 7–12 estudiantes · 7–9:30 pm lun–jue · 1 tema
5. **Eventos** — Próximos / Anteriores, rows *No. 1, No. 2…* with topic, date, place
6. **Quiénes somos** — two portraits + origin story (CDMX → Berkeley Haas)
7. **Jala una silla** — *Soy speaker* · *Soy estudiante* · *Proponer una cena*
8. **Footer** — both emails

## 3. Forms

### Speaker
- Name, email, LinkedIn, company, role, industry
- Weekday availability (Mon–Thu checkboxes), willing to go to: Berkeley / SF / both
- What do you want out of it (dropdown): give back to students · connect with my industry · grow my Latino network in the Bay · other
- **Open seats:** if any upcoming event is missing speakers, show "¿Estás libre el {fecha} para {tema} con {speakers confirmados}?" → Yes / Maybe / No (feeds admin review)
- **Referrals:** "¿Conoces a alguien que debería estar en una Sobremesa?" — repeatable rows (name, LinkedIn, email, why)
- Optional extras (see §5)

### Student application (per event link + QR for the invite)
- Name, email, LinkedIn, university, program (MBA / other), year (1st / 2nd)
- Essay: "¿Por qué quieres sumarte a esta cena?" — **hard limit 200 words** (live counter, typing blocked past 200, validated server-side too)

### Proponer una cena
- Choose: propose **speakers**, **topics**, or both
- Repeatable "+ agregar otro" rows: speakers (name, company, role, LinkedIn, why) · topics (title, short description)

## 4. Admin (Google sign-in, only the two Gmail accounts above)

- Tables: Speakers, Students, Proposals, Referrals, Events
- **Edit any cell inline**; status per person (speaker: nuevo → contactado → confirmado → asistió; student: aplicó → aceptado / lista de espera / no → confirmó → asistió)
- Filter by weekday, location, industry, role, university, year, status
- **Select rows → "Agregar a cena"** (existing) or **"Crear nueva cena"** (topic, number, date, time, place, sponsor, speaker display info editable)
- Event view: capacity meters (speakers x/3, students x/12), table mix (industries, schools), open-seat answers to approve
- Per event: copy student-application link + downloadable QR
- **Export to Excel** on every table
- Notes field on every record

## 5. Opportunities worth adding (recommended)

Speaker form
- **"¿Puedes ofrecer un espacio?"** — home, office or restaurant contact. Venue is the bottleneck you already hit (Menlo house).
- **"¿Tu empresa podría patrocinar una cena?"** — feeds the "sponsored by" line directly.
- **"¿Estás contratando / ofreces internships?"** — the strongest pull for students and a talking point for the table.
- Country/roots (optional) — lets you mix tables across Latin America, and tells a nice story in metrics.
- Short bio + headshot + consent to show name on the site.
- Dietary restrictions — it's a dinner.
- "¿Cómo te enteraste?" — tells you which channel works.

Student side
- **"Avísame de la próxima cena"** — light waitlist on the public page so demand is captured between application windows.
- Dietary restrictions, WhatsApp (optional), industries of interest (helps match the table to the speakers).

After each dinner
- 1-minute feedback form (rating, # of new real connections, would you come back / refer someone). Gives you the flywheel numbers Daniela asked for: dinners hosted, unique attendees, repeat speakers, referrals generated.
- Opt-in attendee list shared after dinner so the connection survives the night.

## 6. Tech

- **Next.js on Vercel** · **Supabase** (Postgres + Google OAuth, row-level security restricting admin to the two emails) · TanStack Table for the admin grid · SheetJS for `.xlsx` export · simple ES/EN dictionaries
- Spam: honeypot field + rate limit on submissions
- Note: Supabase free projects pause after ~7 days without traffic; a free uptime ping or the $25 plan avoids that once live

## 7. Phases

| Phase | Due | Scope |
|---|---|---|
| 0 — Look | Now | Static homepage prototype to lock the aesthetic |
| 1 — Launch | **Wed Nov 4** | Homepage ES/EN, speaker form, student application for No. 1 (with QR), proposals form, data saved; deployed on Vercel |
| 2 — Admin | ~Nov 9 | Google sign-in, editable tables, filters, create event / add to event, Excel export |
| 3 — Flywheel | After No. 1 (Nov 17) | Feedback form, open-seat matching, metrics, photos from the dinner |

## 8. Waiting on

- Confirmed speakers (name, role, company, industry, headshot) for No. 1–3
- Sponsors, if any
- The "who we are" video
- Domain (or use `sobremesa-dinners.vercel.app` for now)
