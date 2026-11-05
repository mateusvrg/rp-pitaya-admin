import { useMemo, useState } from 'react'
import { CANAIS, STATUS, canalDe } from '../lib/dados'
import { kg, numeroKg, qtd, quilos, reais, resumoQtd, resumoReservas, unidadeDe } from '../lib/formato'
import { PERIODOS, lerPeriodo, montarPeriodo, salvarPeriodo } from '../lib/periodos'
import { GraficoLinha } from './GraficoLinha'
import { GraficoColunas } from './GraficoColunas'
import { Calendario } from './Calendario'
import { IconeCalendario } from './Icones'

const AGRUPAMENTO = { dia: 'por dia', semana: 'por semana', mes: 'por mês' }

// Variação em relação ao período do mesmo tamanho logo antes, em texto.
// Ex.: "-12% vs. 7 dias anteriores"
function variacao(atual, anterior, anteriores) {
  const plural = anteriores.endsWith('es') // "7 dias anteriores" x "dia anterior"
  if (!anterior) return atual ? `sem dados ${plural ? 'nos' : 'no'} ${anteriores}` : null
  const pct = Math.round(((atual - anterior) / anterior) * 100)
  if (pct === 0) return `igual ${plural ? 'aos' : 'ao'} ${anteriores}`
  if (pct > 999) return `muito acima ${plural ? 'dos' : 'do'} ${anteriores}`
  return `${pct > 0 ? '+' : '−'}${Math.abs(pct)}% vs. ${anteriores}`
}

function Metrica({ rotulo, valor, detalhe, tendencia }) {
  return (
    <div className="metrica">
      <p className="metrica__rotulo">{rotulo}</p>
      <p className="metrica__valor" key={String(valor)}>{valor}</p>
      {detalhe && <p key={String(detalhe)} className={`metrica__detalhe${tendencia ? ` metrica__detalhe--${tendencia}` : ''}`}>{detalhe}</p>}
    </div>
  )
}

function BarrasHorizontais({ linhas, formatar = (v) => v, aoClicar }) {
  const maximo = Math.max(1, ...linhas.map((l) => l.valor))
  return (
    <ul className="barras">
      {linhas.map((l) => {
        const conteudo = (
          <>
            <span className="barras__nome">{l.nome}</span>
            <span className="barras__trilho">
              <span className="barras__barra" style={{ width: l.valor ? `max(6px, ${(l.valor / maximo) * 100}%)` : 0, ...(l.cor ? { background: l.cor } : {}) }} />
            </span>
            <span className="barras__valor">{formatar(l.valor, l)}</span>
          </>
        )
        return (
          <li key={l.nome}>
            {aoClicar
              ? <button type="button" className="barras__linha barras__linha--botao" onClick={() => aoClicar(l)}>{conteudo}</button>
              : <div className="barras__linha">{conteudo}</div>}
          </li>
        )
      })}
    </ul>
  )
}

// Cores dos canais nos gráficos (as mesmas dos selos da lista: WhatsApp verde, Instagram rosa).
const COR_CANAL = { site: '#64748B', whatsapp: '#16A34A', instagram: '#D62976' }
const pct = (v, total) => (total ? Math.round((v / total) * 100) : 0)

// Uma barra dividida em partes (a "pizza" deitada) e, embaixo, a lista com número, % e valor de cada parte.
function BarraDividida({ partes, aoClicar, vazio }) {
  const total = partes.reduce((s, p) => s + p.valor, 0)
  if (!total) return <p className="apoio vazio-grafico">{vazio}</p>
  return (
    <>
      <div className="dividida" role="img" aria-label={partes.map((p) => `${p.nome}: ${pct(p.valor, total)}%`).join(', ')}>
        {partes.filter((p) => p.valor).map((p) => (
          <span key={p.id} className="dividida__parte" style={{ flexGrow: p.valor, background: p.cor }} title={`${p.nome}: ${pct(p.valor, total)}%`} />
        ))}
      </div>
      <ul className="dividida__lista">
        {partes.map((p) => {
          const conteudo = (
            <>
              <span className="dividida__nome"><i style={{ background: p.cor }} />{p.nome}</span>
              <span className="dividida__qtd">{p.valor}</span>
              <span className="dividida__pct">{pct(p.valor, total)}%</span>
              <span className="dividida__extra">{p.extra}</span>
            </>
          )
          return (
            <li key={p.id}>
              {aoClicar
                ? <button type="button" className="dividida__linha dividida__linha--botao" onClick={() => aoClicar(p)}>{conteudo}</button>
                : <div className="dividida__linha">{conteudo}</div>}
            </li>
          )
        })}
      </ul>
    </>
  )
}

