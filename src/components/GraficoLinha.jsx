import { useEffect, useId, useRef, useState } from 'react'

// Mede a largura real do contêiner para desenhar o gráfico em pixels de verdade
// (assim o texto dos eixos não encolhe no celular).
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

// Escala "bonita" para o eixo: 0, 5, 10, 15...
function marcasDoEixo(maximo) {
  if (maximo <= 0) return [0, 1]
  const bruto = maximo / 4
  const pot = 10 ** Math.floor(Math.log10(bruto))
  // Contagens são inteiras: o passo nunca é menor que 1.
  const passo = Math.max(1, [1, 2, 2.5, 5, 10].map((m) => m * pot).find((m) => m >= bruto))
  const topo = Math.ceil(maximo / passo) * passo
  return Array.from({ length: Math.round(topo / passo) + 1 }, (_, i) => +(i * passo).toFixed(6))
}

// Gráfico de linha com área em degradê, linha-guia e dica ao passar o mouse, tocar ou usar as setas.
export function GraficoLinha({ pontos, descricao, formatar = (v) => v, altura = 260 }) {
  const [ref, largura] = useLargura()
  const [ativo, setAtivo] = useState(null)
  const idGradiente = useId().replace(/:/g, '')

  const marcas = marcasDoEixo(Math.max(0, ...pontos.map((p) => p.valor)))
  const topo = marcas[marcas.length - 1] || 1
  const esq = 36, dir = 12, cima = 16, baixo = 28
  const L = Math.max(largura, 280)
  const areaL = L - esq - dir, areaA = altura - cima - baixo
  const passoX = pontos.length > 1 ? areaL / (pontos.length - 1) : 0
  const x = (i) => esq + (pontos.length > 1 ? i * passoX : areaL / 2)
  const y = (v) => cima + areaA - (v / topo) * areaA

  const linha = pontos.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(' ')
  const area = pontos.length ? `${linha} L${x(pontos.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z` : ''

  // Rótulos do eixo X: no máximo ~7, espalhados, sempre incluindo o último.
  const maxRotulos = Math.max(2, Math.min(7, Math.floor(areaL / 64)))
  const salto = Math.max(1, Math.ceil(pontos.length / maxRotulos))
  const mostraRotulo = (i) => (pontos.length - 1 - i) % salto === 0

  const aoTeclar = (e) => {
    if (!pontos.length) return
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
          <defs>
            <linearGradient id={idGradiente} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" className="linha-grafico__gradiente-topo" />
              <stop offset="100%" className="linha-grafico__gradiente-base" />
            </linearGradient>
          </defs>

          {marcas.map((m) => (
            <g key={m}>
              <line x1={esq} x2={L - dir} y1={y(m)} y2={y(m)} className="linha-grafico__grade" />
              <text x={esq - 8} y={y(m) + 4} textAnchor="end" className="linha-grafico__eixo">{formatar(m)}</text>
            </g>
          ))}

          <path d={area} fill={`url(#${idGradiente})`} />
          <path d={linha} className="linha-grafico__linha" />

          {pontos.map((pt, i) => mostraRotulo(i) && (
            <text key={i} x={x(i)} y={altura - 8} textAnchor={i === 0 ? 'start' : i === pontos.length - 1 ? 'end' : 'middle'}
              className="linha-grafico__eixo">{pt.rotulo}</text>
          ))}

          {p && (
            <g pointerEvents="none">
              <line x1={x(ativo)} x2={x(ativo)} y1={cima} y2={cima + areaA} className="linha-grafico__guia" />
              <circle cx={x(ativo)} cy={y(p.valor)} r="5" className="linha-grafico__ponto" />
            </g>
          )}

          {pontos.map((pt, i) => (
            <rect key={i} x={x(i) - Math.max(passoX, 16) / 2} y={cima} width={Math.max(passoX, 16)} height={areaA}
              fill="transparent" onMouseEnter={() => setAtivo(i)} onTouchStart={() => setAtivo(i)} />
          ))}
        </svg>
      )}
      {p && (
        <div className="dica" style={{ left: Math.min(Math.max(x(ativo), 70), L - 70), top: y(p.valor) }} role="status">
          <strong>{formatar(p.valor)} {p.valor === 1 ? 'reserva' : 'reservas'}</strong>
          <span>{p.rotuloLongo}</span>
        </div>
      )}
    </div>
  )
}
