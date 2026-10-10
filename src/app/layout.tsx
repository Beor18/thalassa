import type { Viewport } from "next";
import { Alegreya_Sans, Cinzel } from "next/font/google";
import { MotionRoot } from "@/components/motion/motion-root";
import { rootMetadata } from "@/lib/seo";
import "./globals.css";

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

export const metadata = rootMetadata;

export const viewport: Viewport = {
  themeColor: "#0b2a4a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <MotionRoot>{children}</MotionRoot>
      </body>
    </html>
  );
}
