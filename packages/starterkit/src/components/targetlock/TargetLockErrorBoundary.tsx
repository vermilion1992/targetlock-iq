"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { confirmResetAllLocalData } from "@/lib/drilling/confirm-actions";
import { clearLibrary } from "@/lib/drilling/storage";
import { TARGETLOCK_APP_VERSION } from "@/lib/drilling/app-version";
import { targetLockConfirm } from "./TargetLockConfirmProvider";

type Props = {
  children: ReactNode;
  onLoadSample?: () => void;
};

type State = {
  error: Error | null;
};

export class TargetLockErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("TargetLock error boundary:", error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetAll = async () => {
    if (!(await targetLockConfirm(confirmResetAllLocalData()))) return;
    clearLibrary();
    window.location.reload();
  };

  private handleLoadSample = () => {
    this.setState({ error: null });
    this.props.onLoadSample?.();
  };

  render() {
    if (!this.state.error) return this.props.children;

    const message = this.state.error.message || "An unexpected error occurred.";

    return (
      <div className="targetlock-app targetlock-error-boundary flex min-h-screen items-center justify-center p-6">
        <div className="targetlock-panel max-w-lg w-full" role="alert">
          <h1 className="text-lg font-semibold m-0">TargetLock needs to recover</h1>
          <p className="targetlock-helper mt-2">
            Something went wrong while running the app. Your hole data may still be in browser
            storage — try reloading first. If the problem continues, reset local data or load the
            sample hole.
          </p>
          <p className="targetlock-error-detail text-xs text-[var(--tl-muted)] mt-3 font-mono break-words">
            {message}
          </p>
          <div className="targetlock-btn-row mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="targetlock-btn targetlock-btn-primary"
              onClick={this.handleReload}
            >
              Reload page
            </button>
            {this.props.onLoadSample ? (
              <button
                type="button"
                className="targetlock-btn"
                onClick={this.handleLoadSample}
              >
                Load sample hole
              </button>
            ) : null}
            <button
              type="button"
              className="targetlock-btn targetlock-btn-secondary"
              onClick={() => void this.handleResetAll()}
            >
              Reset all local TargetLock data
            </button>
          </div>
          <p className="targetlock-version-tag mt-4 mb-0">{TARGETLOCK_APP_VERSION}</p>
        </div>
      </div>
    );
  }
}
