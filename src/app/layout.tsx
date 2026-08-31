import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { BannerInstalacionPwa } from "@/components/pwa/BannerInstalacionPwa";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nodexa Core — Catálogo Web",
  description: "Plataforma de Catálogo Web y Pedidos en línea",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <BannerInstalacionPwa />
      </body>
    </html>
  );
}
