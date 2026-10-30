import { useEffect, useMemo, useState } from 'react'
import { STATUS, nomeStatus } from '../lib/dados'
import { baixarCsv } from '../lib/csv'
import { dataHora, reais, resumoItens, semAcento } from '../lib/formato'
import { DetalheReserva } from './DetalheReserva'
import { AcoesEmMassa } from './AcoesEmMassa'
import { IconeBaixar, IconeBusca, IconeReservas } from './Icones'

export function Selo({ status }) {
  return <span className={`selo selo--${status}`}><span className="selo__ponto" aria-hidden="true" />{nomeStatus(status)}</span>
}

export function Reservas({ reservas, filtroInicial, selecionada, aoSelecionar, aoAtualizar }) {
  const [filtro, setFiltro] = useState(filtroInicial ?? 'ativas')
  const [busca, setBusca] = useState('')
  const [recado, setRecado] = useState('')
  const [marcadas, setMarcadas] = useState(() => new Set())
  const [acoesAbertas, setAcoesAbertas] = useState(false) // celular: painel de ações em tela cheia

  // Trocar de filtro ou buscar limpa a seleção, para não agir em reservas que não estão na tela.
  useEffect(() => { setMarcadas(new Set()) }, [filtro, busca])
  useEffect(() => { if (marcadas.size === 0) setAcoesAbertas(false) }, [marcadas])

  useEffect(() => {
    if (!recado) return
    const t = setTimeout(() => setRecado(''), 3500)
    return () => clearTimeout(t)
  }, [recado])

  const contagem = useMemo(() => {
    const c = Object.fromEntries(STATUS.map((s) => [s.id, 0]))
    reservas.forEach((r) => { c[r.status] = (c[r.status] ?? 0) + 1 })
    return c
  }, [reservas])

  const filtros = [
    { id: 'ativas', nome: 'Em aberto', qtd: contagem.nova + contagem.em_contato + contagem.paga },
    ...STATUS.map((s) => ({ id: s.id, nome: s.plural, qtd: contagem[s.id] })),
    { id: 'todas', nome: 'Todas', qtd: reservas.length },
  ]

  const visiveis = useMemo(() => {
    const termo = semAcento(busca.trim())
    const digitos = busca.replace(/\D/g, '')
    return reservas.filter((r) => {
      const passa = filtro === 'todas' || (filtro === 'ativas' ? ['nova', 'em_contato', 'paga'].includes(r.status) : r.status === filtro)
      if (!passa) return false
      if (!termo) return true
      return semAcento(r.nome).includes(termo) || (digitos.length >= 3 && r.whatsapp.includes(digitos))
    })
  }, [reservas, filtro, busca])

  const atual = reservas.find((r) => r.id === selecionada) ?? null
  const selecionando = marcadas.size > 0
  const listaMarcadas = visiveis.filter((r) => marcadas.has(r.id))
  const todasMarcadas = visiveis.length > 0 && listaMarcadas.length === visiveis.length

  const alternar = (id) => setMarcadas((m) => {
    const n = new Set(m)
    if (n.has(id)) n.delete(id); else n.add(id)
    return n
  })
  const alternarTodas = () => setMarcadas(todasMarcadas ? new Set() : new Set(visiveis.map((r) => r.id)))
  const limpar = () => setMarcadas(new Set())

  // Esc limpa a seleção.
  useEffect(() => {
    if (!selecionando) return
    const tecla = (e) => { if (e.key === 'Escape') limpar() }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [selecionando])

  const atualizarEmMassa = (linhas, status) => {
    linhas.forEach(aoAtualizar)
    const n = listaMarcadas.length
    setRecado(`${n} ${n === 1 ? 'reserva marcada' : 'reservas marcadas'} como ${nomeStatus(status).toLowerCase()}.`)
    limpar()
  }

  const atualizar = (antiga) => (nova) => {
    aoAtualizar(nova)
    if (nova.status && nova.status !== antiga.status) setRecado(`Reserva de ${antiga.nome.split(' ')[0]} marcada como ${nomeStatus(nova.status).toLowerCase()}.`)
  }

  return (
    <div className={`reservas${(selecionando ? acoesAbertas : atual) ? ' reservas--com-detalhe' : ''}${selecionando ? ' reservas--selecionando' : ''}`}>
      <div className="reservas__lista">
        <div className="ferramentas">
          <label className="busca">
            <IconeBusca tamanho={18} />
            <span className="sr-only">Buscar por nome ou telefone</span>
            <input type="search" placeholder="Buscar por nome ou telefone" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </label>
          <button type="button" className="botao botao--secundario" onClick={() => baixarCsv(visiveis)} disabled={visiveis.length === 0}>
            <IconeBaixar tamanho={18} /> <span>Planilha</span>
          </button>
        </div>

        <div className="segmentos" role="group" aria-label="Filtrar por status">
          {filtros.map((f) => (
            <button key={f.id} type="button" className="segmento" aria-pressed={filtro === f.id} onClick={() => setFiltro(f.id)}>
              {f.nome}<span className="segmento__qtd">{f.qtd}</span>
            </button>
          ))}
        </div>

        {visiveis.length === 0 ? (
          <div className="vazio">
            <p>{busca ? `Nenhuma reserva encontrada para "${busca}".` : 'Nenhuma reserva neste filtro.'}</p>
            {(busca || filtro !== 'todas') && (
              <button type="button" className="link" onClick={() => { setBusca(''); setFiltro('todas') }}>Ver todas</button>
            )}
          </div>
        ) : (
          <div className="linhas">
          <label className="selecionar-todas">
            <input type="checkbox" className="marcar" checked={todasMarcadas}
              ref={(el) => { if (el) el.indeterminate = selecionando && !todasMarcadas }}
              onChange={alternarTodas} />
            <span>{selecionando ? `${listaMarcadas.length} de ${visiveis.length} selecionadas` : `Selecionar todas (${visiveis.length})`}</span>
          </label>
          <ul aria-label={`${visiveis.length} reservas`}>
            {visiveis.map((r) => (
              <li key={r.id} className={marcadas.has(r.id) ? 'linha-marcada' : undefined}>
                <label className="linha__marcar">
                  <input type="checkbox" className="marcar" checked={marcadas.has(r.id)} onChange={() => alternar(r.id)}
                    aria-label={`Selecionar reserva de ${r.nome}`} />
                </label>
                <a href={`#/reservas/${r.id}`} className="linha" aria-current={!selecionando && r.id === selecionada ? 'true' : undefined}
                  onClick={(e) => { if (selecionando) { e.preventDefault(); alternar(r.id) } }}>
                  <span className="linha__principal">
                    <span className="linha__nome">{r.nome}</span>
                    <span className="linha__resumo">{resumoItens(r)}</span>
                  </span>
                  <span className="linha__lado">
                    <span className="linha__total">{reais(r.total_estimado)}</span>
                    <Selo status={r.status} />
                  </span>
                  <span className="linha__data">{dataHora(r.criado_em)}</span>
                </a>
              </li>
            ))}
          </ul>
          </div>
        )}
      </div>

      <section className="reservas__detalhe" aria-label="Detalhe da reserva">
        {selecionando ? (
          <AcoesEmMassa reservas={listaMarcadas} aoDesmarcar={alternar} aoLimpar={limpar}
            aoVoltar={() => setAcoesAbertas(false)} aoAtualizar={atualizarEmMassa} />
        ) : atual
          ? <DetalheReserva key={atual.id} reserva={atual} aoFechar={() => aoSelecionar(null)} aoAtualizar={atualizar(atual)} />
          : (
            <div className="detalhe-vazio">
              <IconeReservas tamanho={28} />
              <p>Escolha uma reserva na lista para ver os detalhes.</p>
            </div>
          )}
      </section>

      {selecionando && !acoesAbertas && (
        <div className="barra-selecao">
          <span><strong>{listaMarcadas.length}</strong> {listaMarcadas.length === 1 ? 'selecionada' : 'selecionadas'}</span>
          <button type="button" className="link" onClick={limpar}>Limpar</button>
          <button type="button" className="botao botao--principal" onClick={() => setAcoesAbertas(true)}>Ações</button>
        </div>
      )}

      {recado && <p className="recado" role="status">{recado}</p>}
    </div>
  )
}
