import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { cookies } from "next/headers";
import { LangProvider } from "@/components/LangProvider";
import { LANG_COOKIE, parseLang } from "@/lib/i18n";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  style: ["normal", "italic"],
  variable: "--font-archivo",
});

export const metadata: Metadata = {
  title: "Sobremesa Dinners",
  description:
    "Cenas pequeñas para conectar a la latina: 3 speakers, 7 a 12 estudiantes de MBA y una mesa en San Francisco o Berkeley.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = parseLang((await cookies()).get(LANG_COOKIE)?.value);
  return (
    <html lang={lang} className={archivo.variable}>
      <body>
        <LangProvider initial={lang}>{children}</LangProvider>
      </body>
    </html>
  );
}
