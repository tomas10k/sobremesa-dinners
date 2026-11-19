import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FeedbackForm } from "@/components/forms/FeedbackForm";
import { findGuest } from "@/lib/guests";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Feedback · Sobremesa Dinners", robots: { index: false, follow: false } };

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const guest = await findGuest((await params).code);
  if (!guest) notFound();
  return <FeedbackForm guest={guest} />;
}
