import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import ErrorBoundary from './components/common/ErrorBoundary.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '12px',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            fontWeight: '500',
          },
          success: {
            style: { background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' },
            iconTheme: { primary: '#10b981', secondary: '#ecfdf5' },
          },
          error: {
            style: { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' },
            iconTheme: { primary: '#ef4444', secondary: '#fef2f2' },
          },
        }}
      />
    </ErrorBoundary>
  </React.StrictMode>,
)

