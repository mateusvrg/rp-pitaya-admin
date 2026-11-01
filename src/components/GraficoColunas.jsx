import { useEffect, useRef, useState } from 'react'

function useLargura() {
  const ref = useRef(null)
  const [largura, setLargura] = useState(0)
  useEffect(() => {
    if (!ref.current) return
    const obs = new ResizeObserver(([e]) => setLargura(Math.round(e.contentRect.width)))
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return [ref, largura]
}

function marcasDoEixo(maximo) {
  if (maximo <= 0) return [0, 1]
  const bruto = maximo / 4
  const pot = 10 ** Math.floor(Math.log10(bruto))
  const passo = Math.max(1, [1, 2, 2.5, 5, 10].map((m) => m * pot).find((m) => m >= bruto))
  const topo = Math.ceil(maximo / passo) * passo
  return Array.from({ length: Math.round(topo / passo) + 1 }, (_, i) => +(i * passo).toFixed(6))
}

// Colunas empilhadas: cada período com uma coluna, dividida por série (ex.: Site / WhatsApp / Instagram).
// pontos: [{ rotulo, rotuloLongo, valores: { serieId: n } }]; series: [{ id, nome, cor }]
export function GraficoColunas({ pontos, series, descricao, altura = 260 }) {
  const [ref, largura] = useLargura()
  const [ativo, setAtivo] = useState(null)
  const total = (p) => series.reduce((s, x) => s + (p.valores[x.id] ?? 0), 0)
  const marcas = marcasDoEixo(Math.max(0, ...pontos.map(total)))
  const topo = marcas[marcas.length - 1] || 1
  const esq = 36, dir = 12, cima = 16, baixo = 28
  const L = Math.max(largura, 280)
  const areaL = L - esq - dir, areaA = altura - cima - baixo
  const passo = pontos.length ? areaL / pontos.length : areaL
  const larg = Math.max(3, Math.min(36, passo * 0.62))
  const xc = (i) => esq + passo * i + passo / 2
  const y = (v) => cima + areaA - (v / topo) * areaA
  const maxRotulos = Math.max(2, Math.min(8, Math.floor(areaL / 60)))
  const salto = Math.max(1, Math.ceil(pontos.length / maxRotulos))
  const mostraRotulo = (i) => (pontos.length - 1 - i) % salto === 0

  const aoTeclar = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); setAtivo((a) => Math.min(pontos.length - 1, (a ?? -1) + 1)) }
    if (e.key === 'ArrowLeft') { e.preventDefault(); setAtivo((a) => Math.max(0, (a ?? pontos.length) - 1)) }
    if (e.key === 'Escape') setAtivo(null)
  }
  const p = ativo !== null ? pontos[ativo] : null

  return (
    <div className="linha-grafico" ref={ref}>
      {largura > 0 && (
        <svg width={L} height={altura} role="img" aria-label={descricao} tabIndex={0}
          onKeyDown={aoTeclar} onBlur={() => setAtivo(null)} onMouseLeave={() => setAtivo(null)}>
          {marcas.map((m) => (
            <g key={m}>
              <line x1={esq} x2={L - dir} y1={y(m)} y2={y(m)} className="linha-grafico__grade" />
              <text x={esq - 8} y={y(m) + 4} textAnchor="end" className="linha-grafico__eixo">{m}</text>
            </g>
          ))}
          {pontos.map((pt, i) => {
            let base = 0
            return (
              <g key={i} className="colunas-empilhadas__coluna" style={{ opacity: ativo === null || ativo === i ? 1 : 0.45 }}>
                {series.map((s) => {
                  const v = pt.valores[s.id] ?? 0
                  if (!v) return null
                  const y1 = y(base + v), y0 = y(base)
                  base += v
                  return <rect key={s.id} x={xc(i) - larg / 2} y={y1} width={larg} height={Math.max(0, y0 - y1 - 1)} rx={Math.min(3, larg / 4)} fill={s.cor} />
                })}
              </g>
            )
          })}
          {pontos.map((pt, i) => mostraRotulo(i) && (
            <text key={`r${i}`} x={xc(i)} y={altura - 8} textAnchor="middle" className="linha-grafico__eixo">{pt.rotulo}</text>
          ))}
          {pontos.map((pt, i) => (
            <rect key={`h${i}`} x={esq + passo * i} y={cima} width={passo} height={areaA} fill="transparent"
              onMouseEnter={() => setAtivo(i)} onTouchStart={() => setAtivo(i)} />
          ))}
        </svg>
      )}
      {p && (
        <div className="dica dica--colunas" style={{ left: Math.min(Math.max(xc(ativo), 90), L - 90), top: y(total(p)) }} role="status">
          <strong>{total(p)} {total(p) === 1 ? 'reserva' : 'reservas'}</strong>
          <span>{p.rotuloLongo}</span>
          {series.filter((s) => p.valores[s.id]).map((s) => (
            <span key={s.id} className="dica__serie"><i style={{ background: s.cor }} />{s.nome}: {p.valores[s.id]}</span>
          ))}
        </div>
      )}
    </div>
  )
}
