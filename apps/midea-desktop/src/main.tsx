import './styles.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from '@/app/App'

const root = document.getElementById('root')

if (!root) {
  throw new Error('Midea Desktop root element is missing')
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
)
