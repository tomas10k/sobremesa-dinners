import type { Metadata } from "next";
import { SpeakerForm } from "@/components/forms/SpeakerForm";
import { getOpenSeatEvents } from "@/lib/events";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Speaker · Sobremesa Dinners" };

export default async function Page() {
  return <SpeakerForm openEvents={await getOpenSeatEvents()} />;
}
