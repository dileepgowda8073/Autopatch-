import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Detect and store reduced-motion preference before first render
const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
document.documentElement.dataset.reducedMotion = String(mql.matches)
mql.addEventListener('change', e => {
  document.documentElement.dataset.reducedMotion = String(e.matches)
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
