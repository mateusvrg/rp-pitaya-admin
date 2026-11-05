import { useEffect, useRef, useState } from 'react'
import { CANAIS, STATUS, lancarReservas, nomeCanal, nomeStatus } from '../lib/dados'
import { lerPlanilha } from '../lib/planilha'
import { baixarModelo, interpretar, marcarRepetidas, paraBanco, validarLinha } from '../lib/importar'
import { pluralUnidade, qtd, reais, resumoQtd, semAcento, telefone, unidadeDe } from '../lib/formato'
import { IconeBaixar, IconeFechar, IconeVoltar, IconeEditar } from './Icones'

const dataCurta = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })

// Importar várias reservas de uma planilha (.xlsx ou .csv): escolhe o arquivo, confere, corrige aqui mesmo e grava.
export function ImportarReservas({ produtos, reservas, aoCancelar, aoImportar }) {
  const [arquivo, setArquivo] = useState(null)
  const [lendo, setLendo] = useState(false)
  const [problemas, setProblemas] = useState([])
  const [lista, setLista] = useState(null) // reservas lidas (e corrigidas) da planilha
  const [editando, setEditando] = useState(null) // número da linha aberta para corrigir
  const [pularRepetidas, setPularRepetidas] = useState(true)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [arrastando, setArrastando] = useState(false)
  const titulo = useRef(null)
  const entrada = useRef(null)

  useEffect(() => { titulo.current?.focus({ preventScroll: true }) }, [])
  useEffect(() => {
    const tecla = (e) => { if (e.key === 'Escape' && !editando) aoCancelar() }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [aoCancelar, editando])

  const abrir = async (a) => {
    if (!a) return
    setArquivo(a); setErro(''); setLista(null); setProblemas([]); setEditando(null); setLendo(true)
    try {
      const r = interpretar(await lerPlanilha(a), produtos, reservas)
      setProblemas(r.problemas); setLista(r.reservas.length ? r.reservas : null)
    } catch (e) {
      setErro(e.message || 'Não consegui ler esse arquivo.')
    } finally {
      setLendo(false)
      if (entrada.current) entrada.current.value = ''
    }
  }

  // Corrigir ou tirar uma linha: confere de novo e refaz a busca por repetidas.
  const corrigir = (linha, bruto) => {
    setLista((l) => marcarRepetidas(l.map((r) => (r.linha === linha ? validarLinha(bruto, produtos) : r)), reservas))
    setEditando(null)
  }
  const tirar = (linha) => {
    setLista((l) => { const n = marcarRepetidas(l.filter((r) => r.linha !== linha), reservas); return n.length ? n : null })
    setEditando(null)
  }

  const itens = lista ?? []
  const comErro = itens.filter((r) => r.erros.length)
  const repetidas = itens.filter((r) => r.repetida && !r.erros.length)
  const paraGravar = itens.filter((r) => !r.erros.length && !(pularRepetidas && r.repetida))
  const total = paraGravar.reduce((s, r) => s + r.total, 0)

  const importar = async () => {
    setErro(''); setSalvando(true)
    try {
      await lancarReservas(paraGravar.map(paraBanco), 'importada')
      aoImportar(paraGravar.length)
    } catch (e) {
      setErro(e.message); setSalvando(false)
    }
  }

  const soltar = (e) => { e.preventDefault(); setArrastando(false); abrir(e.dataTransfer.files?.[0]) }

  return (
    <div className="detalhe importar">
      <div className="detalhe__topo">
        <button type="button" className="botao-fantasma detalhe__voltar" onClick={aoCancelar} aria-label="Voltar para a lista"><IconeVoltar /></button>
        <div className="detalhe__titulo">
          <h2 ref={titulo} tabIndex={-1}>Importar planilha</h2>
          <p>WhatsApp, Instagram ou outro lugar</p>
        </div>
        <button type="button" className="botao-fantasma detalhe__fechar" onClick={aoCancelar} aria-label="Fechar"><IconeFechar /></button>
      </div>

      <div className="detalhe__corpo">
        {!lista && !problemas.length && (
          <ol className="importar__passos">
            <li>
              <span>Baixe o modelo e preencha uma linha por reserva, com os quilos de cada variedade.</span>
              <button type="button" className="botao botao--secundario botao--pequeno" onClick={() => baixarModelo(produtos)}>
                <IconeBaixar tamanho={16} /> Baixar modelo (.xlsx)
              </button>
            </li>
            <li><span>Escolha a planilha preenchida. O painel mostra tudo antes de gravar e dá para corrigir aqui mesmo.</span></li>
          </ol>
        )}

        <label className={`importar__area${arrastando ? ' importar__area--arrastando' : ''}${lista ? ' importar__area--pequena' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setArrastando(true) }} onDragLeave={() => setArrastando(false)} onDrop={soltar}>
          <IconeBaixar tamanho={lista ? 18 : 24} />
          {lista
            ? <span><strong>{arquivo?.name}</strong> · trocar arquivo</span>
            : <span><strong>Escolher planilha</strong><span className="so-computador"> ou arraste aqui</span><br /><span className="apoio">Excel (.xlsx) ou .csv</span></span>}
          <input ref={entrada} type="file" className="sr-only"
            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            onChange={(e) => abrir(e.target.files?.[0])} />
        </label>

        {lendo && <p className="apoio"><span className="girando" aria-hidden="true" /> Lendo a planilha...</p>}
        {problemas.map((p) => <p key={p} className="erro" role="alert">{p}</p>)}

        {lista && (
          <>
            <div className="importar__resumo" role="status">
              <span><strong>{itens.length}</strong> {itens.length === 1 ? 'linha' : 'linhas'}</span>
              {comErro.length > 0 && <span className="importar__conta importar__conta--erro">{comErro.length} com erro</span>}
              {repetidas.length > 0 && <span className="importar__conta">{repetidas.length} já no sistema</span>}
            </div>
            {comErro.length > 0 && <p className="apoio">Toque numa linha para corrigir.</p>}

            {repetidas.length > 0 && (
              <label className="marcar">
                <input type="checkbox" checked={pularRepetidas} onChange={(e) => setPularRepetidas(e.target.checked)} />
                Pular as {repetidas.length} que parecem repetidas
              </label>
            )}

            <ul className="importar__lista">
              {itens.map((r) => {
                const pulada = !r.erros.length && pularRepetidas && r.repetida
                const aberta = editando === r.linha
                return (
                  <li key={r.linha} className={[r.erros.length && 'importar__item--erro', pulada && 'importar__item--pulada', aberta && 'importar__item--aberta'].filter(Boolean).join(' ') || undefined}>
                    <button type="button" className="importar__resumo-linha" aria-expanded={aberta}
                      onClick={() => setEditando(aberta ? null : r.linha)}>
                      <span className="importar__linha">
                        <span className="importar__num">{r.linha}</span>
                        <span className="importar__nome">{r.nome || 'Sem nome'}</span>
                        <span className="importar__total">{reais(r.total)}</span>
                        <IconeEditar tamanho={15} className="importar__lapis" />
                      </span>
                      <span className="importar__det">
                        {[r.whatsappOk ? telefone(r.whatsapp) : r.whatsapp, r.itens.map((i) => `${qtd(i.quantidade, i.unidade)} ${i.nome}`).join(', '),
                          r.modo === 'entrega' ? 'Entrega' : 'Retirada', nomeStatus(r.status), nomeCanal(r.canal), r.data && dataCurta(r.data)].filter(Boolean).join(' · ')}
                      </span>
                      {r.erros.map((e) => <span key={e} className="importar__msg importar__msg--erro">{e}</span>)}
                      {!r.erros.length && r.repetida && (
                        <span className="importar__msg">{r.repetida === 'sistema' ? 'Parece já estar no sistema' : 'Repetida nesta planilha'}{pulada ? ' · será pulada' : ''}</span>
                      )}
                      {!r.erros.length && r.avisos.map((a) => <span key={a} className="importar__msg">{a}</span>)}
                    </button>
                    {aberta && (
                      <CorrigirLinha reserva={r} produtos={produtos} aoSalvar={(b) => corrigir(r.linha, b)}
                        aoCancelar={() => setEditando(null)} aoTirar={() => tirar(r.linha)} />
                    )}
                  </li>
                )
              })}
            </ul>

            {comErro.length > 0 && (
              <p className="erro" role="alert">
                {comErro.length === 1 ? 'Falta corrigir 1 linha' : `Faltam corrigir ${comErro.length} linhas`}. Toque nela para corrigir aqui
                ou tire da importação. Nada é gravado enquanto tiver erro.
              </p>
            )}
          </>
        )}

        {erro && <p className="erro" role="alert">{erro}</p>}

        <div className="form__botoes">
          <button type="button" className="botao botao--secundario" onClick={aoCancelar} disabled={salvando}>Cancelar</button>
          {lista && (
            <button type="button" className="botao botao--principal" onClick={importar}
              disabled={salvando || comErro.length > 0 || paraGravar.length === 0 || editando != null}>
              {salvando ? 'Importando...'
                : comErro.length > 0 ? `${comErro.length} ${comErro.length === 1 ? 'linha' : 'linhas'} com erro`
                : paraGravar.length === 0 ? 'Nada para importar'
                  : `Importar ${paraGravar.length} ${paraGravar.length === 1 ? 'reserva' : 'reservas'}`}
            </button>
          )}
        </div>
        {paraGravar.length > 0 && comErro.length === 0 && (
          <p className="apoio importar__rodape">{resumoQtd(paraGravar.flatMap((r) => r.itens))} · {reais(total)} no total</p>
        )}
      </div>
    </div>
  )
}

// Formulário para corrigir uma linha da planilha sem sair do painel. Os campos com erro ficam em vermelho.
function CorrigirLinha({ reserva: r, produtos, aoSalvar, aoCancelar, aoTirar }) {
  const [b, setB] = useState(() => ({ ...r.bruto, qtd: { ...r.bruto.qtd }, preco: { ...r.bruto.preco } }))
  const primeiro = useRef(null)
  const errado = (campo) => r.camposErrados.has(campo) || (campo.startsWith('qtd') && r.camposErrados.has('qtd'))
  const classe = (campo) => `campo campo--pequeno${errado(campo) ? ' campo--erro' : ''}`
  const mudar = (campo) => (e) => setB((x) => ({ ...x, [campo]: e.target.value }))
  const mudarDe = (grupo, id) => (e) => setB((x) => ({ ...x, [grupo]: { ...x[grupo], [id]: e.target.value } }))

  useEffect(() => {
    const el = primeiro.current?.closest('li')
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    primeiro.current?.querySelector('.campo--erro')?.focus({ preventScroll: true })
  }, [])

  // Valor que não está na lista (ex.: "Correios") aparece como opção marcada como inválida, até ser trocado.
  const modoValido = ['', 'entrega', 'retirada'].includes(semAcento(b.modo ?? '').trim()) || /^(entreg|retir)/.test(semAcento(b.modo ?? ''))
  const statusValido = !b.status || STATUS.some((s) => [semAcento(s.nome), semAcento(s.plural)].includes(semAcento(b.status).trim()))
  const valorModo = /^entreg/.test(semAcento(b.modo ?? '')) ? 'Entrega' : /^(retir|sitio|busca)/.test(semAcento(b.modo ?? '')) ? 'Retirada' : b.modo
  const canalChave = semAcento(b.canal ?? '').trim()
  const valorCanal = !canalChave || /^(whats|zap|wpp)/.test(canalChave) ? '' : /^insta/.test(canalChave) ? 'Instagram' : /^site/.test(canalChave) ? 'Site' : b.canal
  const canalValido = !b.canal || valorCanal !== b.canal || ['Instagram', 'Site'].includes(b.canal)
  const valorStatus = STATUS.find((s) => [semAcento(s.nome), semAcento(s.plural), s.id].includes(semAcento(b.status ?? '').trim()))?.nome ?? b.status

  return (
    <form className="corrigir" ref={primeiro} onSubmit={(e) => { e.preventDefault(); aoSalvar(b) }} noValidate>
      <div className="corrigir__grade">
        <label className="campo-rotulo corrigir__largo">Nome
          <input className={classe('nome')} value={b.nome} onChange={mudar('nome')} maxLength={100} />
        </label>
        <label className="campo-rotulo">WhatsApp
          <input className={classe('whatsapp')} value={b.whatsapp} onChange={mudar('whatsapp')} inputMode="tel" placeholder="(34) 99999-8888" />
        </label>
        <label className="campo-rotulo">Data
          <input className={classe('data')} value={b.data} onChange={mudar('data')} placeholder="20/10/2026" inputMode="numeric" />
        </label>
        <label className="campo-rotulo">Recebimento
          <select className={classe('modo')} value={valorModo || ''} onChange={mudar('modo')}>
            <option value="">Automático</option>
            <option value="Entrega">Entrega</option>
            <option value="Retirada">Retirada</option>
            {!modoValido && <option value={b.modo}>{b.modo} (inválido)</option>}
          </select>
        </label>
        <label className="campo-rotulo">Status
          <select className={classe('status')} value={valorStatus || ''} onChange={mudar('status')}>
            <option value="">Nova</option>
            {STATUS.filter((s) => s.id !== 'nova').map((s) => <option key={s.id} value={s.nome}>{s.nome}</option>)}
            {!statusValido && <option value={b.status}>{b.status} (inválido)</option>}
          </select>
        </label>
        <label className="campo-rotulo">Canal
          <select className={classe('canal')} value={valorCanal || ''} onChange={mudar('canal')}>
            <option value="">WhatsApp</option>
            {CANAIS.filter((c) => c.id !== 'whatsapp').map((c) => <option key={c.id} value={c.nome}>{c.nome}</option>)}
            {!canalValido && <option value={b.canal}>{b.canal} (inválido)</option>}
          </select>
        </label>
        <label className="campo-rotulo corrigir__largo">Endereço
          <input className={classe('endereco')} value={b.endereco} onChange={mudar('endereco')} maxLength={300} placeholder="Só para entrega" />
        </label>
      </div>

      <div className="corrigir__itens">
        <span className="corrigir__titulo">Quantidade e preço</span>
        {produtos.filter((p) => p.ativo || b.qtd[p.id]).map((p) => (
          <div key={p.id} className="corrigir__item">
            <span>{p.nome}</span>
            <input className={classe(`qtd-${p.id}`)} value={b.qtd[p.id] ?? ''} onChange={mudarDe('qtd', p.id)} inputMode={unidadeDe(p) === 'kg' ? 'decimal' : 'numeric'}
              placeholder={unidadeDe(p) === 'kg' ? '0 kg' : `0 ${pluralUnidade(unidadeDe(p))}`} aria-label={`Quantidade de ${p.nome}`} />
            <input className={classe(`preco-${p.id}`)} value={b.preco[p.id] ?? ''} onChange={mudarDe('preco', p.id)} inputMode="decimal"
              placeholder={reais(p.preco_unidade).replace('R$ ', '')} aria-label={`Preço de ${p.nome}`} />
          </div>
        ))}
      </div>

      <label className="campo-rotulo">Anotações
        <input className="campo campo--pequeno" value={b.observacao} onChange={mudar('observacao')} maxLength={1000} />
      </label>

      <div className="corrigir__botoes">
        <button type="button" className="link corrigir__tirar" onClick={aoTirar}>Tirar da importação</button>
        <button type="button" className="botao botao--secundario botao--pequeno" onClick={aoCancelar}>Cancelar</button>
        <button type="submit" className="botao botao--principal botao--pequeno">Salvar</button>
      </div>
    </form>
  )
}
