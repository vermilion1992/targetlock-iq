"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { TargetLockConfirmModal } from "./TargetLockConfirmModal";
import type { TargetLockConfirmRequest } from "@/lib/drilling/confirm-actions";

type Pending = TargetLockConfirmRequest & {
  resolve: (confirmed: boolean) => void;
};

type ContextValue = {
  confirm: (request: TargetLockConfirmRequest) => Promise<boolean>;
};

const TargetLockConfirmContext = createContext<ContextValue | null>(null);

let confirmBridge: ((request: TargetLockConfirmRequest) => Promise<boolean>) | null =
  null;

/** For class components (e.g. error boundary) outside the React confirm hook. */
export async function targetLockConfirm(
  request: TargetLockConfirmRequest
): Promise<boolean> {
  if (confirmBridge) return confirmBridge(request);
  const lines = [request.title, request.description, ...(request.details ?? [])];
  if (request.notice) lines.push(request.notice);
  return window.confirm(lines.filter(Boolean).join("\n\n"));
}

export function TargetLockConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback((request: TargetLockConfirmRequest) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...request, resolve });
    });
  }, []);

  useEffect(() => {
    confirmBridge = confirm;
    return () => {
      confirmBridge = null;
    };
  }, [confirm]);

  const finish = useCallback((confirmed: boolean) => {
    setPending((current) => {
      current?.resolve(confirmed);
      return null;
    });
  }, []);

  return (
    <TargetLockConfirmContext.Provider value={{ confirm }}>
      {children}
      {pending ? (
        <TargetLockConfirmModal
          title={pending.title}
          description={pending.description}
          details={pending.details}
          notice={pending.notice}
          confirmLabel={pending.confirmLabel}
          cancelLabel={pending.cancelLabel}
          variant={pending.variant}
          onConfirm={() => finish(true)}
          onCancel={() => finish(false)}
        />
      ) : null}
    </TargetLockConfirmContext.Provider>
  );
}

export function useTargetLockConfirm(): ContextValue {
  const ctx = useContext(TargetLockConfirmContext);
  if (!ctx) {
    throw new Error("useTargetLockConfirm must be used within TargetLockConfirmProvider");
  }
  return ctx;
}
