import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./planner.css";

const targetlockFont = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-targetlock",
});

export const metadata: Metadata = {
  title: "TargetLock IQ — Hole Planner",
  description:
    "Plan standard and daughter holes before drilling — collar, target, and straight planned survey path.",
};

export default function PlannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={targetlockFont.variable}>{children}</div>;
}
