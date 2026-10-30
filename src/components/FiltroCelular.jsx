import { useEffect, useRef, useState } from 'react'
import { IconeFechar, IconeFiltro } from './Icones'

// No celular, os filtros viram um botão "Filtros" que abre a lista de opções por cima da tela.
// No computador este botão fica escondido e aparecem os segmentos normais.
export function FiltroCelular({ titulo = 'Filtrar', opcoes, valor, aoEscolher }) {
  const [aberto, setAberto] = useState(false)
  const ref = useRef(null)
  const atual = opcoes.find((o) => o.id === valor)

  useEffect(() => {
    const d = ref.current
    if (aberto && !d.open) d.showModal()
    if (!aberto && d.open) d.close()
  }, [aberto])

  const escolher = (id) => { aoEscolher(id); setAberto(false) }

  return (
    <>
      <button type="button" className="filtro-celular" aria-haspopup="dialog" onClick={() => setAberto(true)}>
        <IconeFiltro tamanho={16} />
        <span>Filtros</span>
        {atual && <span className="filtro-celular__atual">{atual.nome}<span className="segmento__qtd">{atual.qtd}</span></span>}
      </button>

      <dialog ref={ref} className="folha-filtros" aria-label={titulo} onClose={() => setAberto(false)}
        onClick={(e) => { if (e.target === ref.current) setAberto(false) }}>
        <div className="folha-filtros__caixa">
          <div className="folha-filtros__topo">
            <h2>{titulo}</h2>
            <button type="button" className="botao-fantasma" onClick={() => setAberto(false)} aria-label="Fechar filtros"><IconeFechar /></button>
          </div>
          <div className="folha-filtros__opcoes">
            {opcoes.map((o) => (
              <button key={o.id} type="button" className="folha-filtros__opcao" aria-pressed={o.id === valor} onClick={() => escolher(o.id)}>
                <span>{o.nome}</span><span className="segmento__qtd">{o.qtd}</span>
              </button>
            ))}
          </div>
        </div>
      </dialog>
    </>
  )
}
