import { useEffect, useMemo, useRef, useState } from 'react'
import { CANAIS, STATUS, canalDe, nomeStatus, peloCanal } from '../lib/dados'
import { exportarReservas } from '../lib/importar'
import { dataHora, reais, resumoItens, semAcento } from '../lib/formato'
import { DetalheReserva } from './DetalheReserva'
import { NovaReserva } from './NovaReserva'
import { MenuPlanilha } from './MenuPlanilha'
import { ImportarReservas } from './ImportarReservas'
import { AcoesEmMassa } from './AcoesEmMassa'
import { Calendario } from './Calendario'
import { FiltroCelular } from './FiltroCelular'
import { useBarraFixa } from './useBarraFixa'
import { MaisItens, usePaginacao } from './MaisItens'
import { IconeBusca, IconeSetaBaixo, IconeCalendario, IconeFechar, IconeReservas, IconeMais, IconeWhatsApp, IconeInstagram, IconeSite } from './Icones'

// Mostra o ano só quando não é o ano atual (ex.: 20/03/25).
const curta = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', ...(d.getFullYear() !== new Date().getFullYear() && { year: '2-digit' }) })

export function Selo({ status }) {
  return <span className={`selo selo--${status}`}><span className="selo__ponto" aria-hidden="true" />{nomeStatus(status)}</span>
}

