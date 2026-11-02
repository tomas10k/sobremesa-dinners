import "server-only";
import type { ZodError } from "zod";

export function invalid(error: ZodError) {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    fields[path] ??= issue.message === "too_long" ? "too_long" : issue.code;
  }
  return Response.json({ error: "invalid", fields }, { status: 400 });
}

export const notConfigured = () =>
  Response.json({ error: "not_configured" }, { status: 503 });

export const serverError = (where: string, message: string) => {
  console.error(where, message);
  return Response.json({ error: "server" }, { status: 500 });
};

export async function readJson(req: Request): Promise<unknown> {
  if (!req.headers.get("content-type")?.includes("application/json")) return null;
  try {
    return await req.json();
  } catch {
    return null;
  }
}
