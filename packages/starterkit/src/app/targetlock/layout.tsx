import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./targetlock.css";

const targetlockFont = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-targetlock",
});

export const metadata: Metadata = {
  title: "TargetLock IQ",
  description:
    "Diamond drilling trajectory decision support — planned vs actual surveys, target miss, and next-interval aim.",
};

export default function TargetLockLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={targetlockFont.variable}>{children}</div>;
}
