import { proposalSchema } from "@/lib/schemas";
import { serviceClient } from "@/lib/supabase/server";
import { invalid, notConfigured, readJson, serverError } from "@/lib/api";

export async function POST(req: Request) {
  const parsed = proposalSchema.safeParse(await readJson(req));
  if (!parsed.success) return invalid(parsed.error);
  const db = serviceClient();
  if (!db) return notConfigured();

  const { name, email, kind, speakers, topics } = parsed.data;

  const { data, error } = await db
    .from("proposals")
    .insert({ name, email, kind })
    .select("id")
    .single();
  if (error) return serverError("proposals.insert", error.message);

  // Only keep the lists that match what they chose to propose.
  if (kind !== "topics" && speakers.length) {
    const { error: e } = await db
      .from("proposal_speakers")
      .insert(speakers.map((s) => ({ ...s, proposal_id: data.id })));
    if (e) return serverError("proposal_speakers.insert", e.message);
  }
  if (kind !== "speakers" && topics.length) {
    const { error: e } = await db
      .from("proposal_topics")
      .insert(topics.map((t) => ({ ...t, proposal_id: data.id })));
    if (e) return serverError("proposal_topics.insert", e.message);
  }

  return Response.json({ ok: true }, { status: 201 });
}
