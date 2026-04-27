import { Component, type ErrorInfo, type ReactNode } from "react";
import { BackendErrorState } from "./BackendErrorState";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * App-wide error boundary. Catches render errors from any descendant
 * (including async data hooks that throw) and shows a friendly fallback
 * instead of a blank page.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface the error to the console for diagnostics, but don't crash.
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }
      return (
        <BackendErrorState
          title="صار خطأ غير متوقع"
          description="نعتذر، صادف الموقع مشكلة بعرض هاي الصفحة. جرّب إعادة التحميل أو الرجوع للرئيسية."
          error={this.state.error}
          onRetry={this.reset}
        />
      );
    }
    return this.props.children;
  }
}
