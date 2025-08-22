"use client";

import { useBackendHealth } from "@/hooks/useBackendHealth";

interface BackendHealthCheckerProps {
  onHealthStatusChange?: (isHealthy: boolean, isChecking: boolean) => void;
  children?: React.ReactNode;
}

/**
 * Backend health monitoring component that displays appropriate states
 * Uses the useBackendHealth hook for monitoring and retry logic
 */
export function BackendHealthChecker({
  onHealthStatusChange,
  children,
}: BackendHealthCheckerProps) {
  const { isBackendReady, isCheckingBackend, checkBackendHealth } =
    useBackendHealth();

  // Notify parent of health status changes
  React.useEffect(() => {
    if (onHealthStatusChange) {
      onHealthStatusChange(isBackendReady, isCheckingBackend);
    }
  }, [isBackendReady, isCheckingBackend, onHealthStatusChange]);

  // Show loading screen while checking backend
  if (isCheckingBackend) {
    return <BackendLoadingScreen />;
  }

  // Show error screen if backend is not ready
  if (!isBackendReady) {
    return <BackendErrorScreen onRetry={checkBackendHealth} />;
  }

  // Render children if backend is ready
  return <>{children}</>;
}

/**
 * Loading screen component shown while backend is starting up
 */
function BackendLoadingScreen() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border rounded-lg p-6 shadow-sm">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-semibold text-foreground">
            Connecting to Backend
          </h1>

          <div className="flex flex-col items-center space-y-3">
            <div className="w-8 h-8 border-2 border-muted-foreground border-t-primary rounded-full animate-spin"></div>

            <div className="space-y-1">
              <p className="text-muted-foreground">
                Waiting for backend to be ready...
              </p>
              <p className="text-sm text-muted-foreground/70">
                This may take a moment on first startup
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Error screen component shown when backend is unavailable
 */
function BackendErrorScreen({ onRetry }: { onRetry: () => Promise<boolean> }) {
  const handleRetry = () => {
    onRetry().catch((error) => {
      console.error("Retry failed:", error);
    });
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border rounded-lg p-6 shadow-sm">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-destructive">Backend Unavailable</h2>
          <p className="text-muted-foreground">
            Unable to connect to backend services
          </p>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    </div>
  );
}

// Need to import React for useEffect
import React from "react";
