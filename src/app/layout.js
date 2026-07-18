import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SyncProvider from "@/components/SyncProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Track The Trash | CIN",
  description: "The Brand Audit Tool for Cleanup Events",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body>
        <SyncProvider />
        {children}
      </body>
    </html>
  );
}
