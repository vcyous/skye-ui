import { Button, Result } from "antd";
import { Component } from "react";
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
      <div style={{ padding: 24 }}>
        <Result
          status="500"
          title="Something went wrong"
          subTitle={
            isDev && this.state.error?.message
              ? this.state.error.message
              : "An unexpected error occurred. Try reloading the page."
          }
          extra={[
            <Button key="reload" type="primary" onClick={this.handleReload}>
              Reload
            </Button>,
            <Button key="retry" onClick={this.handleReset}>
              Try again
            </Button>,
          ]}
        />
        {isDev && this.state.error?.stack ? (
          <pre
            style={{
              marginTop: 16,
              padding: 16,
              background: "var(--paper, #fafafa)",
              border: "1px solid var(--line, #eee)",
              borderRadius: 8,
              fontSize: 12,
              overflow: "auto",
              maxHeight: 320,
            }}
          >
            {this.state.error.stack}
          </pre>
        ) : null}
      </div>
    );
  }
}
