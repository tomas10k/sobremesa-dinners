import type { Metadata } from "next";
import { SpeakerForm } from "@/components/forms/SpeakerForm";
import { getOpenSeatEvents } from "@/lib/events";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Speaker · Sobremesa Dinners" };

/** `/speaker?cena=1` (the "join" button on a dinner's page) pre-answers "yes" for dinner No. 1. */
export default async function Page({ searchParams }: { searchParams: Promise<{ cena?: string }> }) {
  const { cena } = await searchParams;
  return <SpeakerForm openEvents={await getOpenSeatEvents()} preselect={cena} />;
}
