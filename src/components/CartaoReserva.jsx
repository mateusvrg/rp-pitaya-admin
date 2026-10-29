import { useState } from 'react'
import { STATUS, atualizarReserva } from '../lib/dados'
import { dataHora, linkWhatsApp, reais, telefone, unidades } from '../lib/formato'

export function CartaoReserva({ reserva: r, aoAtualizar }) {
  const [anotacao, setAnotacao] = useState(r.observacao ?? '')
  const [salvando, setSalvando] = useState(null) // 'status' | 'anotacao' | null
  const [aviso, setAviso] = useState(null) // { tipo: 'ok' | 'erro', texto }

  const salvar = async (campos, qual) => {
    setSalvando(qual); setAviso(null)
    try {
      const nova = await atualizarReserva(r.id, campos)
      aoAtualizar(nova)
      setAviso({ tipo: 'ok', texto: qual === 'status' ? 'Status atualizado.' : 'Anotação salva.' })
    } catch (e) {
      setAviso({ tipo: 'erro', texto: e.message })
    } finally {
      setSalvando(null)
    }
  }

  const anotacaoMudou = (anotacao.trim() || null) !== (r.observacao ?? null)

  return (
    <article className={`reserva status--${r.status}`}>
      <header className="reserva__cabeca">
        <div>
          <h2 className="reserva__nome">{r.nome}</h2>
          <p className="reserva__data">Reservou em {dataHora(r.criado_em)}</p>
        </div>
        <span className="selo">{STATUS.find((s) => s.id === r.status)?.nome}</span>
      </header>

      <ul className="reserva__itens">
        {r.itens.map((i) => (
          <li key={i.produtoId}>
            <span>{i.quantidade} × {i.nome}</span>
            <span>{reais(i.quantidade * i.preco)}</span>
          </li>
        ))}
        <li className="reserva__total">
          <span>{unidades(r)} {unidades(r) === 1 ? 'unidade' : 'unidades'}</span>
          <strong>{reais(r.total_estimado)}</strong>
        </li>
      </ul>

      <dl className="reserva__dados">
        <div><dt>WhatsApp</dt><dd>{telefone(r.whatsapp)}</dd></div>
        <div><dt>{r.modo === 'entrega' ? 'Entrega' : 'Retirada no sítio'}</dt><dd>{r.modo === 'entrega' ? r.endereco : 'Combinar dia e horário'}</dd></div>
      </dl>

      <div className="reserva__acoes">
        <a className="botao botao--whatsapp" href={linkWhatsApp(r)} target="_blank" rel="noopener noreferrer">
          Chamar no WhatsApp
        </a>
        <label className="campo-rotulo campo-rotulo--linha">
          <span>Status</span>
          <select className="campo" value={r.status} disabled={salvando === 'status'}
            onChange={(e) => salvar({ status: e.target.value }, 'status')}>
            {STATUS.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </label>
      </div>

      <div className="reserva__anotacao">
        <label className="campo-rotulo">Anotações
          <textarea className="campo" rows="2" maxLength={1000} placeholder="Ex.: pagou metade no Pix, entregar sábado de manhã"
            value={anotacao} onChange={(e) => setAnotacao(e.target.value)} />
        </label>
        {anotacaoMudou && (
          <button type="button" className="botao botao--pequeno botao--principal" disabled={salvando === 'anotacao'}
            onClick={() => salvar({ observacao: anotacao.trim() || null }, 'anotacao')}>
            {salvando === 'anotacao' ? 'Salvando...' : 'Salvar anotação'}
          </button>
        )}
      </div>

      {aviso && <p className={aviso.tipo === 'erro' ? 'erro' : 'ok'} role="status">{aviso.texto}</p>}
    </article>
  )
}
