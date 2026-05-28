import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[EcoTrack Error Boundary]', error, errorInfo);
  }

  override render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-sans p-6 text-center">
          <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl max-w-md space-y-5 shadow-2xl">
            <div className="w-16 h-16 mx-auto bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center">
              <svg
                className="w-8 h-8 text-rose-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>

            <h2 className="text-lg font-bold text-white">
              Something went wrong
            </h2>

            <p className="text-sm text-slate-400 leading-relaxed">
              An unexpected error occurred in the application. Please try again or contact support if the issue persists.
            </p>

            {this.state.error && (
              <pre className="text-xs text-rose-300/70 bg-rose-500/5 border border-rose-500/10 rounded-xl p-3 text-left overflow-x-auto max-h-24">
                {this.state.error.message}
              </pre>
            )}

            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => { this.setState({ hasError: false, error: null }); }}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-all cursor-pointer"
              >
                Try Again
              </button>
              <button
                onClick={() => { window.location.reload(); }}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-sm transition-all cursor-pointer border border-slate-700"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
