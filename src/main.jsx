import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
if (siteKey && !document.getElementById("pff-recaptcha")) {
  const s = document.createElement("script");
  s.id = "pff-recaptcha";
  s.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
  s.async = true;
  document.head.appendChild(s);
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
