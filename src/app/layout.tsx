import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hausfest 26",
  description: "Save the date — Hausfest 2026",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        {children}
      </body>
    </html>
  );
}
