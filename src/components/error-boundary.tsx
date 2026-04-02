'use client';

import { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  /** Section name for contextual error messages (e.g., "progress", "chip-in", "items") */
  section?: string;
  /** Compact mode — smaller UI for inline sections */
  compact?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/** Contextual error messages per section */
const SECTION_MESSAGES: Record<string, { emoji: string; title: string; hint: string }> = {
  progress: {
    emoji: '📊',
    title: 'Couldn\'t load the progress bar',
    hint: 'The bill total and payment data should still be fine.',
  },
  'chip-in': {
    emoji: '💳',
    title: 'Payment section hit a snag',
    hint: 'Try refreshing — your payment info is safe.',
  },
  items: {
    emoji: '🍽️',
    title: 'Item list couldn\'t load',
    hint: 'The items are still saved. A refresh should fix this.',
  },
  contributions: {
    emoji: '👥',
    title: 'Couldn\'t load contributions',
    hint: 'All payments are recorded — this is just a display glitch.',
  },
};

const DEFAULT_MESSAGE = {
  emoji: '😵',
  title: 'Something went wrong',
  hint: 'Don\'t worry — your data is safe. Try refreshing or tap below.',
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const msg = (this.props.section && SECTION_MESSAGES[this.props.section]) || DEFAULT_MESSAGE;
      const isCompact = this.props.compact ?? !!this.props.section;

      if (isCompact) {
        return (
          <div className="rounded-2xl border border-border bg-card p-5 text-center space-y-2">
            <div className="text-2xl">{msg.emoji}</div>
            <p className="text-sm font-medium text-foreground">{msg.title}</p>
            <p className="text-xs text-muted-foreground">{msg.hint}</p>
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-muted text-foreground font-medium text-xs hover:bg-muted/80 transition-colors min-h-[36px]"
            >
              🔄 Retry
            </button>
          </div>
        );
      }

      return (
        <div className="min-h-[40vh] flex items-center justify-center p-6">
          <div className="text-center space-y-4 max-w-sm">
            <div className="text-5xl">{msg.emoji}</div>
            <h2 className="text-xl font-bold font-[family-name:var(--font-main)]">
              {msg.title}
            </h2>
            <p className="text-muted-foreground text-sm">
              {msg.hint}
            </p>
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors min-h-[44px]"
            >
              🔄 Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
