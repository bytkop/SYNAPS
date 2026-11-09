import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";
import "../theme.css";
import { resolveLocale } from "./i18n.js";

const localePreference = (() => { try { return localStorage.getItem("synaps-locale") || "auto"; } catch { return "auto"; } })();
document.documentElement.lang = resolveLocale(localePreference, navigator.languages?.length ? navigator.languages : [navigator.language]);

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
