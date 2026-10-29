import { useEffect, useMemo, useState } from 'react'
import { STATUS, nomeStatus } from '../lib/dados'
import { baixarCsv } from '../lib/csv'
import { dataHora, reais, resumoItens, semAcento } from '../lib/formato'
import { DetalheReserva } from './DetalheReserva'
import { IconeBaixar, IconeBusca, IconeReservas } from './Icones'

export function Selo({ status }) {
  return <span className={`selo selo--${status}`}><span className="selo__ponto" aria-hidden="true" />{nomeStatus(status)}</span>
}

export function Reservas({ reservas, filtroInicial, selecionada, aoSelecionar, aoAtualizar }) {
  const [filtro, setFiltro] = useState(filtroInicial ?? 'ativas')
  const [busca, setBusca] = useState('')
  const [recado, setRecado] = useState('')

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

  const atualizar = (antiga) => (nova) => {
    aoAtualizar(nova)
    if (nova.status && nova.status !== antiga.status) setRecado(`Reserva de ${antiga.nome.split(' ')[0]} marcada como ${nomeStatus(nova.status).toLowerCase()}.`)
  }

  return (
    <div className={`reservas${atual ? ' reservas--com-detalhe' : ''}`}>
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
          <ul className="linhas" aria-label={`${visiveis.length} reservas`}>
            {visiveis.map((r) => (
              <li key={r.id}>
                <a href={`#/reservas/${r.id}`} className="linha" aria-current={r.id === selecionada ? 'true' : undefined}>
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
        )}
      </div>

      <section className="reservas__detalhe" aria-label="Detalhe da reserva">
        {atual
          ? <DetalheReserva key={atual.id} reserva={atual} aoFechar={() => aoSelecionar(null)} aoAtualizar={atualizar(atual)} />
          : (
            <div className="detalhe-vazio">
              <IconeReservas tamanho={28} />
              <p>Escolha uma reserva na lista para ver os detalhes.</p>
            </div>
          )}
      </section>

      {recado && <p className="recado" role="status">{recado}</p>}
    </div>
  )
}
