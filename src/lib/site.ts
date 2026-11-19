/** The public address in links we send out. Switch it when the custom domain is live. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://sobremesa-dinners.vercel.app").replace(/\/$/, "");

export const ADMIN_EMAILS = ["diezcanedot@gmail.com", "dolavarrietag@gmail.com"];
