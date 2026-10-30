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

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const ANO_MINIMO = 2020
const semAcento = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
const nomeDoMes = (i) => MESES[i].charAt(0).toUpperCase() + MESES[i].slice(1)

// Entende "mar", "março", "marco" ou "3". Devolve o índice do mês (0 a 11) ou null.
function lerMes(texto) {
  const t = semAcento(texto)
  if (!t) return null
  if (/^\d{1,2}$/.test(t)) { const n = Number(t); return n >= 1 && n <= 12 ? n - 1 : null }
  const achados = MESES.map((m, i) => [semAcento(m), i]).filter(([m]) => m.startsWith(t))
  return achados.length === 1 ? achados[0][1] : null
}

// Escolha de período: primeiro clique marca o início, segundo marca o fim.
// Mostra um mês por vez. Setas ← → do teclado trocam o mês; dá para digitar o mês e o ano.
export function Calendario({ inicial, aoAplicar, aoFechar }) {
  const hoje = zerar(new Date())
  const [de, setDe] = useState(inicial?.de ? zerar(inicial.de) : null)
  const [ate, setAte] = useState(inicial?.ate ? zerar(inicial.ate) : null)
  const [passando, setPassando] = useState(null)
  const [mes, setMesBruto] = useState(() => mesDe(inicial?.ate ?? hoje))
  const [textoMes, setTextoMes] = useState('')
  const [textoAno, setTextoAno] = useState('')
  const caixa = useRef(null)

  // Nunca passa do mês atual nem fica antes de 2020.
  const setMes = (m) => {
    const limite = mesDe(hoje)
    const minimo = new Date(ANO_MINIMO, 0, 1)
    setMesBruto(m > limite ? limite : m < minimo ? minimo : m)
  }
  // Atualiza os campos quando o mês muda pelas setas, mas não atropela o que a pessoa está digitando.
  const campoMes = useRef(null)
  const campoAno = useRef(null)
  useEffect(() => {
    if (document.activeElement !== campoMes.current) setTextoMes(nomeDoMes(mes.getMonth()))
    if (document.activeElement !== campoAno.current) setTextoAno(String(mes.getFullYear()))
  }, [mes])

  useEffect(() => {
    caixa.current?.focus({ preventScroll: true })
    const tecla = (e) => { if (e.key === 'Escape') aoFechar() }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [aoFechar])

  const setas = (e) => {
    if (e.target.tagName === 'INPUT') return
    if (e.key === 'ArrowLeft') { e.preventDefault(); setMes(somarMeses(mes, -1)) }
    if (e.key === 'ArrowRight') { e.preventDefault(); setMes(somarMeses(mes, 1)) }
  }

  const digitarMes = (texto) => {
    setTextoMes(texto)
    const i = lerMes(texto)
    if (i != null && (texto.length >= 3 || /^\d+$/.test(texto.trim()))) setMes(new Date(mes.getFullYear(), i, 1))
  }
  const digitarAno = (texto) => {
    const limpo = texto.replace(/\D/g, '').slice(0, 4)
    setTextoAno(limpo)
    if (limpo.length === 4) setMes(new Date(Number(limpo), mes.getMonth(), 1))
  }
  // Ao sair do campo (ou Enter), volta a mostrar o mês/ano de verdade se o texto não foi entendido.
  const confirmarCampos = () => { setTextoMes(nomeDoMes(mes.getMonth())); setTextoAno(String(mes.getFullYear())) }
  const enterConfirma = (e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() } }

  const escolher = (d) => {
    if (!de || ate) { setDe(d); setAte(null); return }
    if (d < de) { setAte(de); setDe(d) } else setAte(d)
  }

  const proximoBloqueado = somarMeses(mes, 1) > mesDe(hoje)
  const anteriorBloqueado = somarMeses(mes, -1) < new Date(ANO_MINIMO, 0, 1)
  const resumo = de && ate
    ? `${formatarData(de)} a ${formatarData(ate)} (${diasEntre(de, ate)} ${diasEntre(de, ate) === 1 ? 'dia' : 'dias'})`
    : de ? `Início: ${formatarData(de)}. Agora escolha o último dia.` : 'Escolha o primeiro dia do período.'

  return (
    <>
    {/* Fundo atrás do calendário: clicar fora só fecha, sem abrir o que está embaixo */}
    <div className="calendario-fundo" aria-hidden="true" onClick={aoFechar} />
    <div className="calendario" ref={caixa} tabIndex={-1} role="dialog" aria-label="Escolher período personalizado" onKeyDown={setas}>
      <div className="calendario__topo">
        <button type="button" className="botao-fantasma" onClick={() => setMes(somarMeses(mes, -1))} disabled={anteriorBloqueado} aria-label="Mês anterior"><IconeVoltar tamanho={18} /></button>
        <div className="calendario__campos">
          <input ref={campoMes} className="calendario__mes" list="calendario-meses" value={textoMes} aria-label="Mês (digite o nome)"
            onChange={(e) => digitarMes(e.target.value)} onFocus={(e) => e.target.select()} onBlur={confirmarCampos} onKeyDown={enterConfirma} />
          <datalist id="calendario-meses">{MESES.map((m, i) => <option key={m} value={nomeDoMes(i)} />)}</datalist>
          <input ref={campoAno} className="calendario__ano" inputMode="numeric" value={textoAno} aria-label="Ano"
            onChange={(e) => digitarAno(e.target.value)} onFocus={(e) => e.target.select()} onBlur={confirmarCampos} onKeyDown={enterConfirma} />
        </div>
        <button type="button" className="botao-fantasma" onClick={() => setMes(somarMeses(mes, 1))} disabled={proximoBloqueado} aria-label="Próximo mês">
          <IconeVoltar tamanho={18} style={{ transform: 'scaleX(-1)' }} />
        </button>
      </div>
      <div className="calendario__meses" onMouseLeave={() => setPassando(null)}>
        <Mes mes={mes} de={de} ate={ate} passando={passando} hoje={hoje} aoEscolher={escolher} aoPassar={setPassando} />
      </div>
      <p className="calendario__resumo" aria-live="polite">{resumo}</p>
      <div className="calendario__rodape">
        <button type="button" className="botao-fantasma calendario__fechar" onClick={aoFechar}><IconeFechar tamanho={18} /> Cancelar</button>
        <button type="button" className="botao botao--principal" disabled={!de || !ate} onClick={() => aoAplicar({ de, ate })}>Aplicar</button>
      </div>
    </div>
    </>
  )
}
