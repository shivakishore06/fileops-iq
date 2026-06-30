import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import QueryProvider from "../providers/query-provider";
import { AuthProvider } from "../providers/auth-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FileOps IQ - Enterprise File Operations & Analytics",
  description: "Monitor, track, audit, analyze, and visualize organizational file operations.",
};

import Sidebar from "../components/sidebar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0B0F19] text-white">
        <QueryProvider>
          <AuthProvider>
            <div className="flex min-h-screen w-full">
              <Sidebar />
              <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
                {children}
              </div>
            </div>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
