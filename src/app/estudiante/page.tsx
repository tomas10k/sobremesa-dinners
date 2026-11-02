import type { Metadata } from "next";
import { StudentForm } from "@/components/forms/StudentForm";
import { getPublishedEvents } from "@/lib/events";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Estudiantes · Sobremesa Dinners" };

/** `/estudiante?cena=1` preselects dinner No. 1 (that's the link behind each invite's QR). */
export default async function Page({ searchParams }: { searchParams: Promise<{ cena?: string }> }) {
  const { cena } = await searchParams;
  const open = (await getPublishedEvents()).filter((e) => e.status === "upcoming" && e.applications_open);
  return <StudentForm events={open} preselect={cena} />;
}
