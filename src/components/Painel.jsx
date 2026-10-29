import { useCallback, useEffect, useState } from 'react'
import logo from '../logo.svg'
import { sair, sessaoAtual } from '../lib/supabase'
import { listarProdutos, listarReservas } from '../lib/dados'
import { Inicio } from './Inicio'
import { Reservas } from './Reservas'
import { Variedades } from './Variedades'

const ABAS = [
  { id: 'inicio', nome: 'Início' },
  { id: 'reservas', nome: 'Reservas' },
  { id: 'variedades', nome: 'Variedades' },
]

const abaDaUrl = () => {
  const id = window.location.hash.replace('#/', '')
  return ABAS.some((a) => a.id === id) ? id : 'inicio'
}

export function Painel() {
  const [aba, setAba] = useState(abaDaUrl)
  const [reservas, setReservas] = useState([])
  const [produtos, setProdutos] = useState([])
  const [status, setStatus] = useState('carregando') // carregando | pronto | erro
  const [atualizadoEm, setAtualizadoEm] = useState(null)
  const [filtroInicial, setFiltroInicial] = useState(null)

  const carregar = useCallback(async () => {
    try {
      const [r, p] = await Promise.all([listarReservas(), listarProdutos()])
      setReservas(r)
      setProdutos(p)
      setStatus('pronto')
      setAtualizadoEm(new Date())
    } catch {
      setStatus((s) => (s === 'pronto' ? 'pronto' : 'erro'))
    }
  }, [])

  // Carrega ao abrir e atualiza sozinho a cada minuto enquanto o painel está visível.
  useEffect(() => {
    carregar()
    const t = setInterval(() => { if (document.visibilityState === 'visible') carregar() }, 60_000)
    const aoVoltar = () => { if (document.visibilityState === 'visible') carregar() }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', aoVoltar) }
  }, [carregar])

  useEffect(() => {
    const aoMudar = () => setAba(abaDaUrl())
    window.addEventListener('hashchange', aoMudar)
    return () => window.removeEventListener('hashchange', aoMudar)
  }, [])

  const irPara = (id, filtro = null) => {
    setFiltroInicial(filtro)
    window.location.hash = `/${id}`
    window.scrollTo({ top: 0 })
  }

  const trocarReserva = (atualizada) =>
    setReservas((lista) => lista.map((r) => (r.id === atualizada.id ? { ...r, ...atualizada } : r)))

  const trocarProduto = (atualizado, novo = false) =>
    setProdutos((lista) => (novo ? [...lista, atualizado] : lista.map((p) => (p.id === atualizado.id ? atualizado : p)))
      .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome)))

  const novas = reservas.filter((r) => r.status === 'nova').length

  return (
    <div className="painel">
      <header className="topo">
        <div className="conteiner topo__linha">
          <a href="#/inicio" className="marca">
            <img src={logo} alt="" width="36" height="36" />
            <span className="marca__nome">RP Pitaya</span>
          </a>
          <div className="topo__conta">
            <span className="topo__email">{sessaoAtual()?.usuario?.email}</span>
            <button type="button" className="botao botao--pequeno botao--contorno" onClick={sair}>Sair</button>
          </div>
        </div>
        <nav className="conteiner abas" aria-label="Seções do painel">
          {ABAS.map((a) => (
            <a key={a.id} href={`#/${a.id}`} className="aba" aria-current={aba === a.id ? 'page' : undefined}
              onClick={() => setFiltroInicial(null)}>
              {a.nome}
              {a.id === 'reservas' && novas > 0 && <span className="aba__contador" aria-label={`${novas} novas`}>{novas}</span>}
            </a>
          ))}
        </nav>
      </header>

      <main className="conteiner conteudo">
        {status === 'carregando' && <p className="carregando">Carregando as reservas...</p>}
        {status === 'erro' && (
          <div className="aviso" role="alert">
            <p>Não foi possível carregar os dados. Verifique sua internet.</p>
            <button type="button" className="botao botao--contorno" onClick={carregar}>Tentar de novo</button>
          </div>
        )}
        {status === 'pronto' && (
          <>
            <div className="barra-atualizacao">
              <span>Atualizado às {atualizadoEm?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              <button type="button" className="link-botao" onClick={carregar}>Atualizar agora</button>
            </div>
            {aba === 'inicio' && <Inicio reservas={reservas} produtos={produtos} irPara={irPara} />}
            {aba === 'reservas' && (
              <Reservas key={filtroInicial ?? 'todas'} reservas={reservas} filtroInicial={filtroInicial} aoAtualizar={trocarReserva} />
            )}
            {aba === 'variedades' && <Variedades produtos={produtos} reservas={reservas} aoSalvar={trocarProduto} />}
          </>
        )}
      </main>
    </div>
  )
}
