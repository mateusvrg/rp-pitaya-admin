// Tema do painel: 'auto' segue o aparelho; 'claro' e 'escuro' fixam.
const CHAVE = 'rp-admin-tema'
export const TEMAS = ['auto', 'claro', 'escuro']

export function lerTema() {
  try { return TEMAS.includes(localStorage.getItem(CHAVE)) ? localStorage.getItem(CHAVE) : 'auto' } catch { return 'auto' }
}

export function aplicarTema(tema) {
  const raiz = document.documentElement
  if (tema === 'auto') raiz.removeAttribute('data-theme')
  else raiz.setAttribute('data-theme', tema === 'escuro' ? 'dark' : 'light')
  try { localStorage.setItem(CHAVE, tema) } catch { /* sem armazenamento: vale só agora */ }
}
