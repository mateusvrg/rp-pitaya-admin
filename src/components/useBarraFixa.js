import { useEffect, useRef, useState } from 'react'

// Diz quando a barra de busca/filtros "grudou" no topo (a pessoa rolou a lista para baixo).
// Usa um marcador invisível colocado logo antes da barra: quando ele passa da linha do topo, a barra está presa.
// No celular, presa = mostra só a busca + setinha; a setinha abre os filtros completos de novo.
export function useBarraFixa() {
  const sentinela = useRef(null)
  const [presa, setPresa] = useState(false)
  const [aberta, setAberta] = useState(false)

  useEffect(() => {
    let quadro = 0
    const medir = () => {
      quadro = 0
      const el = sentinela.current
      if (!el) return
      // Altura de tudo que fica fixo em cima (faixa de teste + barra do celular).
      const topo = parseFloat(getComputedStyle(el).getPropertyValue('--topo-fixo')) || 0
      const agora = el.getBoundingClientRect().top < topo - 1
      setPresa((antes) => (antes === agora ? antes : agora))
      if (!agora) setAberta(false)
    }
    const aoRolar = () => { if (!quadro) quadro = requestAnimationFrame(medir) }
    medir()
    window.addEventListener('scroll', aoRolar, { passive: true })
    window.addEventListener('resize', aoRolar)
    return () => { window.removeEventListener('scroll', aoRolar); window.removeEventListener('resize', aoRolar); cancelAnimationFrame(quadro) }
  }, [])

  return { sentinela, presa, aberta, alternar: () => setAberta((a) => !a) }
}
