import type { Metadata } from "next";
import { SpeakerForm } from "@/components/forms/SpeakerForm";
import { getOpenSeatEvents } from "@/lib/events";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Speaker · Sobremesa Dinners" };

/** `/speaker?cena=1` is the short form for joining dinner No. 1, while it has open seats. */
export default async function Page({ searchParams }: { searchParams: Promise<{ cena?: string }> }) {
  const { cena } = await searchParams;
  const openEvents = await getOpenSeatEvents();
  const event = openEvents.find((e) => String(e.number) === cena);
  return <SpeakerForm openEvents={openEvents} event={event} />;
}
