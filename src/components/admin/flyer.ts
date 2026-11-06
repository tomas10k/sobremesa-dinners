import { dictionaries, formatEventDate, type Lang } from "@/lib/i18n";
import type { EventRow, SpeakerRow } from "@/lib/admin/types";

const SIZE = 1080; // Instagram square, drawn at 2x for sharpness
const SCALE = 2;
const PAD = 72;
const LINEN = "#ece6d8";
const LINEN_SOFT = "rgba(236, 230, 216, .72)";

/** "Rol, Empresa", leaving out whichever is blank; null when both are. */
export function flyerCredit(s: Pick<SpeakerRow, "role" | "company">): string | null {
  return [s.role, s.company].map((v) => v?.trim()).filter(Boolean).join(", ") || null;
}

/**
 * A 1:1 poster in the style of the homepage hero: the hero photo, "Sobremesa Dinners",
 * the dinner number, topic, date and city, and the role and company of each confirmed speaker.
 */
export async function downloadFlyer(event: EventRow, speakers: Pick<SpeakerRow, "role" | "company">[], lang: Lang) {
  const canvas = await drawFlyer(event, speakers, lang);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("No se pudo generar la imagen.");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `sobremesa-no-${event.number}-flyer-${lang}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export async function drawFlyer(
  event: Pick<EventRow, "number" | "title_es" | "title_en" | "starts_at" | "city">,
  speakers: Pick<SpeakerRow, "role" | "company">[],
  lang: Lang,
): Promise<HTMLCanvasElement> {
  const t = dictionaries[lang];
  // next/font gives the family a generated name; read it off the page.
  const family = getComputedStyle(document.body).fontFamily;
  const font = (weight: number, px: number) => `${weight} expanded ${px}px ${family}`;
  await Promise.all([document.fonts.load(font(300, 40)), document.fonts.load(font(600, 40))]);
  const photo = await loadImage("/hero.jpg");

  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE * SCALE;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(SCALE, SCALE);

  // Photo, cover-cropped to the square.
  const side = Math.min(photo.width, photo.height);
  ctx.drawImage(photo, (photo.width - side) / 2, (photo.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  const shade = ctx.createLinearGradient(0, 0, 0, SIZE);
  shade.addColorStop(0, "rgba(14, 13, 11, .55)");
  shade.addColorStop(0.45, "rgba(14, 13, 11, .35)");
  shade.addColorStop(1, "rgba(14, 13, 11, .88)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, SIZE, SIZE);

  ctx.textBaseline = "alphabetic";
  const label = (text: string, x: number, y: number, px: number, color = LINEN, align: CanvasTextAlign = "left") => {
    ctx.font = font(600, px);
    ctx.letterSpacing = `${px * 0.26}px`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    // letter-spacing adds a trailing gap; shift right-aligned text back by it.
    ctx.fillText(text.toUpperCase(), align === "right" ? x + px * 0.26 : x, y);
  };

  // Top row: number, and date and city.
  const when = [formatEventDate(event.starts_at, lang) ?? t.tbd, event.city && t[event.city]].filter(Boolean).join(" · ");
  label(`No. ${event.number}`, PAD, PAD + 18, 20);
  label(when, SIZE - PAD, PAD + 18, 20, LINEN, "right");

  // The hero title.
  ctx.font = font(300, 132);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = LINEN;
  ctx.textAlign = "left";
  ctx.fillText("Sobremesa", PAD - 6, PAD + 200);
  ctx.fillText("Dinners", PAD - 6, PAD + 340);

  // Bottom block, laid out upward from the bottom edge.
  const credits = speakers.map(flyerCredit).filter((c): c is string => Boolean(c));
  let y = SIZE - PAD;
  for (const c of [...credits].reverse()) {
    label(c, PAD, y, 18, LINEN_SOFT);
    y -= 34;
  }
  if (credits.length) {
    y -= 8;
    ctx.fillStyle = "rgba(236, 230, 216, .35)";
    ctx.fillRect(PAD, y, SIZE - PAD * 2, 1);
    y -= 34;
  }
  ctx.font = font(300, 46);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = LINEN;
  const title = lang === "es" ? event.title_es : event.title_en;
  for (const line of wrap(ctx, title, SIZE - PAD * 2).reverse()) {
    ctx.fillText(line, PAD, y);
    y -= 58;
  }
  return canvas;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    img.src = src;
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > width) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}
