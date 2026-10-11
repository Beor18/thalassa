import type { Viewport } from "next";
import { Alegreya_Sans, Cinzel } from "next/font/google";
import { MotionRoot } from "@/components/motion/motion-root";
import { I18nProvider } from "@/i18n/client";
import { LOCALES } from "@/i18n/config";
import { toLocale } from "@/i18n/i18n";
import { rootMetadata } from "@/lib/seo";
import "../globals.css";

const display = Cinzel({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "700", "900"],
});

const body = Alegreya_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
});

export const generateMetadata = rootMetadata;

export const viewport: Viewport = {
  themeColor: "#0b2a4a",
};

/** Every page exists in each language; the proxy picks one per request (cookie, English by default). */
export async function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const lang = toLocale((await params).lang);
  return (
    <html lang={lang} className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <I18nProvider lang={lang}>
          <MotionRoot>{children}</MotionRoot>
        </I18nProvider>
      </body>
    </html>
  );
}
