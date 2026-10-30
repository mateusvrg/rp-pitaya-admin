import { useEffect, useRef, useState } from 'react'

// Celular: arrastar o dedo para o lado troca de aba (Dashboard ⇄ Reservas ⇄ Variedades).
// Dedo para a esquerda = aba da direita; dedo para a direita = aba da esquerda.
// O conteúdo acompanha o dedo um pouco enquanto arrasta, e a aba nova entra deslizando.
const LIMITE = 70 // px de arrasto para trocar de aba
const IGNORAR = '.segmentos, .periodos, .linha-grafico, input, textarea, select, .calendario, .calendario-fundo, .filtros-flutuantes, dialog'

export function useDeslizarAbas(abas, abaAtual, irPara) {
  const area = useRef(null)
  const [arrasto, setArrasto] = useState(0)
  const [entrada, setEntrada] = useState(null) // 'direita' | 'esquerda' | null
  const anterior = useRef(abaAtual)

  // Toda troca de aba (por arrasto ou pelos botões de baixo) entra deslizando do lado certo.
  useEffect(() => {
    const de = abas.indexOf(anterior.current)
    const para = abas.indexOf(abaAtual)
    anterior.current = abaAtual
    if (de === -1 || para === -1 || de === para) return
    setEntrada(para > de ? 'direita' : 'esquerda')
    const t = setTimeout(() => setEntrada(null), 320)
    return () => clearTimeout(t)
  }, [abaAtual, abas])

  // Valores mais recentes guardados em ref: assim os ouvintes de toque são registrados uma vez só
  // e não perdem o começo do arrasto quando a tela redesenha.
  const atual = useRef({ abas, abaAtual, irPara })
  atual.current = { abas, abaAtual, irPara }

  useEffect(() => {
    // Ouve a tela toda (não só o conteúdo), para funcionar também nas partes vazias.
    const el = document
    const celular = window.matchMedia('(max-width: 959px)')
    let inicio = null // { x, y, t, horizontal }

    const bloqueado = (alvo) =>
      !celular.matches
      || alvo.closest(IGNORAR)
      || document.querySelector('.reservas--com-detalhe, .reservas--selecionando, dialog[open], .calendario')

    const comecar = (e) => {
      if (e.touches.length !== 1 || !e.target.closest?.('.painel') || bloqueado(e.target)) { inicio = null; return }
      inicio = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now(), horizontal: null }
    }
    const mover = (e) => {
      if (!inicio) return
      const dx = e.touches[0].clientX - inicio.x
      const dy = e.touches[0].clientY - inicio.y
      if (inicio.horizontal === null && Math.hypot(dx, dy) > 12) inicio.horizontal = Math.abs(dx) > Math.abs(dy) * 1.4
      if (!inicio.horizontal) return
      const { abas, abaAtual } = atual.current
      const i = abas.indexOf(abaAtual)
      const temVizinha = dx < 0 ? i < abas.length - 1 : i > 0
      setArrasto(dx * (temVizinha ? 0.35 : 0.12)) // nas pontas só "estica" um pouco
    }
    const terminar = (e) => {
      if (!inicio) return
      const dx = (e.changedTouches[0]?.clientX ?? inicio.x) - inicio.x
      const foiHorizontal = inicio.horizontal
      inicio = null
      setArrasto(0)
      if (!foiHorizontal || Math.abs(dx) < LIMITE) return
      const { abas, abaAtual, irPara } = atual.current
      const i = abas.indexOf(abaAtual)
      const destino = abas[dx < 0 ? i + 1 : i - 1]
      if (destino) irPara(destino)
    }

    el.addEventListener('touchstart', comecar, { passive: true })
    el.addEventListener('touchmove', mover, { passive: true })
    el.addEventListener('touchend', terminar, { passive: true })
    el.addEventListener('touchcancel', terminar, { passive: true })
    return () => {
      el.removeEventListener('touchstart', comecar)
      el.removeEventListener('touchmove', mover)
      el.removeEventListener('touchend', terminar)
      el.removeEventListener('touchcancel', terminar)
    }
  }, [])

  const estilo = arrasto
    ? { transform: `translateX(${arrasto}px)`, opacity: 1 - Math.min(Math.abs(arrasto) / 400, 0.3), transition: 'none' }
    : undefined
  const classe = entrada ? `aba-entra-${entrada}` : ''
  return { area, estilo, classe }
}
