import type { Metadata } from "next";
import { ProposalForm } from "@/components/forms/ProposalForm";

export const metadata: Metadata = { title: "Proponer una cena · Sobremesa Dinners" };

export default function Page() {
  return <ProposalForm />;
}