function Tabela({ cabecalho, linhas }) {
  return (
    <details className="ver-tabela">
      <summary>Ver em tabela</summary>
      <div className="tabela-caixa">
        <table>
          <thead><tr>{cabecalho.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
          <tbody>{linhas.map((l, i) => <tr key={i}>{l.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </details>
  )
}

export function Dashboard({ reservas, produtos, irPara }) {
  const [escolha, setEscolha] = useState(lerPeriodo)
  const [calendarioAberto, setCalendarioAberto] = useState(false)
  const [visao, setVisao] = useState('total') // gráfico principal: 'total' (linha) ou 'canal' (colunas por canal)
  const escolher = (nova) => { setEscolha(nova); salvarPeriodo(nova); setCalendarioAberto(false) }
  // Mostra o ano só quando não é o ano atual (ex.: 20/03/25).
const curta = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', ...(d.getFullYear() !== new Date().getFullYear() && { year: '2-digit' }) })

  const dados = useMemo(() => {
    const { periodo, inicio, fim, anterior, baldes } = montarPeriodo(escolha.id, new Date(), escolha)
    const naJanela = (r, de, ate) => { const t = new Date(r.criado_em); return t >= de && t < ate }
    const doPeriodo = reservas.filter((r) => naJanela(r, inicio, fim))
    const doAnterior = reservas.filter((r) => naJanela(r, anterior.inicio, anterior.fim))

    const validas = (l) => l.filter((r) => r.status !== 'cancelada')
    const pagas = (l) => l.filter((r) => r.status === 'paga' || r.status === 'entregue')
    const soma = (l) => l.reduce((s, r) => s + r.total_estimado, 0)

    const pontos = baldes.map((b) => ({ ...b, valor: 0, valores: {} }))
    doPeriodo.forEach((r) => {
      const t = new Date(r.criado_em)
      const i = pontos.findIndex((b) => t >= b.inicio && t < b.fim)
      if (i >= 0) { pontos[i].valor += 1; const c = canalDe(r); pontos[i].valores[c] = (pontos[i].valores[c] ?? 0) + 1 }
    })

    // Por canal e por recebimento: sem as canceladas.
    const val = validas(doPeriodo)
    const porCanal = CANAIS.map((c) => {
      const l = val.filter((r) => canalDe(r) === c.id)
      return { id: c.id, nome: c.nome, cor: COR_CANAL[c.id], valor: l.length, extra: reais(soma(l)) }
    })
    const porModo = [['entrega', 'Entrega', '#2563EB'], ['retirada', 'Retirada', '#D97706']].map(([id, nome, cor]) => {
      const l = val.filter((r) => r.modo === id)
      return { id, nome, cor, valor: l.length, extra: resumoReservas(l) }
    })

    // Por variedade, separando quilos (pitayas) e unidades (mudas): não dá para somar kg com mudas.
    const somaPor = new Map()
    validas(doPeriodo).forEach((r) => r.itens.forEach((it) => {
      const chave = `${it.nome}|${it.unidade}`
      somaPor.set(chave, Math.round(((somaPor.get(chave) ?? 0) + it.quantidade) * 100) / 100)
    }))
    const linhasVar = [
      ...produtos.map((p) => ({ nome: p.nome, unidade: unidadeDe(p), valor: somaPor.get(`${p.nome}|${unidadeDe(p)}`) ?? 0 })),
      ...[...somaPor].filter(([c]) => !produtos.some((p) => `${p.nome}|${unidadeDe(p)}` === c))
        .map(([c, valor]) => { const [nome, unidade] = c.split('|'); return { nome: unidade === 'kg' ? nome : `${nome} (${unidade})`, unidade, valor } }),
    ].sort((a, b) => b.valor - a.valor)
    const porVariedade = linhasVar.filter((l) => l.unidade === 'kg')
    const porUnidadeVar = linhasVar.filter((l) => l.unidade !== 'kg')
    const outrasUnidades = resumoQtd(validas(doPeriodo).flatMap((r) => r.itens.filter((i) => i.unidade !== 'kg')))
    const temUnidades = validas(doPeriodo).some((r) => r.itens.some((i) => i.unidade !== 'kg'))

    const atualValidas = validas(doPeriodo).length
    const antValidas = validas(doAnterior).length
    const atualValor = soma(validas(doPeriodo))
    const antValor = soma(validas(doAnterior))
    const ticket = atualValidas ? atualValor / atualValidas : 0
    const ticketAnt = antValidas ? antValor / antValidas : 0

    return {
      periodo,
      pontos,
      totalValidas: atualValidas,
      variacaoReservas: variacao(atualValidas, antValidas, periodo.anteriores),
      tendReservas: atualValidas > antValidas ? 'sobe' : atualValidas < antValidas ? 'desce' : null,
      quilos: Math.round(validas(doPeriodo).reduce((s, r) => s + quilos(r), 0) * 100) / 100,
      valorReservado: atualValor,
      variacaoValor: variacao(atualValor, antValor, periodo.anteriores),
      tendValor: atualValor > antValor ? 'sobe' : atualValor < antValor ? 'desce' : null,
      valorPago: soma(pagas(doPeriodo)),
      qtdPagas: pagas(doPeriodo).length,
      porStatus: STATUS.map((s) => ({ id: s.id, nome: s.plural, cor: `var(--st-${s.id})`, valor: doPeriodo.filter((r) => r.status === s.id).length })),
      porVariedade,
      porUnidadeVar,
      outrasUnidades: temUnidades ? outrasUnidades : null,
      porCanal,
      porModo,
      ticket,
      variacaoTicket: atualValidas ? variacao(Math.round(ticket * 100), Math.round(ticketAnt * 100), periodo.anteriores) : null,
      // Cor só quando a mudança aparece no texto (arredondado); "igual" fica neutro.
      tendTicket: !ticketAnt || Math.round(((ticket - ticketAnt) / ticketAnt) * 100) === 0 ? null : ticket > ticketAnt ? 'sobe' : 'desce',
      vazio: doPeriodo.length === 0,
    }
  }, [reservas, produtos, escolha])

  const novas = reservas.filter((r) => r.status === 'nova').length

  if (reservas.length === 0) {
    return (
      <div className="vazio vazio--grande">
        <h2>Ainda não chegou nenhuma reserva</h2>
        <p>Assim que alguém reservar pelo site, ela aparece aqui. Confira se as variedades estão com preço e disponibilidade certos.</p>
        <button type="button" className="botao" onClick={() => irPara('variedades')}>Ver variedades</button>
      </div>
    )
  }

  return (
    <div className="inicio">
      {novas > 0 && (
        <button type="button" className="alerta" onClick={() => irPara('reservas', 'nova')}>
          <span className="alerta__ponto" aria-hidden="true" />
          <span className="alerta__texto">{novas} {novas === 1 ? 'reserva nova esperando contato' : 'reservas novas esperando contato'}</span>
          <span className="alerta__acao">Ver</span>
        </button>
      )}

      <div className="periodos-area">
        <div className="periodos" role="group" aria-label="Período do dashboard">
          {PERIODOS.map((p) => (
            <button key={p.id} type="button" className="segmento" aria-pressed={escolha.id === p.id} onClick={() => escolher({ id: p.id })}>
              {p.nome}
            </button>
          ))}
          <button type="button" className="segmento segmento--calendario" aria-pressed={escolha.id === 'custom'}
            aria-expanded={calendarioAberto} onClick={() => setCalendarioAberto((a) => !a)}>
            <IconeCalendario tamanho={16} />
            <span>{escolha.id === 'custom' ? (escolha.de.getTime() === escolha.ate.getTime() ? curta(escolha.de) : `${curta(escolha.de)} – ${curta(escolha.ate)}`) : 'Personalizado'}</span>
          </button>
        </div>
        {calendarioAberto && (
          <Calendario inicial={escolha.id === 'custom' ? escolha : null}
            aoFechar={() => setCalendarioAberto(false)}
            aoAplicar={({ de, ate }) => escolher({ id: 'custom', de, ate })} />
        )}
      </div>

      <section className="metricas" aria-label={`Resumo: ${dados.periodo.nome}`}>
        <Metrica rotulo="Reservas" valor={dados.totalValidas} detalhe={dados.variacaoReservas} tendencia={dados.tendReservas} />
        <Metrica rotulo="Quilos reservados" valor={numeroKg(dados.quilos)}
          detalhe={dados.outrasUnidades ? `kg, sem as canceladas · mais ${dados.outrasUnidades}` : 'kg, sem as canceladas'} />
        <Metrica rotulo="Valor reservado" valor={reais(dados.valorReservado)} detalhe={dados.variacaoValor} tendencia={dados.tendValor} />
        <Metrica rotulo="Valor pago" valor={reais(dados.valorPago)} detalhe={`${dados.qtdPagas} ${dados.qtdPagas === 1 ? 'reserva paga ou entregue' : 'reservas pagas ou entregues'}`} />
        <Metrica rotulo="Ticket médio" valor={reais(dados.ticket)} detalhe={dados.variacaoTicket ?? 'por reserva, sem as canceladas'} tendencia={dados.tendTicket} />
      </section>

      <section className="bloco-grafico bloco-grafico--largo">
        <div className="bloco-grafico__topo">
          <div>
            <h2>Reservas {AGRUPAMENTO[dados.periodo.agrupar]}</h2>
            <p className="apoio">{dados.periodo.descricao}, todas as reservas recebidas{visao === 'canal' ? ', por canal' : ''}.</p>
          </div>
          <div className="segmentos segmentos--pequeno" role="group" aria-label="Como mostrar">
            <button type="button" className="segmento" aria-pressed={visao === 'total'} onClick={() => setVisao('total')}>Total</button>
            <button type="button" className="segmento" aria-pressed={visao === 'canal'} onClick={() => setVisao('canal')}>Por canal</button>
          </div>
        </div>
        {visao === 'total'
          ? <GraficoLinha pontos={dados.pontos} descricao={`Reservas ${AGRUPAMENTO[dados.periodo.agrupar]}, ${dados.periodo.nome}`} />
          : (
            <>
              <GraficoColunas pontos={dados.pontos} series={CANAIS.map((c) => ({ ...c, cor: COR_CANAL[c.id] }))}
                descricao={`Reservas por canal ${AGRUPAMENTO[dados.periodo.agrupar]}, ${dados.periodo.nome}`} />
              <p className="legenda">{CANAIS.map((c) => <span key={c.id}><i style={{ background: COR_CANAL[c.id] }} />{c.nome}</span>)}</p>
            </>
          )}
        <Tabela cabecalho={['Período', 'Reservas', ...CANAIS.map((c) => c.nome)]}
          linhas={[...dados.pontos].reverse().map((p) => [p.rotuloLongo, p.valor, ...CANAIS.map((c) => p.valores[c.id] ?? 0)])} />
      </section>

      <div className="graficos">
        <section className="bloco-grafico">
          <h2>Reservas por canal</h2>
          <p className="apoio">De onde vieram as reservas do período, sem as canceladas. Toque para ver.</p>
          <BarraDividida partes={dados.porCanal} vazio="Nenhuma reserva neste período."
            aoClicar={(p) => irPara('reservas', `canal:${p.id}`)} />
        </section>
        <section className="bloco-grafico">
          <h2>Entrega ou retirada</h2>
          <p className="apoio">Como as reservas do período vão chegar ao cliente, sem as canceladas.</p>
          <BarraDividida partes={dados.porModo} vazio="Nenhuma reserva neste período." />
        </section>
        <section className="bloco-grafico">
          <h2>Reservas por status</h2>
          <p className="apoio">Toque em um status para ver as reservas.</p>
          <BarrasHorizontais linhas={dados.porStatus} aoClicar={(l) => irPara('reservas', l.id)} />
        </section>
        <section className="bloco-grafico">
          <h2>Quilos por variedade</h2>
          <p className="apoio">Quilos no período, sem as canceladas.</p>
          {dados.porVariedade.every((v) => v.valor === 0)
            ? <p className="apoio vazio-grafico">Nenhuma pitaya reservada neste período.</p>
            : <BarrasHorizontais linhas={dados.porVariedade} formatar={(v) => kg(v)} />}
        </section>
        {/* Mudas e outros vendidos por unidade: só aparece quando existe algum. */}
        {dados.porUnidadeVar.length > 0 && (
          <section className="bloco-grafico">
            <h2>Mudas e outros por unidade</h2>
            <p className="apoio">Unidades no período, sem as canceladas.</p>
            {dados.porUnidadeVar.every((v) => v.valor === 0)
              ? <p className="apoio vazio-grafico">Nada reservado por unidade neste período.</p>
              : <BarrasHorizontais linhas={dados.porUnidadeVar} formatar={(v, l) => qtd(v, l.unidade)} />}
          </section>
        )}
      </div>
    </div>
  )
}
