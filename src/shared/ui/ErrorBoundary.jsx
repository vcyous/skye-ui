import { Component } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reportError } from "../../lib/errorReporter";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    reportError(error, {
      componentStack: info?.componentStack,
      boundary: this.props.name || "root",
    });
  }

  handleReset = () => {
    this.setState({ error: null });
    if (typeof this.props.onReset === "function") {
      this.props.onReset();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    if (typeof this.props.fallback === "function") {
      return this.props.fallback(this.state.error, this.handleReset);
    }

    const isDev = import.meta.env.DEV;

    return (
      <div className="p-6">
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-12 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="size-8" />
          </div>
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <p className="text-sm text-muted-foreground">
            {isDev && this.state.error?.message
              ? this.state.error.message
              : "An unexpected error occurred. Try reloading the page."}
          </p>
          <div className="flex gap-2">
            <Button onClick={this.handleReload}>Reload</Button>
            <Button variant="outline" onClick={this.handleReset}>
              Try again
            </Button>
          </div>
        </div>
        {isDev && this.state.error?.stack ? (
          <pre className="mt-4 max-h-80 overflow-auto rounded-lg border bg-muted p-4 text-xs">
            {this.state.error.stack}
          </pre>
        ) : null}
      </div>
    );
  }
}
