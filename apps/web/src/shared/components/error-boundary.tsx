'use client';

import { motion } from 'motion/react';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button, Card, CardContent } from './index';

// ============================================================================
// Types
// ============================================================================

type ErrorBoundaryProps = {
  readonly children: ReactNode;
  readonly fallback?: ReactNode;
  readonly onReset?: () => void;
};

type ErrorBoundaryState = {
  readonly hasError: boolean;
  readonly error: Error | null;
};

// ============================================================================
// Error Boundary Component
// ============================================================================

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo): void {}

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback error={this.state.error} onReset={this.handleReset} />
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// Error Fallback Component
// ============================================================================

type ErrorFallbackProps = {
  readonly error: Error | null;
  readonly onReset: () => void;
};

const ErrorFallback = ({
  error,
  onReset,
}: ErrorFallbackProps): React.ReactElement => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="flex items-center justify-center min-h-[200px] p-6"
  >
    <Card elevated className="max-w-md w-full">
      <CardContent className="text-center py-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', bounce: 0.5 }}
          className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center"
        >
          <svg
            className="w-8 h-8 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <title>Error</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </motion.div>
        <h2 className="text-lg font-semibold font-display text-foreground mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-muted mb-6">
          {error?.message ?? 'An unexpected error occurred'}
        </p>
        <Button onClick={onReset}>
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <title>Retry</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Try Again
        </Button>
      </CardContent>
    </Card>
  </motion.div>
);

// ============================================================================
// Page Error Fallback
// ============================================================================

export const PageErrorFallback = (): React.ReactElement => (
  <div className="page-container">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[60vh] text-center"
    >
      <div className="w-24 h-24 mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
        <svg
          className="w-12 h-12 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <title>Page Error</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h1 className="text-2xl font-display font-semibold text-foreground mb-2">
        Oops! Something went wrong
      </h1>
      <p className="text-muted max-w-md mb-8">
        We encountered an unexpected error. Please refresh the page or try again
        later.
      </p>
      <Button onClick={() => window.location.reload()} size="lg">
        <svg
          className="w-5 h-5 mr-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <title>Refresh</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        Refresh Page
      </Button>
    </motion.div>
  </div>
);
