import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import ErrorBoundary from "./shared/ui/ErrorBoundary";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { LocalizationProvider } from "./context/LocalizationContext";
import { initErrorReporting } from "./lib/errorReporter";
import "./styles.css";

initErrorReporting();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary name="root">
      <BrowserRouter>
        <AuthProvider>
          <LocalizationProvider>
            <CartProvider>
              <App />
            </CartProvider>
          </LocalizationProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
