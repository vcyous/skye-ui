import "antd/dist/reset.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { LocalizationProvider } from "./context/LocalizationContext";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <LocalizationProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </LocalizationProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
