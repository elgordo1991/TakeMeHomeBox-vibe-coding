import React from 'react';

interface State {
  error: Error | null;
}

// Catches render crashes so the app shows a friendly message instead of a blank page.
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('💥 App crashed:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas p-6">
        <div className="card-dark w-full max-w-sm p-8 text-center">
          <div className="mb-4 text-6xl">📦💥</div>
          <h1 className="mb-2 text-2xl">Something went wrong</h1>
          <p className="mb-6 text-muted">
            Sorry, that page hit a snag. Reloading usually sorts it out.
          </p>
          <button onClick={() => window.location.assign('/map')} className="btn-primary w-full">
            Back to the map
          </button>
          <p className="mt-4 break-words text-xs text-subtle">{this.state.error.message}</p>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
