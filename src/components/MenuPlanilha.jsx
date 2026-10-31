import { useEffect, useRef, useState } from 'react'
import { IconeBaixar, IconeEnviar, IconePlanilha } from './Icones'

// Um botão só (ícone) para a planilha: ao tocar, abre as opções Importar e Exportar.
export function MenuPlanilha({ total, aoImportar, aoExportar }) {
  const [aberto, setAberto] = useState(false)
  const caixa = useRef(null)

  useEffect(() => {
    if (!aberto) return
    const fora = (e) => { if (!caixa.current?.contains(e.target)) setAberto(false) }
    const tecla = (e) => { if (e.key === 'Escape') setAberto(false) }
    document.addEventListener('pointerdown', fora)
    window.addEventListener('keydown', tecla)
    return () => { document.removeEventListener('pointerdown', fora); window.removeEventListener('keydown', tecla) }
  }, [aberto])

  const escolher = (f) => { setAberto(false); f() }

  return (
    <div className="menu-planilha" ref={caixa}>
      <button type="button" className="botao-icone botao-icone--alto" aria-haspopup="menu" aria-expanded={aberto}
        aria-label="Planilha: importar ou exportar" title="Planilha" onClick={() => setAberto((a) => !a)}>
        <IconePlanilha tamanho={18} />
      </button>
      {aberto && (
        <div className="menu-planilha__opcoes" role="menu">
          <button type="button" role="menuitem" onClick={() => escolher(aoImportar)}>
            <IconeEnviar tamanho={18} />
            <span><strong>Importar planilha</strong><span>Reservas anotadas do WhatsApp</span></span>
          </button>
          <button type="button" role="menuitem" disabled={total === 0} onClick={() => escolher(aoExportar)}>
            <IconeBaixar tamanho={18} />
            <span><strong>Exportar planilha</strong><span>{total} {total === 1 ? 'reserva da lista' : 'reservas da lista'}</span></span>
          </button>
        </div>
      )}
    </div>
  )
}
