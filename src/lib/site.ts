/** The public address in links we send out (the bare domain redirects to www). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.sobremesadinners.com").replace(/\/$/, "");

const list = (value: string | undefined) =>
  (value ?? "").split(",").map((e) => e.trim()).filter(Boolean);

/** Who gets the morning reminder and the guests' replies. Server only; set in Vercel, not in code. */
export const ADMIN_EMAILS = list(process.env.ADMIN_EMAILS);

/** The addresses shown in the site's footer. Public; set in Vercel, not in code. */
export const CONTACT_EMAILS = list(process.env.NEXT_PUBLIC_CONTACT_EMAILS);
