import { useCallback, useEffect, useState } from 'react'
import logo from '../logo.svg'
import { sair, sessaoAtual } from '../lib/supabase'
import { listarProdutos, listarReservas } from '../lib/dados'
import { aplicarTema, lerTema } from '../lib/tema'
import { Dashboard } from './Dashboard'
import { Reservas } from './Reservas'
import { Variedades } from './Variedades'
import { useDeslizarAbas } from './useDeslizarAbas'
import { IconeAtualizar, IconeAuto, IconeDashboard, IconeLua, IconeReservas, IconeSair, IconeSol, IconeVariedades } from './Icones'

const IDS_ABAS = ['dashboard', 'reservas', 'variedades']
const ABAS = [
  { id: 'dashboard', nome: 'Dashboard', Icone: IconeDashboard },
  { id: 'reservas', nome: 'Reservas', Icone: IconeReservas },
  { id: 'variedades', nome: 'Variedades', Icone: IconeVariedades },
]

// Endereços: #/dashboard, #/reservas, #/reservas/<id>, #/variedades
function lerRota() {
  const [aba, id] = window.location.hash.replace(/^#\/?/, '').split('/')
  return { aba: ABAS.some((a) => a.id === aba) ? aba : 'dashboard', id: id || null }
}

const TEMA_PROXIMO = { auto: 'claro', claro: 'escuro', escuro: 'auto' }
const TEMA_NOME = { auto: 'Tema automático', claro: 'Tema claro', escuro: 'Tema escuro' }
const TEMA_ICONE = { auto: IconeAuto, claro: IconeSol, escuro: IconeLua }

function BotaoTema({ comTexto }) {
  const [tema, setTema] = useState(lerTema)
  const Icone = TEMA_ICONE[tema]
  const trocar = () => { const t = TEMA_PROXIMO[tema]; aplicarTema(t); setTema(t) }
  return (
    <button type="button" className="botao-fantasma" onClick={trocar} aria-label={`${TEMA_NOME[tema]}. Trocar tema`}>
      <Icone /> {comTexto && <span>{TEMA_NOME[tema]}</span>}
    </button>
  )
}

export function Painel() {
  const [rota, setRota] = useState(lerRota)
  const [reservas, setReservas] = useState([])
  const [produtos, setProdutos] = useState([])
  const [status, setStatus] = useState('carregando')
  const [atualizadoEm, setAtualizadoEm] = useState(null)
  const [atualizando, setAtualizando] = useState(false)
  const [filtroInicial, setFiltroInicial] = useState(null)

  const carregar = useCallback(async () => {
    setAtualizando(true)
    try {
      const [r, p] = await Promise.all([listarReservas(), listarProdutos()])
      setReservas(r); setProdutos(p); setStatus('pronto'); setAtualizadoEm(new Date())
    } catch {
      setStatus((s) => (s === 'pronto' ? 'pronto' : 'erro'))
    } finally {
      setAtualizando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
    const t = setInterval(() => { if (document.visibilityState === 'visible') carregar() }, 60_000)
    const aoVoltar = () => { if (document.visibilityState === 'visible') carregar() }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', aoVoltar) }
  }, [carregar])

  useEffect(() => {
    const aoMudar = () => setRota(lerRota())
    window.addEventListener('hashchange', aoMudar)
    return () => window.removeEventListener('hashchange', aoMudar)
  }, [])

  const irPara = (aba, filtro = null) => {
    setFiltroInicial(filtro)
    window.location.hash = `/${aba}`
    window.scrollTo({ top: 0 })
  }
  const abrirReserva = (id) => { window.location.hash = id ? `/reservas/${id}` : '/reservas' }

  const trocarReserva = (nova) => setReservas((l) => l.map((r) => (r.id === nova.id ? { ...r, ...nova } : r)))
  const trocarProduto = (atual, novo = false) =>
    setProdutos((l) => (novo ? [...l, atual] : l.map((p) => (p.id === atual.id ? atual : p)))
      .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome)))

  const novas = reservas.filter((r) => r.status === 'nova').length
  const email = sessaoAtual()?.usuario?.email
  const tituloAba = ABAS.find((a) => a.id === rota.aba)?.nome
  const deslizar = useDeslizarAbas(IDS_ABAS, rota.aba, irPara)

  const navegacao = (classe) => (
    <nav className={classe} aria-label="Seções do painel">
      {ABAS.map(({ id, nome, Icone }) => (
        <a key={id} href={`#/${id}`} className="nav-item" aria-current={rota.aba === id ? 'page' : undefined}
          onClick={() => setFiltroInicial(null)}>
          <Icone />
          <span>{nome}</span>
          {id === 'reservas' && novas > 0 && <span className="contador" aria-label={`${novas} novas`}>{novas}</span>}
        </a>
      ))}
    </nav>
  )

  return (
    <div className="painel">
      <aside className="lateral">
        <a href="#/dashboard" className="marca">
          <img src={logo} alt="" width="28" height="28" />
          <span className="marca__textos"><span>RP Pitaya</span><span className="marca__sub">Admin Console</span></span>
        </a>
        {navegacao('nav-lateral')}
        <div className="lateral__rodape">
          <BotaoTema comTexto />
          <div className="conta">
            <span className="conta__email" title={email}>{email}</span>
            <button type="button" className="botao-fantasma" onClick={sair} aria-label="Sair">
              <IconeSair />
            </button>
          </div>
        </div>
      </aside>

      <header className="barra-celular">
        <a href="#/dashboard" className="marca"><img src={logo} alt="" width="26" height="26" /><span>{tituloAba}</span></a>
        <div className="barra-celular__acoes">
          <BotaoTema />
          <button type="button" className="botao-fantasma" onClick={sair} aria-label="Sair"><IconeSair /></button>
        </div>
      </header>

      <main className="principal" ref={deslizar.area}>
        {status === 'carregando' && <div className="estado"><span className="girando" aria-hidden="true" /> Carregando...</div>}
        {status === 'erro' && (
          <div className="estado" role="alert">
            <p>Não foi possível carregar os dados. Verifique sua internet.</p>
            <button type="button" className="botao" onClick={carregar}>Tentar de novo</button>
          </div>
        )}
        {status === 'pronto' && (
          <>
            <div className="cabecalho">
              <h1>{tituloAba}</h1>
              <button type="button" className="atualizado" onClick={carregar} disabled={atualizando}>
                <IconeAtualizar tamanho={16} className={atualizando ? 'gira' : ''} />
                <span>Atualizado às {atualizadoEm?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </button>
            </div>
            <div className={`conteudo-aba ${deslizar.classe}`} style={deslizar.estilo}>
            {rota.aba === 'dashboard' && <Dashboard reservas={reservas} produtos={produtos} irPara={irPara} />}
            {rota.aba === 'reservas' && (
              <Reservas key={filtroInicial ?? 'padrao'} reservas={reservas} produtos={produtos} filtroInicial={filtroInicial}
                selecionada={rota.id} aoSelecionar={abrirReserva} aoAtualizar={trocarReserva} aoRecarregar={carregar} />
            )}
            {rota.aba === 'variedades' && <Variedades produtos={produtos} reservas={reservas} aoSalvar={trocarProduto} />}
            </div>
          </>
        )}
      </main>

      {navegacao('nav-inferior')}
    </div>
  )
}
