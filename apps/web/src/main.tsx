import * as React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root element");
}
const real = import.meta.env.VITE_REAL_API === "true";
createRoot(root).render(
  <React.StrictMode>
    <App real={real} apiBase={import.meta.env.VITE_API_BASE ?? ""} />
  </React.StrictMode>
);
