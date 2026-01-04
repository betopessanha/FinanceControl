
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

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
    console.error("Application Rendering Error:", error);
    rootElement.innerHTML = `
      <div style="padding: 40px; text-align: center; font-family: sans-serif;">
        <h2 style="color: #f43f5e;">Application Loading Error</h2>
        <p>There was a problem initializing the app. Please check the browser console for details.</p>
        <button onclick="window.location.reload()" style="padding: 10px 20px; background: #000; color: #fff; border: none; border-radius: 8px; cursor: pointer;">Reload Application</button>
      </div>
    `;
  }
}
