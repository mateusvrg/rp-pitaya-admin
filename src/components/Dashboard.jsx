import { useMemo, useState } from 'react'
import { STATUS } from '../lib/dados'
import { reais, unidades } from '../lib/formato'
import { PERIODOS, lerPeriodo, montarPeriodo, salvarPeriodo } from '../lib/periodos'
import { GraficoLinha } from './GraficoLinha'
import { Calendario } from './Calendario'
import { IconeCalendario } from './Icones'

const AGRUPAMENTO = { dia: 'por dia', semana: 'por semana', mes: 'por mês' }

// Variação em relação ao período do mesmo tamanho logo antes, em texto.
// Ex.: "-12% vs. 7 dias anteriores"
function variacao(atual, anterior, anteriores) {
  if (!anterior) return atual ? `sem dados nos ${anteriores}` : null
  const pct = Math.round(((atual - anterior) / anterior) * 100)
  if (pct === 0) return `igual aos ${anteriores}`
  if (pct > 999) return `muito acima dos ${anteriores}`
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
            <span className="barras__valor">{formatar(l.valor)}</span>
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

    const pontos = baldes.map((b) => ({ ...b, valor: 0 }))
    doPeriodo.forEach((r) => {
      const t = new Date(r.criado_em)
      const i = pontos.findIndex((b) => t >= b.inicio && t < b.fim)
      if (i >= 0) pontos[i].valor += 1
    })

    const unidadesPor = new Map()
    validas(doPeriodo).forEach((r) => r.itens.forEach((it) => unidadesPor.set(it.nome, (unidadesPor.get(it.nome) ?? 0) + it.quantidade)))
    const porVariedade = [
      ...produtos.map((p) => ({ nome: p.nome, valor: unidadesPor.get(p.nome) ?? 0 })),
      ...[...unidadesPor].filter(([n]) => !produtos.some((p) => p.nome === n)).map(([nome, valor]) => ({ nome, valor })),
    ].sort((a, b) => b.valor - a.valor)

    const atualValidas = validas(doPeriodo).length
    const antValidas = validas(doAnterior).length
    const atualValor = soma(validas(doPeriodo))
    const antValor = soma(validas(doAnterior))

    return {
      periodo,
      pontos,
      totalValidas: atualValidas,
      variacaoReservas: variacao(atualValidas, antValidas, periodo.anteriores),
      tendReservas: atualValidas > antValidas ? 'sobe' : atualValidas < antValidas ? 'desce' : null,
      unidades: validas(doPeriodo).reduce((s, r) => s + unidades(r), 0),
      valorReservado: atualValor,
      variacaoValor: variacao(atualValor, antValor, periodo.anteriores),
      tendValor: atualValor > antValor ? 'sobe' : atualValor < antValor ? 'desce' : null,
      valorPago: soma(pagas(doPeriodo)),
      qtdPagas: pagas(doPeriodo).length,
      porStatus: STATUS.map((s) => ({ id: s.id, nome: s.plural, cor: `var(--st-${s.id})`, valor: doPeriodo.filter((r) => r.status === s.id).length })),
      porVariedade,
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
            <span>{escolha.id === 'custom' ? `${curta(escolha.de)} – ${curta(escolha.ate)}` : 'Personalizado'}</span>
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
        <Metrica rotulo="Pitayas reservadas" valor={dados.unidades} detalhe="unidades, sem as canceladas" />
        <Metrica rotulo="Valor reservado" valor={reais(dados.valorReservado)} detalhe={dados.variacaoValor} tendencia={dados.tendValor} />
        <Metrica rotulo="Valor pago" valor={reais(dados.valorPago)} detalhe={`${dados.qtdPagas} ${dados.qtdPagas === 1 ? 'reserva paga ou entregue' : 'reservas pagas ou entregues'}`} />
      </section>

      <section className="bloco-grafico bloco-grafico--largo">
        <h2>Reservas {AGRUPAMENTO[dados.periodo.agrupar]}</h2>
        <p className="apoio">{dados.periodo.descricao}, todas as reservas recebidas.</p>
        <GraficoLinha pontos={dados.pontos} descricao={`Reservas ${AGRUPAMENTO[dados.periodo.agrupar]}, ${dados.periodo.nome}`} />
        <Tabela cabecalho={['Período', 'Reservas']} linhas={[...dados.pontos].reverse().map((p) => [p.rotuloLongo, p.valor])} />
      </section>

      <div className="graficos">
        <section className="bloco-grafico">
          <h2>Reservas por status</h2>
          <p className="apoio">Toque em um status para ver as reservas.</p>
          <BarrasHorizontais linhas={dados.porStatus} aoClicar={(l) => irPara('reservas', l.id)} />
        </section>
        <section className="bloco-grafico">
          <h2>Pitayas por variedade</h2>
          <p className="apoio">Unidades no período, sem as canceladas.</p>
          {dados.porVariedade.every((v) => v.valor === 0)
            ? <p className="apoio vazio-grafico">Nenhuma pitaya reservada neste período.</p>
            : <BarrasHorizontais linhas={dados.porVariedade} formatar={(v) => `${v} un.`} />}
        </section>
      </div>
    </div>
  )
}
