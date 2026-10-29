import { useEffect, useRef, useState } from 'react'
import { diasEntre, formatarData } from '../lib/periodos'
import { IconeFechar, IconeVoltar } from './Icones'

const SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const SEMANA_LONGA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

const zerar = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const mesmoDia = (a, b) => a && b && a.getTime() === b.getTime()
const mesDe = (d) => new Date(d.getFullYear(), d.getMonth(), 1)
const somarMeses = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1)

function Mes({ mes, de, ate, passando, hoje, aoEscolher, aoPassar }) {
  const primeiro = mes.getDay()
  const total = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate()
  const casas = [...Array(primeiro).fill(null), ...Array.from({ length: total }, (_, i) => new Date(mes.getFullYear(), mes.getMonth(), i + 1))]
  // Enquanto só o início foi escolhido, mostra o intervalo até o dia sob o mouse.
  const fimVisual = ate ?? (de && passando && passando >= de ? passando : null)
  const nomeMes = mes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const titulo = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)

  return (
    <div className="cal-mes">
      <p className="cal-mes__nome">{titulo}</p>
      <div className="cal-grade" role="group" aria-label={titulo}>
        {SEMANA.map((s, i) => <span key={i} className="cal-semana" aria-hidden="true" title={SEMANA_LONGA[i]}>{s}</span>)}
        {casas.map((d, i) => {
          if (!d) return <span key={`v${i}`} />
          const futuro = d > hoje
          const ehInicio = mesmoDia(d, de)
          const ehFim = mesmoDia(d, fimVisual)
          const dentro = de && fimVisual && d > de && d < fimVisual
          const classes = ['cal-dia',
            ehInicio && 'cal-dia--inicio', ehFim && 'cal-dia--fim', dentro && 'cal-dia--dentro',
            mesmoDia(d, hoje) && 'cal-dia--hoje'].filter(Boolean).join(' ')
          return (
            <button key={d.getDate()} type="button" className={classes} disabled={futuro}
              aria-pressed={ehInicio || ehFim || Boolean(dentro)}
              aria-label={d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              onClick={() => aoEscolher(d)} onMouseEnter={() => aoPassar(d)} onFocus={() => aoPassar(d)}>
              {d.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Escolha de período: primeiro clique marca o início, segundo marca o fim.
export function Calendario({ inicial, aoAplicar, aoFechar }) {
  const hoje = zerar(new Date())
  const [de, setDe] = useState(inicial?.de ? zerar(inicial.de) : null)
  const [ate, setAte] = useState(inicial?.ate ? zerar(inicial.ate) : null)
  const [passando, setPassando] = useState(null)
  const [mes, setMes] = useState(() => somarMeses(mesDe(inicial?.ate ?? hoje), -1))
  const caixa = useRef(null)

  useEffect(() => {
    const tecla = (e) => { if (e.key === 'Escape') aoFechar() }
    const fora = (e) => { if (caixa.current && !caixa.current.contains(e.target)) aoFechar() }
    window.addEventListener('keydown', tecla)
    document.addEventListener('mousedown', fora)
    return () => { window.removeEventListener('keydown', tecla); document.removeEventListener('mousedown', fora) }
  }, [aoFechar])

  const escolher = (d) => {
    if (!de || ate) { setDe(d); setAte(null); return }
    if (d < de) { setAte(de); setDe(d) } else setAte(d)
  }

  const proximoBloqueado = somarMeses(mes, 1) > mesDe(hoje)
  const resumo = de && ate
    ? `${formatarData(de)} a ${formatarData(ate)} (${diasEntre(de, ate)} ${diasEntre(de, ate) === 1 ? 'dia' : 'dias'})`
    : de ? `Início: ${formatarData(de)}. Agora escolha o último dia.` : 'Escolha o primeiro dia do período.'

  return (
    <div className="calendario" ref={caixa} role="dialog" aria-label="Escolher período personalizado">
      <div className="calendario__topo">
        <button type="button" className="botao-fantasma" onClick={() => setMes(somarMeses(mes, -1))} aria-label="Mês anterior"><IconeVoltar tamanho={18} /></button>
        <p className="calendario__resumo" aria-live="polite">{resumo}</p>
        <button type="button" className="botao-fantasma" onClick={() => setMes(somarMeses(mes, 1))} disabled={proximoBloqueado} aria-label="Próximo mês">
          <IconeVoltar tamanho={18} style={{ transform: 'scaleX(-1)' }} />
        </button>
      </div>
      <div className="calendario__meses" onMouseLeave={() => setPassando(null)}>
        <Mes mes={mes} de={de} ate={ate} passando={passando} hoje={hoje} aoEscolher={escolher} aoPassar={setPassando} />
        <div className="cal-mes--segundo">
          <Mes mes={somarMeses(mes, 1)} de={de} ate={ate} passando={passando} hoje={hoje} aoEscolher={escolher} aoPassar={setPassando} />
        </div>
      </div>
      <div className="calendario__rodape">
        <button type="button" className="botao-fantasma calendario__fechar" onClick={aoFechar}><IconeFechar tamanho={18} /> Cancelar</button>
        <button type="button" className="botao botao--principal" disabled={!de || !ate} onClick={() => aoAplicar({ de, ate })}>Aplicar período</button>
      </div>
    </div>
  )
}
