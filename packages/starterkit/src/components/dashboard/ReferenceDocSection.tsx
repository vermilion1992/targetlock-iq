"use client";

import type { ReactNode } from "react";
import { InfoTip } from "@/components/layout/InfoTip";

export type ReferenceDocSectionVariant =
  | "default"
  | "field"
  | "integration"
  | "caution"
  | "highlight";

type Props = {
  title: string;
  titleTip?: string;
  variant?: ReferenceDocSectionVariant;
  badge?: string;
  children: ReactNode;
};

export function ReferenceDocSection({
  title,
  titleTip,
  variant = "default",
  badge,
  children,
}: Props) {
  return (
    <section className={`targetlock-ref-section targetlock-ref-section--${variant}`}>
      <div className="targetlock-ref-section-head">
        {badge ? <span className="targetlock-ref-badge">{badge}</span> : null}
        <h3>
          {title}
          {titleTip ? (
            <>
              {" "}
              <InfoTip tip={titleTip} />
            </>
          ) : null}
        </h3>
      </div>
      <div className="targetlock-ref-section-body">{children}</div>
    </section>
  );
}