export function Reservas({ reservas, produtos, filtroInicial, selecionada, aoSelecionar, aoAtualizar, aoRecarregar }) {
  const doCanal = filtroInicial?.startsWith('canal:') ? filtroInicial.slice(6) : null
  const [filtro, setFiltro] = useState(doCanal ? 'todas' : (filtroInicial ?? 'ativas'))
  const [busca, setBusca] = useState('')
  const barra = useBarraFixa()
  const [recado, setRecado] = useState('')
  const [marcadas, setMarcadas] = useState(() => new Set())
  const [acoesAbertas, setAcoesAbertas] = useState(false) // celular: painel de ações em tela cheia
  const [periodo, setPeriodo] = useState(null) // { de, ate } escolhido no calendário, ou null = qualquer data
  const [calendarioAberto, setCalendarioAberto] = useState(false)
  const [canal, setCanal] = useState(doCanal) // null = todos, 'site', 'whatsapp' ou 'instagram'
  const [lancando, setLancando] = useState(null) // null | 'nova' | 'importar' (painel da direita)

  // Abrir uma reserva da lista fecha o formulário de nova reserva / importação.
  useEffect(() => { if (selecionada) setLancando(null) }, [selecionada])
  // Ao digitar na busca, tira todos os filtros (status, canal e período) para procurar em todas as reservas.
  const buscar = (texto) => {
    setBusca(texto)
    if (texto.trim()) { setFiltro('todas'); setCanal(null); setPeriodo(null); setCalendarioAberto(false) }
  }
  const abrirLancamento = (qual) => { setMarcadas(new Set()); aoSelecionar(null); setLancando(qual) }
  const lancou = (texto) => { setLancando(null); setRecado(texto); aoRecarregar() }

  // Trocar de filtro ou buscar limpa a seleção, para não agir em reservas que não estão na tela.
  useEffect(() => { setMarcadas(new Set()); ultima.current = null }, [filtro, busca, periodo, canal])
  useEffect(() => { if (marcadas.size === 0) setAcoesAbertas(false) }, [marcadas])

  useEffect(() => {
    if (!recado) return
    const t = setTimeout(() => setRecado(''), 3500)
    return () => clearTimeout(t)
  }, [recado])

  // Reservas feitas dentro do período escolhido (do primeiro dia 00:00 até o fim do último dia).
  const noPeriodo = useMemo(() => {
    if (!periodo) return reservas
    const inicio = new Date(periodo.de); inicio.setHours(0, 0, 0, 0)
    const fim = new Date(periodo.ate); fim.setHours(23, 59, 59, 999)
    return reservas.filter((r) => { const d = new Date(r.criado_em); return d >= inicio && d <= fim })
  }, [reservas, periodo])
  // Canal: por onde a reserva chegou (site, WhatsApp ou Instagram).
  const canais = CANAIS.map((c) => ({ ...c, qtd: noPeriodo.filter((r) => peloCanal(r, c.id)).length }))
  const doPeriodo = useMemo(() => noPeriodo.filter((r) => peloCanal(r, canal)), [noPeriodo, canal])

  const contagem = useMemo(() => {
    const c = Object.fromEntries(STATUS.map((s) => [s.id, 0]))
    doPeriodo.forEach((r) => { c[r.status] = (c[r.status] ?? 0) + 1 })
    return c
  }, [doPeriodo])

  const filtros = [
    { id: 'ativas', nome: 'Em aberto', qtd: contagem.nova + contagem.em_contato + contagem.paga },
    ...STATUS.map((s) => ({ id: s.id, nome: s.plural, qtd: contagem[s.id] })),
    { id: 'todas', nome: 'Todas', qtd: doPeriodo.length },
  ]

  const visiveis = useMemo(() => {
    const termo = semAcento(busca.trim())
    const digitos = busca.replace(/\D/g, '')
    return doPeriodo.filter((r) => {
      const passa = filtro === 'todas' || (filtro === 'ativas' ? ['nova', 'em_contato', 'paga'].includes(r.status) : r.status === filtro)
      if (!passa) return false
      if (!termo) return true
      return semAcento(r.nome).includes(termo) || (digitos.length >= 3 && r.whatsapp.includes(digitos))
    })
  }, [doPeriodo, filtro, busca])
  // Lista mostra 10 por vez; trocar de filtro ou buscar volta para 10.
  const pag = usePaginacao(visiveis.length, [filtro, busca, periodo, canal])

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

  // Clique na faixa marca/desmarca. Com Shift (computador), marca todas entre a última clicada e esta.
  const ultima = useRef(null)
  const clicarFaixa = (e, i) => {
    const id = visiveis[i].id
    if (e.shiftKey && ultima.current != null) {
      const [de, ate] = [Math.min(ultima.current, i), Math.max(ultima.current, i)]
      setMarcadas((m) => { const n = new Set(m); visiveis.slice(de, ate + 1).forEach((r) => n.add(r.id)); return n })
    } else {
      alternar(id)
    }
    ultima.current = i
  }

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
    <div className={`reservas${(selecionando ? acoesAbertas : (atual || lancando)) ? ' reservas--com-detalhe' : ''}${selecionando ? ' reservas--selecionando' : ''}`}>
      <div className="reservas__lista">
        {/* Busca e filtros ficam presos no topo ao rolar a lista (no celular, só a busca + setinha) */}
        <div ref={barra.sentinela} className="barra-filtros__marca" aria-hidden="true" />
        <div className={`barra-filtros${barra.presa ? ' barra-filtros--presa' : ''}${barra.aberta ? ' barra-filtros--aberta' : ''}`}>
        <div className="ferramentas">
          <label className="busca">
            <IconeBusca tamanho={18} />
            <span className="sr-only">Buscar por nome ou telefone</span>
            <input type="search" placeholder="Buscar por nome ou telefone" value={busca} onChange={(e) => buscar(e.target.value)} />
          </label>
          {/* Celular, com a lista rolada: setinha para mostrar de novo os filtros, o período e a planilha */}
          <button type="button" className="filtro-seta" aria-expanded={barra.aberta} onClick={barra.alternar}
            aria-label={barra.aberta ? 'Esconder filtros' : 'Mostrar filtros'} title="Filtros">
            <IconeSetaBaixo tamanho={18} />
          </button>
          <div className="ferramentas__botoes">
            <MenuPlanilha total={visiveis.length} aoImportar={() => abrirLancamento('importar')}
              aoExportar={() => exportarReservas(produtos, visiveis)} />
            <button type="button" className="botao botao--principal botao--nova" aria-label="Nova reserva" onClick={() => abrirLancamento('nova')}>
              <IconeMais tamanho={18} /> <span className="so-computador">Nova reserva</span>
            </button>
          </div>
        </div>

        <div className="filtros-linha">
          <FiltroCelular titulo="Filtrar reservas" opcoes={filtros} valor={filtro} aoEscolher={setFiltro}
            extras={{ titulo: 'Canal', opcoes: canais, valor: canal, aoEscolher: (id) => setCanal((c) => (c === id ? null : id)) }} />
          <div className="segmentos segmentos--filtros segmentos--status" role="group" aria-label="Filtrar por status">
            {filtros.map((f) => (
              <button key={f.id} type="button" className="segmento" aria-pressed={filtro === f.id} onClick={() => setFiltro(f.id)}>
                {f.nome}<span className="segmento__qtd">{f.qtd}</span>
              </button>
            ))}
          </div>

          {/* Cada grupo numa linha: status em cima; canal e período embaixo */}
          <span className="filtros-quebra" aria-hidden="true" />
          <div className="segmentos segmentos--filtros" role="group" aria-label="Filtrar por canal">
            {canais.map((o) => (
              <button key={o.id} type="button" className="segmento" aria-pressed={canal === o.id}
                title={`Só reservas que chegaram pelo ${o.nome}`}
                onClick={() => setCanal((x) => (x === o.id ? null : o.id))}>
                {o.nome}<span className="segmento__qtd">{o.qtd}</span>
              </button>
            ))}
          </div>

          <div className="filtro-periodo">
            <div className="segmentos">
              <button type="button" className="segmento segmento--calendario" aria-pressed={Boolean(periodo)}
                aria-expanded={calendarioAberto} aria-label={periodo ? undefined : "Período"} onClick={() => setCalendarioAberto((a) => !a)}>
                <IconeCalendario tamanho={16} />
                {periodo ? <span>{periodo.de.getTime() === periodo.ate.getTime() ? curta(periodo.de) : `${curta(periodo.de)} – ${curta(periodo.ate)}`}</span> : <span className="periodo-rotulo">Período</span>}
              </button>
              {periodo && (
                <button type="button" className="segmento segmento--limpar" onClick={() => setPeriodo(null)} aria-label="Tirar o filtro de período">
                  <IconeFechar tamanho={15} />
                </button>
              )}
            </div>
            {calendarioAberto && (
              <Calendario inicial={periodo} aoFechar={() => setCalendarioAberto(false)}
                aoAplicar={({ de, ate }) => { setPeriodo({ de, ate }); setCalendarioAberto(false) }} />
            )}
          </div>
        </div>
        </div>

        {visiveis.length === 0 ? (
          <div className="vazio">
            <p>{busca ? `Nenhuma reserva encontrada para "${busca}".` : periodo ? 'Nenhuma reserva neste filtro e período.' : 'Nenhuma reserva neste filtro.'}</p>
            {(busca || filtro !== 'todas' || periodo || canal) && (
              <button type="button" className="link" onClick={() => { setBusca(''); setFiltro('todas'); setPeriodo(null); setCanal(null) }}>Ver todas</button>
            )}
          </div>
        ) : (
          <div className="linhas">
          <div className="selecionar-todas">
            <button type="button" className={`linha__faixa${selecionando && !todasMarcadas ? ' linha__faixa--parcial' : ''}`}
              aria-pressed={todasMarcadas} aria-label={todasMarcadas ? 'Desmarcar todas' : 'Selecionar todas'} onClick={alternarTodas} />
            <span className="selecionar-todas__texto">
              {selecionando
                ? <>{listaMarcadas.length} de {visiveis.length}<span className="so-computador">&nbsp;selecionadas</span></>
                : <span className="so-computador">Use a faixa à esquerda para selecionar</span>}
            </span>
            <button type="button" className="selecionar-todas__botao" onClick={alternarTodas}>
              {todasMarcadas ? 'Desmarcar todas' : `Selecionar todas (${visiveis.length})`}
            </button>
          </div>
          <ul aria-label={`${visiveis.length} reservas`}>
            {visiveis.slice(0, pag.limite).map((r, i) => (
              <li key={r.id} {...pag.linha(i)} className={[marcadas.has(r.id) && 'linha-marcada', pag.linha(i).className].filter(Boolean).join(' ') || undefined}>
                <button type="button" className="linha__faixa" aria-pressed={marcadas.has(r.id)}
                  aria-label={`Selecionar reserva de ${r.nome}`} onClick={(e) => clicarFaixa(e, i)} />
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
                  <span className="linha__data">
                    {dataHora(r.criado_em)}
                    {canalDe(r) === 'site' && <span className="origem-tag"><IconeSite tamanho={13} />Site</span>}
                    {canalDe(r) === 'whatsapp' && <span className="origem-tag origem-tag--whatsapp"><IconeWhatsApp tamanho={13} />WhatsApp</span>}
                    {canalDe(r) === 'instagram' && <span className="origem-tag origem-tag--instagram"><IconeInstagram tamanho={13} />Instagram</span>}
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <MaisItens pag={pag} />
          </div>
        )}
      </div>

      <section className="reservas__detalhe" aria-label="Detalhe da reserva">
        {selecionando ? (
          <AcoesEmMassa reservas={listaMarcadas} produtos={produtos} aoDesmarcar={alternar} aoLimpar={limpar}
            aoVoltar={() => setAcoesAbertas(false)} aoAtualizar={atualizarEmMassa} />
        ) : lancando === 'nova' ? (
          <NovaReserva produtos={produtos} aoCancelar={() => setLancando(null)}
            aoLancar={(nome) => lancou(`Reserva de ${nome} lançada.`)} />
        ) : lancando === 'importar' ? (
          <ImportarReservas produtos={produtos} reservas={reservas} aoCancelar={() => setLancando(null)}
            aoImportar={(n) => lancou(`${n} ${n === 1 ? 'reserva importada' : 'reservas importadas'}.`)} />
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
