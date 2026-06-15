"use client";

import { Suspense } from "react";
import { TargetLockConfirmProvider } from "@/components/targetlock/TargetLockConfirmProvider";
import { TargetLockErrorBoundary } from "@/components/targetlock/TargetLockErrorBoundary";
import PlannerApp from "./PlannerApp";

export default function PlannerPage() {
  return (
    <TargetLockConfirmProvider>
      <TargetLockErrorBoundary>
        <Suspense fallback={<p className="targetlock-panel-copy">Loading planner…</p>}>
          <PlannerApp />
        </Suspense>
      </TargetLockErrorBoundary>
    </TargetLockConfirmProvider>
  );
}
