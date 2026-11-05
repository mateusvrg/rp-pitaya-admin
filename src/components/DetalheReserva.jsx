import { useEffect, useRef, useState } from 'react'
import { STATUS, atualizarReserva, canalDe, nomeCanal } from '../lib/dados'
import { dataHora, linkWhatsApp, porUnidade, qtd, reais, resumoQtd, telefone } from '../lib/formato'
import { IconeFechar, IconeLocal, IconeTelefone, IconeVoltar, IconeWhatsApp } from './Icones'

export function DetalheReserva({ reserva: r, aoFechar, aoAtualizar }) {
  const [anotacao, setAnotacao] = useState(r.observacao ?? '')
  const [salvando, setSalvando] = useState(null)
  const [aviso, setAviso] = useState(null)
  const titulo = useRef(null)

  useEffect(() => { titulo.current?.focus({ preventScroll: true }) }, [])

  // Esc fecha o detalhe.
  useEffect(() => {
    const tecla = (e) => { if (e.key === 'Escape') aoFechar() }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [aoFechar])

  const salvar = async (campos, qual) => {
    setSalvando(qual); setAviso(null)
    try {
      aoAtualizar(await atualizarReserva(r.id, campos))
      if (qual === 'anotacao') setAviso({ tipo: 'ok', texto: 'Anotação salva.' })
    } catch (e) {
      setAviso({ tipo: 'erro', texto: e.message })
    } finally {
      setSalvando(null)
    }
  }

  const mudou = (anotacao.trim() || null) !== (r.observacao ?? null)
  const resumo = resumoQtd(r.itens)

  return (
    <div className="detalhe">
      <div className="detalhe__topo">
        <button type="button" className="botao-fantasma detalhe__voltar" onClick={aoFechar} aria-label="Voltar para a lista"><IconeVoltar /></button>
        <div className="detalhe__titulo">
          <h2 ref={titulo} tabIndex={-1}>{r.nome}</h2>
          <p>Reservou em {dataHora(r.criado_em)}{canalDe(r) !== 'site' ? ` · pelo ${nomeCanal(canalDe(r))}` : r.origem === 'manual' ? ' · lançada pelo painel' : ''}</p>
        </div>
        <button type="button" className="botao-fantasma detalhe__fechar" onClick={aoFechar} aria-label="Fechar detalhe"><IconeFechar /></button>
      </div>

      <div className="detalhe__corpo">
        <fieldset className="status-escolha">
          <legend>Status</legend>
          <div className="status-escolha__opcoes">
            {STATUS.map((s) => (
              <button key={s.id} type="button" className={`status-opcao selo--${s.id}`} aria-pressed={r.status === s.id}
                disabled={salvando === 'status'} onClick={() => r.status !== s.id && salvar({ status: s.id }, 'status')}>
                <span className="selo__ponto" aria-hidden="true" />{s.nome}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="bloco">
          <h3>Pedido</h3>
          <ul className="itens">
            {r.itens.map((i) => (
              <li key={i.produtoId}>
                <span>{qtd(i.quantidade, i.unidade)} × {i.nome} <span className="apoio">({reais(i.preco)} {porUnidade(i.unidade)})</span></span>
                <span className="itens__valor">{reais(i.quantidade * i.preco)}</span>
              </li>
            ))}
          </ul>
          <div className="itens__total">
            <span>{resumo}</span>
            <strong>{reais(r.total_estimado)}</strong>
          </div>
        </div>

        <div className="bloco">
          <h3>Contato e recebimento</h3>
          <p className="info"><IconeTelefone tamanho={18} /> {telefone(r.whatsapp)}</p>
          <p className="info"><IconeLocal tamanho={18} />
            {r.modo === 'entrega' ? <span>{r.endereco ? `Entrega em: ${r.endereco}` : 'Entrega (endereço a combinar)'}</span> : <span>Retirada em nosso endereço</span>}
          </p>
          <a className="botao botao--whatsapp" href={linkWhatsApp(r)} target="_blank" rel="noopener noreferrer">
            <IconeWhatsApp tamanho={18} /> Chamar no WhatsApp
          </a>
        </div>

        <div className="bloco">
          <label className="rotulo" htmlFor={`nota-${r.id}`}><h3>Anotações</h3></label>
          <textarea id={`nota-${r.id}`} className="campo" rows="3" maxLength={1000}
            placeholder="Ex.: pagou metade no Pix, entregar sábado de manhã" value={anotacao} onChange={(e) => setAnotacao(e.target.value)} />
          {mudou && (
            <button type="button" className="botao botao--principal" disabled={salvando === 'anotacao'}
              onClick={() => salvar({ observacao: anotacao.trim() || null }, 'anotacao')}>
              {salvando === 'anotacao' ? 'Salvando...' : 'Salvar anotação'}
            </button>
          )}
        </div>

        {aviso && <p className={aviso.tipo === 'erro' ? 'erro' : 'ok'} role="status">{aviso.texto}</p>}
      </div>
    </div>
  )
}
