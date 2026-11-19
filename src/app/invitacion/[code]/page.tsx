import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InvitePage } from "@/components/forms/InvitePage";
import { getInvite } from "@/lib/invites";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Invitación · Sobremesa Dinners",
  robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const invite = await getInvite((await params).code);
  if (!invite) notFound();
  return <InvitePage invite={invite} />;
}
