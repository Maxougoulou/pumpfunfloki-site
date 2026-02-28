import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// --- reCAPTCHA v3 loader (safe) ---
const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

// Expose a small helper you can call anywhere: window.pffGetCaptchaToken("submit_quest")
function setupRecaptchaV3(siteKey) {
  if (!siteKey) return;

  // Avoid injecting multiple times (HMR / refresh)
  if (document.getElementById("pff-recaptcha")) return;

  // Create a global promise to wait for grecaptcha
  if (!window.__pffRecaptchaReady) {
    window.__pffRecaptchaReady = new Promise((resolve) => {
      window.__pffRecaptchaResolve = resolve;
    });
  }

  const s = document.createElement("script");
  s.id = "pff-recaptcha";
  s.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
  s.async = true;
  s.defer = true;

  s.onload = () => {
    // Wait until grecaptcha is actually ready
    if (window.grecaptcha && window.grecaptcha.ready) {
      window.grecaptcha.ready(() => {
        if (window.__pffRecaptchaResolve) window.__pffRecaptchaResolve(true);
      });
    } else {
      // fallback: resolve anyway
      if (window.__pffRecaptchaResolve) window.__pffRecaptchaResolve(true);
    }
  };

  document.head.appendChild(s);

  // Helper to get token
  window.pffGetCaptchaToken = async (action = "default") => {
    try {
      if (!siteKey) return null;
      if (!window.__pffRecaptchaReady) return null;

      await window.__pffRecaptchaReady;

      if (!window.grecaptcha || !window.grecaptcha.execute) return null;

      const token = await window.grecaptcha.execute(siteKey, { action });
      return token;
    } catch {
      return null;
    }
  };
}

setupRecaptchaV3(siteKey);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);