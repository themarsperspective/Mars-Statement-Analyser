import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import BackgroundMotif from "@/components/BackgroundMotif";
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
  title: "Mars Statement Analyser",
  description: "Extract and review merchant statement data",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-neutral-900">
        <BackgroundMotif />
        <header className="border-b border-neutral-200 bg-white relative z-10">
          <div className="mx-auto max-w-5xl px-4 sm:px-8 py-4 sm:py-5 flex flex-wrap items-center justify-between gap-y-3 gap-x-4">
            <Link href="/" className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/tmp-mark.png"
                alt=""
                className="h-7 w-7 sm:h-9 sm:w-9 object-contain shrink-0"
              />
              <span className="text-sm sm:text-[15px] font-medium tracking-tight text-neutral-900 whitespace-nowrap">
                Mars Statement Analyser
              </span>
            </Link>
            <nav className="flex gap-4 sm:gap-8 text-xs font-medium uppercase tracking-wide text-neutral-500">
              <Link href="/" className="hover:text-neutral-900 transition-colors whitespace-nowrap">
                New Analysis
              </Link>
              <Link href="/business-club" className="hover:text-neutral-900 transition-colors whitespace-nowrap">
                Business Club
              </Link>
              <Link href="/statements" className="hover:text-neutral-900 transition-colors whitespace-nowrap">
                All Statements
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1 relative z-10">{children}</main>
      </body>
    </html>
  );
}
