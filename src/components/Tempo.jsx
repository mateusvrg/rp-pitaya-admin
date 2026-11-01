import { useEffect, useRef, useState } from 'react'
import { lerTempo } from '../lib/tempo'

// Ícones do céu (desenhados aqui, coloridos).
function IconeCeu({ ceu, tamanho = 40 }) {
  const { tipo, noite } = ceu
  const sol = <g><circle cx="24" cy="22" r="8" fill="#F5B301" />{[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
    <line key={a} x1="24" y1="9" x2="24" y2="5" stroke="#F5B301" strokeWidth="2.6" strokeLinecap="round" transform={`rotate(${a} 24 22)`} />))}</g>
  const lua = <path d="M30 13a10 10 0 1 0 6 16 8 8 0 0 1-6-16z" fill="#C9CBD6" />
  const nuvem = (cor = '#C4CAD4', dx = 0, dy = 0) => (
    <path transform={`translate(${dx} ${dy})`} d="M15 38h20a7 7 0 0 0 .8-14 9.5 9.5 0 0 0-18.3 2.6A5.8 5.8 0 0 0 15 38z" fill={cor} />)
  const gotas = (n, cor = '#3B82F6') => Array.from({ length: n }, (_, i) => (
    <line key={i} x1={17 + i * 6} y1="41" x2={15 + i * 6} y2="46" stroke={cor} strokeWidth="2.4" strokeLinecap="round" />))
  let desenho
  if (tipo === 'limpo') desenho = noite ? lua : sol
  else if (tipo === 'parcial') desenho = <>{noite ? <g transform="translate(-6 -5)">{lua}</g> : <g transform="translate(-6 -5)">{sol}</g>}{nuvem('#D3D8E0', 2, 2)}</>
  else if (tipo === 'nublado') desenho = <>{nuvem('#AEB6C2', -5, -5)}{nuvem('#C9CED7', 2, 1)}</>
  else if (tipo === 'neblina') desenho = <>{nuvem('#C9CED7', 0, -4)}{[38, 43].map((y) => <line key={y} x1="12" y1={y} x2="38" y2={y} stroke="#AEB6C2" strokeWidth="2.4" strokeLinecap="round" />)}</>
  else if (tipo === 'tempestade') desenho = <>{nuvem('#8D96A5', 0, -4)}<path d="M25 36l-4 7h5l-3 6" stroke="#F5B301" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></>
  else desenho = <>{nuvem(tipo === 'chuva-forte' ? '#8D96A5' : '#B4BCC8', 0, -4)}{gotas(tipo === 'chuva-forte' ? 4 : 3)}</>
  return <svg width={tamanho} height={tamanho} viewBox="0 0 48 48" aria-hidden="true">{desenho}</svg>
}

const graus = (t) => (t == null ? '–' : `${Math.round(t)}°`)
const mm = (v) => (v < 0.5 ? '0 mm' : `${v < 10 ? v.toFixed(1).replace('.', ',') : Math.round(v)} mm`)
const hora = (d) => d?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

// Busca a previsão ao abrir e a cada 10 minutos (o banco atualiza a cada 30).
export function useTempo() {
  const [tempo, setTempo] = useState(null)
  useEffect(() => {
    let ativo = true
    const buscar = () => lerTempo().then((t) => ativo && setTempo(t)).catch(() => {})
    buscar()
    const id = setInterval(() => { if (document.visibilityState === 'visible') buscar() }, 600_000)
    return () => { ativo = false; clearInterval(id) }
  }, [])
  return tempo
}

