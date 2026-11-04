import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventPage } from "@/components/EventPage";
import { getEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ numero: string }> };

async function load({ params }: Props) {
  const { numero } = await params;
  return /^\d+$/.test(numero) ? getEvent(Number(numero)) : null;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const event = await load(props);
  return { title: event ? `No. ${event.number} — ${event.title_es} · Sobremesa Dinners` : "Sobremesa Dinners" };
}

export default async function Page(props: Props) {
  const event = await load(props);
  if (!event) notFound();
  return <EventPage event={event} />;
}
