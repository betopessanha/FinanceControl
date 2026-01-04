
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

// System Diagnostic Log
console.log("%c TRUCKING.IO SYSTEM START ", "background: #000; color: #fff; font-weight: bold; padding: 4px; border-radius: 4px;");
console.log("Environment Check:", {
    apiKeyPresent: !!(window.process?.env?.API_KEY || (window as any).VITE_API_KEY),
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString()
});

if (!rootElement) {
  console.error("Critical: Could not find root element to mount to");
} else {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error("FATAL: Application Rendering Error", error);
    rootElement.innerHTML = `
      <div style="padding: 60px 40px; text-align: center; font-family: 'Plus Jakarta Sans', sans-serif; background: #fff; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center;">
        <div style="background: #fef2f2; border: 1px solid #fee2e2; padding: 32px; border-radius: 24px; max-width: 480px; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
            <h2 style="color: #000; font-weight: 800; margin-bottom: 16px; letter-spacing: -0.04em;">System Boot Failure</h2>
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">The accounting engine encountered a critical error during initialization. This may be due to a missing API_KEY or a network restriction in your current environment.</p>
            <button onclick="window.location.reload()" style="padding: 14px 32px; background: #000; color: #fff; border: none; border-radius: 12px; font-weight: 800; cursor: pointer; transition: transform 0.2s;">Force System Reboot</button>
            <p style="margin-top: 24px; font-size: 10px; color: #9ca3af; font-family: monospace;">ERR_CODE: APP_RENDER_FAIL</p>
        </div>
      </div>
    `;
  }
}
