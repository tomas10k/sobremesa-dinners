import { icsFile } from "@/lib/calendar";
import { findGuest } from "@/lib/guests";
import { parseLang } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";

/** The dinner as an .ics file (Apple Calendar, Outlook), from a guest's personal link. */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const guest = await findGuest((await params).code);
  if (!guest) return new Response("Not found", { status: 404 });
  const lang = parseLang(new URL(req.url).searchParams.get("lang") ?? undefined);
  const ics = icsFile(guest.event, lang, SITE_URL);
  if (!ics) return new Response("Not found", { status: 404 });
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="sobremesa-no-${guest.event.number}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
