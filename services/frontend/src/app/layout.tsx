import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

// One family for the whole app. The width axis lets the big "38 min" use a wide cut.
const archivo = Archivo({
  variable: "--font-sans",
  subsets: ["latin"],
  axes: ["wdth"],
});

export const metadata: Metadata = {
  title: "AgroPilot",
  description: "Daily irrigation plan for each plot",
};

/** The HTML shell shared by every page. */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
