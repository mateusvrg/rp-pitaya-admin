import { useEffect, useRef, useState } from 'react'
import { IconeFiltro, IconeSetaBaixo } from './Icones'

// No celular, os filtros viram um botão "Filtros". Ao tocar, as opções aparecem como botões
// flutuando no lado esquerdo da tela, logo abaixo do botão (com o fundo levemente escurecido). Tocar fora fecha.
// No computador este botão fica escondido e aparecem os segmentos normais.
// variante="seta": só um botão com setinha (fica ao lado da busca, que continua fixa ao rolar a tela).
export function FiltroCelular({ titulo = 'Filtrar', opcoes, valor, aoEscolher, variante }) {
  const [topo, setTopo] = useState(null) // posição (px) onde começa a pilha de botões; null = fechado
  const ref = useRef(null)
  const botao = useRef(null)
  const atual = opcoes.find((o) => o.id === valor)
  const aberto = topo != null

  useEffect(() => {
    const d = ref.current
    if (aberto && !d.open) d.showModal()
    if (!aberto && d.open) d.close()
  }, [aberto])

  // Abre logo abaixo do botão; se não couber até a barra de baixo, sobe o necessário.
  const abrir = () => {
    const alturaPilha = opcoes.length * 52
    const limite = window.innerHeight - 88 - alturaPilha
    setTopo(Math.max(16, Math.min(botao.current.getBoundingClientRect().bottom + 8, limite)))
  }
  const fechar = () => setTopo(null)
  const escolher = (id) => { aoEscolher(id); fechar() }

  return (
    <>
      {variante === 'seta' ? (
        <button ref={botao} type="button" className="filtro-seta" aria-haspopup="dialog" aria-expanded={aberto} onClick={abrir}
          aria-label={`Filtros (${atual?.nome ?? ''})`} title="Filtros">
          <IconeSetaBaixo tamanho={18} />
        </button>
      ) : (
        <button ref={botao} type="button" className="filtro-celular" aria-haspopup="dialog" aria-expanded={aberto} onClick={abrir}>
          <IconeFiltro tamanho={16} />
          <span>Filtros</span>
          {atual && <span className="filtro-celular__atual">{atual.nome}<span className="segmento__qtd">{atual.qtd}</span></span>}
        </button>
      )}

      <dialog ref={ref} className="filtros-flutuantes" aria-label={titulo} onClose={fechar}
        onClick={(e) => { if (e.target === ref.current) fechar() }}>
        <div className="filtros-flutuantes__pilha" style={{ top: topo ?? 0 }} onClick={(e) => { if (e.target === e.currentTarget) fechar() }}>
          {aberto && opcoes.map((o, i) => (
            <button key={o.id} type="button" className="filtros-flutuantes__opcao" aria-pressed={o.id === valor}
              style={{ animationDelay: `${i * 25}ms` }} onClick={() => escolher(o.id)}>
              <span>{o.nome}</span><span className="segmento__qtd">{o.qtd}</span>
            </button>
          ))}
        </div>
      </dialog>
    </>
  )
}
