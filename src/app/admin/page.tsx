import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Dashboard } from "@/components/admin/Dashboard";
import { EMAIL_KINDS } from "@/lib/emails/schedule";
import { sessionClient } from "@/lib/supabase/session";
import type { AdminData } from "@/lib/admin/types";
import "./admin.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin · Sobremesa", robots: { index: false, follow: false } };

/** `/admin?cena=<id>&correo=<kind>` (the morning reminder's links) opens that dinner and email. */
export default async function AdminPage({ searchParams }: { searchParams: Promise<{ cena?: string; correo?: string }> }) {
  const { cena, correo } = await searchParams;
  const db = await sessionClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: isAdmin } = await db.rpc("is_admin");
  if (!isAdmin) {
    return (
      <main className="a-gate">
        <h1>Sin acceso</h1>
        <p>{user.email} no es una cuenta de administrador de Sobremesa.</p>
        <form action="/auth/signout" method="post"><button className="a-btn">Entrar con otra cuenta</button></form>
      </main>
    );
  }

  // Row-level security limits every query below to admins.
  const [events, eventSpeakers, speakers, students, proposals, proposalSpeakers, proposalTopics, referrals, invites, emailLog, emailDrafts, feedback] =
    await Promise.all([
      db.from("events").select("*").order("number"),
      db.from("event_speakers").select("*"),
      db.from("speakers").select("*").order("created_at", { ascending: false }),
      db.from("students").select("*").order("created_at", { ascending: false }),
      db.from("proposals").select("*").order("created_at", { ascending: false }),
      db.from("proposal_speakers").select("*"),
      db.from("proposal_topics").select("*"),
      db.from("referrals").select("*").order("created_at", { ascending: false }),
      db.from("invites").select("*").order("created_at", { ascending: false }),
      db.from("email_log").select("*").order("sent_at", { ascending: false }),
      db.from("email_drafts").select("*"),
      db.from("feedback").select("*").order("created_at", { ascending: false }),
    ]);

  const data = {
    events: events.data ?? [],
    eventSpeakers: eventSpeakers.data ?? [],
    speakers: speakers.data ?? [],
    students: students.data ?? [],
    proposals: proposals.data ?? [],
    proposalSpeakers: proposalSpeakers.data ?? [],
    proposalTopics: proposalTopics.data ?? [],
    referrals: referrals.data ?? [],
    invites: invites.data ?? [],
    emailLog: emailLog.data ?? [],
    emailDrafts: emailDrafts.data ?? [],
    feedback: feedback.data ?? [],
  } as AdminData;

  const email = EMAIL_KINDS.find((k) => k === correo) ?? null;
  return <Dashboard data={data} email={user.email ?? ""} initialEvent={cena ?? null} initialEmail={email} />;
}
