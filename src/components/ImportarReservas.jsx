import { useEffect, useRef, useState } from 'react'
import { lancarReservas, nomeStatus } from '../lib/dados'
import { lerPlanilha } from '../lib/planilha'
import { baixarModelo, interpretar, paraBanco } from '../lib/importar'
import { reais, telefone } from '../lib/formato'
import { IconeBaixar, IconeFechar, IconeVoltar, IconeEnviar } from './Icones'

const dataCurta = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })

// Importar várias reservas de uma planilha (.xlsx ou .csv): escolhe o arquivo, confere e grava.
export function ImportarReservas({ produtos, reservas, aoCancelar, aoImportar }) {
  const [arquivo, setArquivo] = useState(null)
  const [lendo, setLendo] = useState(false)
  const [resultado, setResultado] = useState(null) // { problemas, reservas }
  const [pularRepetidas, setPularRepetidas] = useState(true)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [arrastando, setArrastando] = useState(false)
  const titulo = useRef(null)
  const entrada = useRef(null)

  useEffect(() => { titulo.current?.focus({ preventScroll: true }) }, [])
  useEffect(() => {
    const tecla = (e) => { if (e.key === 'Escape') aoCancelar() }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [aoCancelar])

  const abrir = async (a) => {
    if (!a) return
    setArquivo(a); setErro(''); setResultado(null); setLendo(true)
    try {
      setResultado(interpretar(await lerPlanilha(a), produtos, reservas))
    } catch (e) {
      setErro(e.message || 'Não consegui ler esse arquivo.')
    } finally {
      setLendo(false)
      if (entrada.current) entrada.current.value = ''
    }
  }

  const lista = resultado?.reservas ?? []
  const comErro = lista.filter((r) => r.erros.length)
  const repetidas = lista.filter((r) => r.repetida && !r.erros.length)
  const paraGravar = lista.filter((r) => !r.erros.length && !(pularRepetidas && r.repetida))
  const total = paraGravar.reduce((s, r) => s + r.total, 0)
  const unidades = paraGravar.reduce((s, r) => s + r.itens.reduce((t, i) => t + i.quantidade, 0), 0)

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
          <p>Reservas anotadas do WhatsApp</p>
        </div>
        <button type="button" className="botao-fantasma detalhe__fechar" onClick={aoCancelar} aria-label="Fechar"><IconeFechar /></button>
      </div>

      <div className="detalhe__corpo">
        {!resultado && (
          <ol className="importar__passos">
            <li>
              <span>Baixe o modelo e preencha uma linha por reserva, com a quantidade de cada variedade.</span>
              <button type="button" className="botao botao--secundario botao--pequeno" onClick={() => baixarModelo(produtos)}>
                <IconeBaixar tamanho={16} /> Baixar modelo (.xlsx)
              </button>
            </li>
            <li><span>Escolha a planilha preenchida. O painel mostra tudo antes de gravar.</span></li>
          </ol>
        )}

        <label className={`importar__area${arrastando ? ' importar__area--arrastando' : ''}${resultado ? ' importar__area--pequena' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setArrastando(true) }} onDragLeave={() => setArrastando(false)} onDrop={soltar}>
          <IconeEnviar tamanho={resultado ? 18 : 24} />
          {resultado
            ? <span><strong>{arquivo?.name}</strong> · trocar arquivo</span>
            : <span><strong>Escolher planilha</strong><span className="so-computador"> ou arraste aqui</span><br /><span className="apoio">Excel (.xlsx) ou .csv</span></span>}
          <input ref={entrada} type="file" className="sr-only"
            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            onChange={(e) => abrir(e.target.files?.[0])} />
        </label>

        {lendo && <p className="apoio"><span className="girando" aria-hidden="true" /> Lendo a planilha...</p>}

        {resultado?.problemas?.length > 0 && resultado.problemas.map((p) => <p key={p} className="erro" role="alert">{p}</p>)}

        {lista.length > 0 && (
          <>
            <div className="importar__resumo" role="status">
              <span><strong>{lista.length}</strong> {lista.length === 1 ? 'linha' : 'linhas'}</span>
              {comErro.length > 0 && <span className="importar__conta importar__conta--erro">{comErro.length} com erro</span>}
              {repetidas.length > 0 && <span className="importar__conta">{repetidas.length} já no sistema</span>}
            </div>

            {repetidas.length > 0 && (
              <label className="marcar">
                <input type="checkbox" checked={pularRepetidas} onChange={(e) => setPularRepetidas(e.target.checked)} />
                Pular as {repetidas.length} que parecem repetidas
              </label>
            )}

            <ul className="importar__lista">
              {lista.map((r) => {
                const pulada = !r.erros.length && pularRepetidas && r.repetida
                return (
                  <li key={r.linha} className={r.erros.length ? 'importar__item--erro' : pulada ? 'importar__item--pulada' : undefined}>
                    <div className="importar__linha">
                      <span className="importar__num">{r.linha}</span>
                      <span className="importar__nome">{r.nome || 'Sem nome'}</span>
                      <span className="importar__total">{reais(r.total)}</span>
                    </div>
                    <div className="importar__det">
                      {[telefone(r.whatsapp), r.itens.map((i) => `${i.quantidade} ${i.nome}`).join(', '),
                        r.modo === 'entrega' ? 'Entrega' : 'Retirada', nomeStatus(r.status), r.data && dataCurta(r.data)].filter(Boolean).join(' · ')}
                    </div>
                    {r.erros.map((e) => <div key={e} className="importar__msg importar__msg--erro">{e}</div>)}
                    {!r.erros.length && r.repetida && (
                      <div className="importar__msg">{r.repetida === 'sistema' ? 'Parece já estar no sistema' : 'Repetida nesta planilha'}{pulada ? ' · será pulada' : ''}</div>
                    )}
                    {!r.erros.length && r.avisos.map((a) => <div key={a} className="importar__msg">{a}</div>)}
                  </li>
                )
              })}
            </ul>

            {comErro.length > 0 && (
              <p className="erro" role="alert">
                Corrija {comErro.length === 1 ? 'a linha com erro' : `as ${comErro.length} linhas com erro`} na planilha e escolha o arquivo de novo.
                Nada é gravado enquanto tiver erro.
              </p>
            )}
          </>
        )}

        {erro && <p className="erro" role="alert">{erro}</p>}

        <div className="form__botoes">
          <button type="button" className="botao botao--secundario" onClick={aoCancelar} disabled={salvando}>Cancelar</button>
          {lista.length > 0 && (
            <button type="button" className="botao botao--principal" onClick={importar}
              disabled={salvando || comErro.length > 0 || paraGravar.length === 0}>
              {salvando ? 'Importando...'
                : paraGravar.length === 0 ? 'Nada para importar'
                  : `Importar ${paraGravar.length} ${paraGravar.length === 1 ? 'reserva' : 'reservas'}`}
            </button>
          )}
        </div>
        {paraGravar.length > 0 && comErro.length === 0 && (
          <p className="apoio importar__rodape">{unidades} {unidades === 1 ? 'pitaya' : 'pitayas'} · {reais(total)} no total</p>
        )}
      </div>
    </div>
  )
}
