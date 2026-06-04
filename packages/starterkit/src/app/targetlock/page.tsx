"use client";

import TargetLockApp from "./TargetLockApp";
import { TargetLockConfirmProvider } from "@/components/targetlock/TargetLockConfirmProvider";
import { TargetLockErrorBoundary } from "@/components/targetlock/TargetLockErrorBoundary";

export default function TargetLockPage() {
  return (
    <TargetLockConfirmProvider>
      <TargetLockErrorBoundary>
        <TargetLockApp />
      </TargetLockErrorBoundary>
    </TargetLockConfirmProvider>
  );
}
