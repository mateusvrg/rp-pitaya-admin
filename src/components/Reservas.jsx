import { useEffect, useMemo, useState } from 'react'
import { STATUS, nomeStatus } from '../lib/dados'
import { baixarCsv } from '../lib/csv'
import { semAcento } from '../lib/formato'
import { CartaoReserva } from './CartaoReserva'

export function Reservas({ reservas, filtroInicial, aoAtualizar }) {
  const [filtro, setFiltro] = useState(filtroInicial ?? 'ativas')
  const [busca, setBusca] = useState('')
  const [recado, setRecado] = useState('')

  useEffect(() => {
    if (!recado) return
    const t = setTimeout(() => setRecado(''), 4000)
    return () => clearTimeout(t)
  }, [recado])

  // Ao mudar o status, a reserva pode sair do filtro atual: avisa para onde ela foi.
  const atualizar = (antiga) => (nova) => {
    aoAtualizar(nova)
    if (nova.status && nova.status !== antiga.status) {
      setRecado(`${antiga.nome.split(' ')[0]} agora está em "${nomeStatus(nova.status)}".`)
    }
  }

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
      const passaFiltro =
        filtro === 'todas' ||
        (filtro === 'ativas' ? ['nova', 'em_contato', 'paga'].includes(r.status) : r.status === filtro)
      if (!passaFiltro) return false
      if (!termo) return true
      return semAcento(r.nome).includes(termo) || (digitos.length >= 3 && r.whatsapp.includes(digitos))
    })
  }, [reservas, filtro, busca])

  return (
    <div className="reservas">
      <div className="reservas__cabeca">
        <h1 className="titulo">Reservas</h1>
        <button type="button" className="botao botao--contorno botao--pequeno" onClick={() => baixarCsv(visiveis)} disabled={visiveis.length === 0}>
          Baixar planilha ({visiveis.length})
        </button>
      </div>

      <label className="busca">
        <span className="sr-only">Buscar por nome ou telefone</span>
        <input className="campo" type="search" placeholder="Buscar por nome ou telefone" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </label>

      <div className="filtros" role="group" aria-label="Filtrar por status">
        {filtros.map((f) => (
          <button key={f.id} type="button" className="filtro" aria-pressed={filtro === f.id} onClick={() => setFiltro(f.id)}>
            {f.nome} <span className="filtro__qtd">{f.qtd}</span>
          </button>
        ))}
      </div>

      {visiveis.length === 0 ? (
        <div className="vazio vazio--pequeno">
          <p className="apoio">
            {busca ? `Nenhuma reserva encontrada para "${busca}".` : 'Nenhuma reserva neste status.'}
          </p>
          {(busca || filtro !== 'todas') && (
            <button type="button" className="link-botao" onClick={() => { setBusca(''); setFiltro('todas') }}>Ver todas as reservas</button>
          )}
        </div>
      ) : (
        <ul className="lista-reservas">
          {visiveis.map((r) => <li key={r.id}><CartaoReserva reserva={r} aoAtualizar={atualizar(r)} /></li>)}
        </ul>
      )}
      {recado && <p className="recado" role="status">{recado}</p>}
    </div>
  )
}
