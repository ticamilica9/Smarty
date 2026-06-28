import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { TRPCProvider } from "@/components/providers/trpc-provider";
import { CartProvider } from "@/components/cart/cart-provider";
import { NotificationProvider } from "@/components/notifications/notification-provider";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Smarty - Platforma de cumparare si vanzare",
  description:
    "Platforma de cumparare si vanzare produse second-hand, noi si colectii limitate.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ro"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TRPCProvider><SessionProvider><CartProvider><NotificationProvider>{children}</NotificationProvider></CartProvider></SessionProvider></TRPCProvider>
        <Toaster />
      </body>
    </html>
  );
}
