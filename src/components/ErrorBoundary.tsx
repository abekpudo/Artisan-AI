import * as React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State;
  props: Props;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
    this.props = props;
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    (this as any).setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-3xl shadow-xl border border-stone-100">
            <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center text-red-600 mx-auto">
              <AlertTriangle size={32} />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-stone-900">Abeg, something went wrong!</h1>
              <p className="text-stone-500 text-sm leading-relaxed">
                The app encounter a small problem. No vex, just click the button below to refresh.
              </p>
              {this.state.error && (
                <div className="mt-4 p-3 bg-stone-50 rounded-xl text-xs font-mono text-stone-400 break-all">
                  {this.state.error.message}
                </div>
              )}
            </div>
            <button
              onClick={this.handleReset}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-orange-600 text-white font-bold rounded-2xl hover:bg-orange-700 transition-all shadow-lg shadow-orange-200"
            >
              <RefreshCw size={20} />
              Refresh App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