export function QuadroTempo({ tempo }) {
  const { agora, dias, alertas, chuva } = tempo
  return (
    <div className="tempo">
      <div className="tempo__topo">
        <span className="tempo__local">Tempo no sítio</span>
        {tempo.atualizadoEm && <span className="tempo__hora" title="Previsão do MET Norway (yr.no)">às {hora(tempo.atualizadoEm)}</span>}
      </div>

      <div className="tempo__agora">
        <IconeCeu ceu={agora.ceu} tamanho={52} />
        <div>
          <div className="tempo__temp">{graus(agora.temp)}</div>
          <div className="tempo__ceu">{agora.ceu.nome}</div>
        </div>
      </div>
      <dl className="tempo__detalhes">
        <div><dt>Sensação</dt><dd>{graus(agora.sensacao)}</dd></div>
        <div><dt>Umidade</dt><dd>{Math.round(agora.umid ?? 0)}%</dd></div>
        <div><dt>Vento</dt><dd>{Math.round(agora.vento)} km/h</dd></div>
      </dl>

      <div className="tempo__bloco">
        <span className="tempo__titulo">Chuva</span>
        <dl className="tempo__chuva">
          <div><dt>Prevista hoje</dt><dd>{mm(agora.chuvaHoje)}</dd></div>
          <div><dt>Últimas 24h</dt><dd>{mm(chuva.ultimas24)}</dd></div>
          <div><dt>{chuva.desde ? `Desde ${chuva.desde.getDate()}/${chuva.desde.getMonth() + 1}` : 'Últimos 7 dias'}</dt><dd>{mm(chuva.ultimos7)}</dd></div>
        </dl>
      </div>

      <div className="tempo__bloco">
        <span className="tempo__titulo">Próximos dias</span>
        <ul className="tempo__dias">
          {dias.map((d) => (
            <li key={d.chave}>
              <span className="tempo__dia-nome">{d.nome}</span>
              <IconeCeu ceu={d.ceu} tamanho={24} />
              <span className="tempo__dia-chuva">{d.mm >= 0.5 ? mm(d.mm) : ''}</span>
              <span className="tempo__dia-temp"><span className="tempo__min">{graus(d.min)}</span> {graus(d.max)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="tempo__bloco">
        <span className="tempo__titulo">Alertas da lavoura</span>
        {alertas.length
          ? <ul className="tempo__alertas">{alertas.map((a) => <li key={a.texto} className={`tempo__alerta tempo__alerta--${a.tipo}`}>{a.texto}</li>)}</ul>
          : <p className="tempo__ok">Sem geada, calor forte, chuva forte ou vento forte nos próximos dias.</p>}
      </div>
    </div>
  )
}

// Telas largas: quadro fixo na margem da direita. Telas médias: só ícone + temperatura no topo, que abre o quadro.
export function TempoMargem({ tempo }) {
  if (!tempo) return null
  return <aside className="tempo-margem" aria-label="Tempo no sítio"><QuadroTempo tempo={tempo} /></aside>
}

export function TempoResumo({ tempo }) {
  const [aberto, setAberto] = useState(false)
  const caixa = useRef(null)
  useEffect(() => {
    if (!aberto) return
    const fora = (e) => { if (!caixa.current?.contains(e.target)) setAberto(false) }
    const tecla = (e) => { if (e.key === 'Escape') setAberto(false) }
    document.addEventListener('pointerdown', fora); window.addEventListener('keydown', tecla)
    return () => { document.removeEventListener('pointerdown', fora); window.removeEventListener('keydown', tecla) }
  }, [aberto])
  if (!tempo) return null
  return (
    <div className="tempo-resumo" ref={caixa}>
      <button type="button" className="tempo-resumo__botao" aria-expanded={aberto} onClick={() => setAberto((a) => !a)}
        title={`${tempo.agora.ceu.nome} no sítio`} aria-label={`Tempo no sítio: ${graus(tempo.agora.temp)}, ${tempo.agora.ceu.nome}`}>
        <IconeCeu ceu={tempo.agora.ceu} tamanho={24} />
        <span>{graus(tempo.agora.temp)}</span>
        {tempo.alertas.length > 0 && <span className="tempo-resumo__ponto" aria-hidden="true" />}
      </button>
      {aberto && <div className="tempo-resumo__caixa"><QuadroTempo tempo={tempo} /></div>}
    </div>
  )
}
