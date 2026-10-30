import { useEffect, useState } from 'react'
import { STATUS, atualizarVarias, nomeStatus } from '../lib/dados'
import { baixarCsv } from '../lib/csv'
import { reais, unidades } from '../lib/formato'
import { IconeBaixar, IconeFechar, IconeVoltar } from './Icones'

// Painel lateral que aparece no lugar do detalhe quando há reservas marcadas na lista.
export function AcoesEmMassa({ reservas, aoDesmarcar, aoLimpar, aoVoltar, aoAtualizar }) {
  const [confirmar, setConfirmar] = useState(null) // status escolhido, esperando confirmação
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)

  useEffect(() => { setConfirmar(null); setErro(null) }, [reservas.length])

  const qtd = reservas.length
  const pitayas = reservas.reduce((s, r) => s + unidades(r), 0)
  const valor = reservas.reduce((s, r) => s + r.total_estimado, 0)
  const porStatus = STATUS.map((s) => ({ ...s, qtd: reservas.filter((r) => r.status === s.id).length })).filter((s) => s.qtd > 0)
  const status = confirmar && STATUS.find((s) => s.id === confirmar)
  const jaEstao = confirmar ? reservas.filter((r) => r.status === confirmar).length : 0

  const aplicar = async () => {
    setSalvando(true); setErro(null)
    try {
      const alvo = reservas.filter((r) => r.status !== confirmar).map((r) => r.id)
      const linhas = alvo.length ? await atualizarVarias(alvo, { status: confirmar }) : []
      aoAtualizar(linhas, confirmar)
    } catch (e) {
      setErro(e.message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="detalhe">
      <div className="detalhe__topo">
        <button type="button" className="botao-fantasma detalhe__voltar" onClick={aoVoltar} aria-label="Voltar para a lista"><IconeVoltar /></button>
        <div className="detalhe__titulo">
          <h2>{qtd} {qtd === 1 ? 'reserva selecionada' : 'reservas selecionadas'}</h2>
          <p>{pitayas} {pitayas === 1 ? 'pitaya' : 'pitayas'} · {reais(valor)}</p>
        </div>
        <button type="button" className="botao-fantasma detalhe__fechar" onClick={aoLimpar} aria-label="Limpar seleção"><IconeFechar /></button>
      </div>

      <div className="detalhe__corpo">
        <fieldset className="status-escolha">
          <legend>Mudar o status de todas</legend>
          <div className="status-escolha__opcoes">
            {STATUS.map((s) => (
              <button key={s.id} type="button" className={`status-opcao selo--${s.id}`} aria-pressed={confirmar === s.id}
                disabled={salvando} onClick={() => setConfirmar(confirmar === s.id ? null : s.id)}>
                <span className="selo__ponto" aria-hidden="true" />{s.nome}
              </button>
            ))}
          </div>
        </fieldset>

        {status && (
          <div className="confirmar-massa" role="alertdialog" aria-label="Confirmar mudança de status">
            {qtd === jaEstao ? (
              <p>{qtd === 1 ? 'Ela já está' : `As ${qtd} já estão`} como <strong>{status.nome.toLowerCase()}</strong>.</p>
            ) : (
              <p>
                Marcar <strong>{qtd - jaEstao} {qtd - jaEstao === 1 ? 'reserva' : 'reservas'}</strong> como <strong>{status.nome.toLowerCase()}</strong>?
                {jaEstao > 0 && <span className="confirmar-massa__obs"> {jaEstao} já {jaEstao === 1 ? 'está' : 'estão'} assim e não muda{jaEstao === 1 ? '' : 'm'}.</span>}
              </p>
            )}
            <div className="confirmar-massa__botoes">
              <button type="button" className="botao botao--principal" onClick={aplicar} disabled={salvando || qtd === jaEstao}>
                {salvando ? 'Salvando...' : 'Confirmar'}
              </button>
              <button type="button" className="botao" onClick={() => setConfirmar(null)} disabled={salvando}>Cancelar</button>
            </div>
          </div>
        )}
        {erro && <p className="erro" role="alert">{erro}</p>}

        <div className="bloco">
          <h3>Como estão hoje</h3>
          <ul className="massa-status">
            {porStatus.map((s) => (
              <li key={s.id}><span className={`selo selo--${s.id}`}><span className="selo__ponto" aria-hidden="true" />{s.qtd === 1 ? nomeStatus(s.id) : s.plural}</span><span>{s.qtd}</span></li>
            ))}
          </ul>
        </div>

        <div className="bloco">
          <h3>Selecionadas</h3>
          <ul className="massa-nomes">
            {reservas.map((r) => (
              <li key={r.id}>
                <span className="massa-nomes__nome">{r.nome}</span>
                <span className="massa-nomes__valor">{reais(r.total_estimado)}</span>
                <button type="button" className="botao-fantasma massa-nomes__tirar" onClick={() => aoDesmarcar(r.id)} aria-label={`Tirar ${r.nome} da seleção`}>
                  <IconeFechar tamanho={16} />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="bloco">
          <button type="button" className="botao botao--secundario" onClick={() => baixarCsv(reservas)}>
            <IconeBaixar tamanho={18} /> Baixar planilha das selecionadas
          </button>
          <button type="button" className="link massa-limpar" onClick={aoLimpar}>Limpar seleção</button>
          <p className="massa-dica">Para chamar no WhatsApp, abra cada reserva separadamente.</p>
        </div>
      </div>
    </div>
  )
}
