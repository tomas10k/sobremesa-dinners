import type { Metadata } from "next";
import { GoogleSignIn } from "@/components/admin/GoogleSignIn";
import "../admin.css";

export const metadata: Metadata = { title: "Entrar · Sobremesa Admin", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="a-gate">
      <h1>Sobremesa <span>Admin</span></h1>
      <p>Solo para Daniela y Tomás.</p>
      {error && <p className="a-warn">No pudimos iniciar sesión. Intenta de nuevo.</p>}
      <GoogleSignIn />
    </main>
  );
}
