import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConfirmSeat } from "@/components/forms/ConfirmSeat";
import { findGuest } from "@/lib/guests";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Confirma tu lugar · Sobremesa Dinners", robots: { index: false, follow: false } };

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const guest = await findGuest((await params).code);
  if (!guest || guest.type !== "student") notFound();
  return <ConfirmSeat guest={guest} />;
}
