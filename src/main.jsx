import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App.jsx'
import { aplicarTema, lerTema } from './lib/tema'

// Ambiente de teste: título e ícone da aba diferentes (pitaya laranja), para não confundir com o oficial.
if (import.meta.env.VITE_AMBIENTE === 'teste') {
  document.title = 'Admin Teste'
  document.querySelector('link[rel="icon"]')?.setAttribute('href', '/admin-favicon-teste.svg')
}

aplicarTema(lerTema())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
