import { useEffect, useRef, useState } from 'react'
import { IconeSetaBaixo } from './Icones'

// Listas mostram 10 por vez, com "+5", "Todas" e "Recolher" (tudo animado).
export const POR_PAGINA = 10

// Controla quantas linhas aparecem e as animações de entrada/saída.
export function usePaginacao(total, reiniciarQuando) {
  const [limite, setLimite] = useState(POR_PAGINA)
  const [recolhendo, setRecolhendo] = useState(false)
  const antes = useRef(POR_PAGINA)
  const rodape = useRef(null)

  useEffect(() => { setLimite(POR_PAGINA); antes.current = POR_PAGINA }, reiniciarQuando) // eslint-disable-line react-hooks/exhaustive-deps
  // Depois de desenhar, lembra quantas já estavam na tela (só as novas animam).
  useEffect(() => { antes.current = limite }, [limite])

  const mostrando = Math.min(limite, total)
  const mais = () => setLimite((l) => Math.min(l + 5, total))
  const todas = () => setLimite(total)
  const recolher = () => {
    setRecolhendo(true)
    setTimeout(() => {
      setLimite(POR_PAGINA); setRecolhendo(false)
      requestAnimationFrame(() => rodape.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
    }, 240)
  }

  // Classe e atraso de cada linha: as que acabaram de aparecer entram deslizando, uma depois da outra.
  const linha = (i) => {
    if (recolhendo && i >= POR_PAGINA) return { className: 'linha-sai' }
    if (i >= antes.current && i < limite) return { className: 'linha-entra', style: { animationDelay: `${Math.min((i - antes.current) * 35, 350)}ms` } }
    return {}
  }

  return { limite, mostrando, total, mais, todas, recolher, linha, rodape }
}

export function MaisItens({ pag }) {
  const { mostrando, total, mais, todas, recolher, rodape } = pag
  if (total <= POR_PAGINA) return null
  const tudo = mostrando >= total
  return (
    <div className="mais-itens" ref={rodape}>
      <span className="mais-itens__conta" aria-label={`Mostrando ${mostrando} de ${total}`}>
        <strong>{mostrando}</strong>/{total}
      </span>
      <div className="mais-itens__acoes">
        {!tudo && (
          <>
            <button type="button" className="mais-itens__acao" onClick={mais}>
              <IconeSetaBaixo tamanho={16} /> +{Math.min(5, total - mostrando)}
            </button>
            <button type="button" className="mais-itens__acao" onClick={todas}>Todas</button>
          </>
        )}
        {mostrando > POR_PAGINA && (
          <button type="button" className="mais-itens__acao mais-itens__acao--recolher" onClick={recolher}>
            <IconeSetaBaixo tamanho={16} /> Recolher
          </button>
        )}
      </div>
    </div>
  )
}
