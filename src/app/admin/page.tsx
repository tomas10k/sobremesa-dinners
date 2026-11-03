import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Dashboard } from "@/components/admin/Dashboard";
import { sessionClient } from "@/lib/supabase/session";
import type { AdminData } from "@/lib/admin/types";
import "./admin.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin · Sobremesa", robots: { index: false, follow: false } };

export default async function AdminPage() {
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
  const [events, eventSpeakers, speakers, students, proposals, proposalSpeakers, proposalTopics, referrals] =
    await Promise.all([
      db.from("events").select("*").order("number"),
      db.from("event_speakers").select("*"),
      db.from("speakers").select("*").order("created_at", { ascending: false }),
      db.from("students").select("*").order("created_at", { ascending: false }),
      db.from("proposals").select("*").order("created_at", { ascending: false }),
      db.from("proposal_speakers").select("*"),
      db.from("proposal_topics").select("*"),
      db.from("referrals").select("*").order("created_at", { ascending: false }),
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
  } as AdminData;

  return <Dashboard data={data} email={user.email ?? ""} />;
}
