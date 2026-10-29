import { useMemo, useState } from 'react'
import { STATUS } from '../lib/dados'
import { dataCurta, reais, unidades } from '../lib/formato'

const DIAS = 30

function Indicador({ rotulo, valor, detalhe }) {
  return (
    <div className="indicador">
      <p className="indicador__rotulo">{rotulo}</p>
      <p className="indicador__valor">{valor}</p>
      {detalhe && <p className="indicador__detalhe">{detalhe}</p>}
    </div>
  )
}

// Barras horizontais com o valor escrito ao lado (dá para ler sem passar o mouse).
function BarrasHorizontais({ linhas, formatar = (v) => v, aoClicar }) {
  const maximo = Math.max(1, ...linhas.map((l) => l.valor))
  return (
    <ul className="barras">
      {linhas.map((l) => {
        const conteudo = (
          <>
            <span className="barras__nome">{l.nome}</span>
            <span className="barras__trilho">
              <span className="barras__barra" style={{ width: l.valor ? `max(6px, ${(l.valor / maximo) * 100}%)` : 0 }} />
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

// Colunas por dia, com dica ao passar o mouse ou focar.
function ColunasPorDia({ dias }) {
  const [ativo, setAtivo] = useState(null)
  const maximo = Math.max(1, ...dias.map((d) => d.valor))
  const passos = maximo <= 4 ? maximo : 4
  const marcas = Array.from({ length: passos + 1 }, (_, i) => Math.round((maximo / passos) * i))
  const L = 640, A = 200, esq = 28, base = A - 24, larg = (L - esq) / dias.length

  return (
    <div className="colunas">
      <svg viewBox={`0 0 ${L} ${A}`} role="img" aria-label={`Reservas por dia nos últimos ${DIAS} dias`} onMouseLeave={() => setAtivo(null)}>
        {marcas.map((m) => {
          const y = base - (m / maximo) * (base - 12)
          return (
            <g key={m}>
              <line x1={esq} x2={L} y1={y} y2={y} className="colunas__grade" />
              <text x={esq - 6} y={y + 4} className="colunas__eixo" textAnchor="end">{m}</text>
            </g>
          )
        })}
        {dias.map((d, i) => {
          const h = (d.valor / maximo) * (base - 12)
          const x = esq + i * larg
          return (
            <g key={d.chave}>
              <rect x={x} y={0} width={larg} height={base} fill="transparent"
                onMouseEnter={() => setAtivo(i)} onFocus={() => setAtivo(i)} onBlur={() => setAtivo(null)}
                tabIndex={0} aria-label={`${dataCurta(d.data)}: ${d.valor} reserva(s)`} className="colunas__alvo" />
              {d.valor > 0 && (
                <rect x={x + 2} y={base - h} width={Math.max(2, larg - 4)} height={h} rx="3"
                  className={`colunas__barra${ativo === i ? ' colunas__barra--ativa' : ''}`} pointerEvents="none" />
              )}
              {(dias.length - 1 - i) % 7 === 0 && (
                <text x={x + larg / 2} y={A - 6} className="colunas__eixo" textAnchor="middle">{dataCurta(d.data)}</text>
              )}
            </g>
          )
        })}
      </svg>
      {ativo !== null && (
        <div className="dica" style={{ left: `${((esq + ativo * larg + larg / 2) / L) * 100}%` }}>
          <strong>{dias[ativo].valor} {dias[ativo].valor === 1 ? 'reserva' : 'reservas'}</strong>
          <span>{dias[ativo].data.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</span>
        </div>
      )}
    </div>
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

export function Inicio({ reservas, produtos, irPara }) {
  const dados = useMemo(() => {
    const validas = reservas.filter((r) => r.status !== 'cancelada')
    const pagas = reservas.filter((r) => r.status === 'paga' || r.status === 'entregue')

    const porStatus = STATUS.map((s) => ({ id: s.id, nome: s.plural, valor: reservas.filter((r) => r.status === s.id).length }))

    const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
    const dias = Array.from({ length: DIAS }, (_, i) => {
      const data = new Date(hoje); data.setDate(hoje.getDate() - (DIAS - 1 - i))
      return { chave: data.toISOString().slice(0, 10), data, valor: 0 }
    })
    const indice = new Map(dias.map((d, i) => [d.data.toDateString(), i]))
    reservas.forEach((r) => {
      const i = indice.get(new Date(r.criado_em).toDateString())
      if (i !== undefined) dias[i].valor += 1
    })

    const unidadesPor = new Map()
    validas.forEach((r) => r.itens.forEach((it) => unidadesPor.set(it.nome, (unidadesPor.get(it.nome) ?? 0) + it.quantidade)))
    const porVariedade = [
      ...produtos.map((p) => ({ nome: p.nome, valor: unidadesPor.get(p.nome) ?? 0 })),
      ...[...unidadesPor].filter(([n]) => !produtos.some((p) => p.nome === n)).map(([nome, valor]) => ({ nome, valor })),
    ].sort((a, b) => b.valor - a.valor)

    return {
      totalValidas: validas.length,
      novas: reservas.filter((r) => r.status === 'nova').length,
      unidades: validas.reduce((s, r) => s + unidades(r), 0),
      valorReservado: validas.reduce((s, r) => s + r.total_estimado, 0),
      valorPago: pagas.reduce((s, r) => s + r.total_estimado, 0),
      qtdPagas: pagas.length,
      porStatus, dias, porVariedade,
      ultimos7: dias.slice(-7).reduce((s, d) => s + d.valor, 0),
    }
  }, [reservas, produtos])

  if (reservas.length === 0) {
    return (
      <div className="vazio">
        <h2 className="titulo">Ainda não chegou nenhuma reserva</h2>
        <p className="apoio">Assim que alguém reservar pelo site, ela aparece aqui. Confira se as variedades estão com preço e disponibilidade certos.</p>
        <button type="button" className="botao botao--contorno" onClick={() => irPara('variedades')}>Ver variedades</button>
      </div>
    )
  }

  return (
    <div className="inicio">
      {dados.novas > 0 && (
        <button type="button" className="faixa-novas" onClick={() => irPara('reservas', 'nova')}>
          <strong>{dados.novas} {dados.novas === 1 ? 'reserva nova esperando contato' : 'reservas novas esperando contato'}</strong>
          <span>Ver agora</span>
        </button>
      )}

      <section className="indicadores" aria-label="Resumo">
        <Indicador rotulo="Reservas" valor={dados.totalValidas} detalhe={`${dados.ultimos7} nos últimos 7 dias`} />
        <Indicador rotulo="Pitaias reservadas" valor={dados.unidades} detalhe="unidades, sem as canceladas" />
        <Indicador rotulo="Valor reservado" valor={reais(dados.valorReservado)} detalhe="estimado, sem as canceladas" />
        <Indicador rotulo="Valor pago" valor={reais(dados.valorPago)} detalhe={`${dados.qtdPagas} ${dados.qtdPagas === 1 ? 'reserva paga ou entregue' : 'reservas pagas ou entregues'}`} />
      </section>

      <div className="graficos">
        <section className="cartao grafico">
          <h2 className="grafico__titulo">Reservas por status</h2>
          <p className="apoio">Toque em um status para ver as reservas.</p>
          <BarrasHorizontais linhas={dados.porStatus} aoClicar={(l) => irPara('reservas', l.id)} />
        </section>

        <section className="cartao grafico">
          <h2 className="grafico__titulo">Pitaias reservadas por variedade</h2>
          <p className="apoio">Unidades, sem contar as reservas canceladas.</p>
          <BarrasHorizontais linhas={dados.porVariedade} formatar={(v) => `${v} un.`} />
        </section>

        <section className="cartao grafico grafico--largo">
          <h2 className="grafico__titulo">Reservas por dia</h2>
          <p className="apoio">Últimos {DIAS} dias, todas as reservas recebidas.</p>
          <ColunasPorDia dias={dados.dias} />
          <Tabela cabecalho={['Dia', 'Reservas']}
            linhas={dados.dias.filter((d) => d.valor > 0).reverse().map((d) => [d.data.toLocaleDateString('pt-BR'), d.valor])} />
        </section>
      </div>
    </div>
  )
}
