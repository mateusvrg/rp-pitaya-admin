import { useEffect, useMemo, useRef, useState } from 'react'
import { fotoDe, reais, semAcento } from '../lib/formato'
import { AcoesVariedades } from './AcoesVariedades'
import { DetalheVariedade } from './DetalheVariedade'
import { FiltroCelular } from './FiltroCelular'
import { FormProduto } from './FormProduto'
import { IconeBusca, IconeFoto, IconeMais, IconeVariedades } from './Icones'

const FILTROS = [
  { id: 'todas', nome: 'Todas', passa: () => true },
  { id: 'disponiveis', nome: 'Disponíveis', passa: (p) => p.disponivel && p.ativo },
  { id: 'esgotadas', nome: 'Esgotadas', passa: (p) => !p.disponivel },
  { id: 'escondidas', nome: 'Escondidas', passa: (p) => !p.ativo },
]

// Mesmo jeito da tela de Reservas: lista à esquerda, painel da variedade (ou das marcadas) à direita.
export function Variedades({ produtos, reservas, aoSalvar }) {
  const [filtro, setFiltro] = useState('todas')
  const [busca, setBusca] = useState('')
  const [aberta, setAberta] = useState(null) // id da variedade no painel
  const [editando, setEditando] = useState(null) // null | 'novo' | id
  const [marcadas, setMarcadas] = useState(() => new Set())
  const [acoesAbertas, setAcoesAbertas] = useState(false)
  const [recado, setRecado] = useState('')
  const ultima = useRef(null)

  useEffect(() => { setMarcadas(new Set()); ultima.current = null }, [filtro, busca])
  useEffect(() => { if (marcadas.size === 0) setAcoesAbertas(false) }, [marcadas])
  useEffect(() => {
    if (!recado) return
    const t = setTimeout(() => setRecado(''), 3500)
    return () => clearTimeout(t)
  }, [recado])

  // Pitayas reservadas por variedade (sem canceladas) e quantas estão em reservas em aberto.
  const numeros = useMemo(() => {
    const n = {}
    reservas.forEach((r) => {
      if (r.status === 'cancelada') return
      const aberta = ['nova', 'em_contato', 'paga'].includes(r.status)
      r.itens.forEach((i) => {
        n[i.produtoId] ??= { reservadas: 0, emAberto: 0 }
        n[i.produtoId].reservadas += i.quantidade
        if (aberta) n[i.produtoId].emAberto += i.quantidade
      })
    })
    return n
  }, [reservas])

  const contagem = Object.fromEntries(FILTROS.map((f) => [f.id, produtos.filter(f.passa).length]))
  const visiveis = useMemo(() => {
    const termo = semAcento(busca.trim())
    const f = FILTROS.find((x) => x.id === filtro)
    return produtos.filter((p) => f.passa(p) && (!termo || semAcento(p.nome).includes(termo)))
  }, [produtos, filtro, busca])

  const selecionando = marcadas.size > 0
  const listaMarcadas = visiveis.filter((p) => marcadas.has(p.id))
  const todasMarcadas = visiveis.length > 0 && listaMarcadas.length === visiveis.length
  const atual = produtos.find((p) => p.id === aberta) ?? null

  const alternar = (id) => setMarcadas((m) => { const n = new Set(m); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const alternarTodas = () => setMarcadas(todasMarcadas ? new Set() : new Set(visiveis.map((p) => p.id)))
  const limpar = () => setMarcadas(new Set())
  const clicarFaixa = (e, i) => {
    if (e.shiftKey && ultima.current != null) {
      const [de, ate] = [Math.min(ultima.current, i), Math.max(ultima.current, i)]
      setMarcadas((m) => { const n = new Set(m); visiveis.slice(de, ate + 1).forEach((p) => n.add(p.id)); return n })
    } else alternar(visiveis[i].id)
    ultima.current = i
  }

  useEffect(() => {
    if (!selecionando) return
    const tecla = (e) => { if (e.key === 'Escape') limpar() }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [selecionando])

  const salvarVarios = (linhas, campo, valor) => {
    linhas.forEach((p) => aoSalvar(p))
    const um = linhas.length === 1
    const nomeAcao = campo === 'disponivel'
      ? (valor ? (um ? 'disponível' : 'disponíveis') : (um ? 'esgotada' : 'esgotadas'))
      : (valor ? (um ? 'visível no site' : 'visíveis no site') : (um ? 'escondida do site' : 'escondidas do site'))
    setRecado(`${linhas.length} ${um ? 'variedade marcada como' : 'variedades marcadas como'} ${nomeAcao}.`)
    limpar()
  }

  const abrir = (id) => { setEditando(null); setAberta(id) }
  const fechar = () => { setEditando(null); setAberta(null) }
  const painelAberto = selecionando ? acoesAbertas : Boolean(atual || editando)

  let painel
  if (selecionando) {
    painel = <AcoesVariedades produtos={listaMarcadas} aoDesmarcar={alternar} aoLimpar={limpar}
      aoVoltar={() => setAcoesAbertas(false)} aoSalvar={salvarVarios} />
  } else if (editando) {
    const produto = editando === 'novo' ? null : produtos.find((p) => p.id === editando)
    painel = (
      <FormProduto key={editando} produto={produto}
        proximaOrdem={Math.max(0, ...produtos.map((p) => p.ordem)) + 1}
        slugsUsados={produtos.map((p) => p.slug)}
        aoCancelar={() => setEditando(null)}
        aoSalvar={(p, novo) => { aoSalvar(p, novo); setEditando(null); setAberta(p.id); setRecado(novo ? `${p.nome} cadastrada.` : 'Variedade salva.') }} />
    )
  } else if (atual) {
    const n = numeros[atual.id] ?? { reservadas: 0, emAberto: 0 }
    painel = <DetalheVariedade key={atual.id} produto={atual} reservadas={n.reservadas} emAberto={n.emAberto}
      aoFechar={fechar} aoEditar={() => setEditando(atual.id)} aoSalvar={(p) => aoSalvar(p)} />
  } else {
    painel = (
      <div className="detalhe-vazio">
        <IconeVariedades tamanho={28} />
        <p>Escolha uma variedade na lista para ver e mudar.</p>
      </div>
    )
  }

  return (
    <div className={`reservas${painelAberto ? ' reservas--com-detalhe' : ''}${selecionando ? ' reservas--selecionando' : ''}`}>
      <div className="reservas__lista">
        <div className="barra-filtros">
        <div className="ferramentas">
          <label className="busca">
            <IconeBusca tamanho={18} />
            <span className="sr-only">Buscar variedade pelo nome</span>
            <input type="search" placeholder="Buscar variedade pelo nome" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </label>
          <span className="so-celular"><FiltroCelular variante="seta" titulo="Filtrar variedades" opcoes={FILTROS.map((f) => ({ ...f, qtd: contagem[f.id] }))} valor={filtro} aoEscolher={setFiltro} /></span>
          <button type="button" className="botao botao--principal botao--nova" aria-label="Nova variedade" onClick={() => { limpar(); setAberta(null); setEditando('novo') }}>
            <IconeMais tamanho={18} /> <span className="so-computador">Nova variedade</span>
          </button>
        </div>

        <FiltroCelular titulo="Filtrar variedades" opcoes={FILTROS.map((f) => ({ ...f, qtd: contagem[f.id] }))} valor={filtro} aoEscolher={setFiltro} />
        <div className="segmentos segmentos--filtros" role="group" aria-label="Filtrar variedades">
          {FILTROS.map((f) => (
            <button key={f.id} type="button" className="segmento" aria-pressed={filtro === f.id} onClick={() => setFiltro(f.id)}>
              {f.nome}<span className="segmento__qtd">{contagem[f.id]}</span>
            </button>
          ))}
        </div>
        </div>

        {visiveis.length === 0 ? (
          <div className="vazio">
            <p>{busca ? `Nenhuma variedade encontrada para "${busca}".` : 'Nenhuma variedade neste filtro.'}</p>
            <button type="button" className="link" onClick={() => { setBusca(''); setFiltro('todas') }}>Ver todas</button>
          </div>
        ) : (
          <div className="linhas">
            <div className="selecionar-todas">
              <button type="button" className={`linha__faixa${selecionando && !todasMarcadas ? ' linha__faixa--parcial' : ''}`}
                aria-pressed={todasMarcadas} aria-label={todasMarcadas ? 'Desmarcar todas' : 'Selecionar todas'} onClick={alternarTodas} />
              <span className="selecionar-todas__texto">
                {selecionando
                  ? <>{listaMarcadas.length} de {visiveis.length}<span className="so-computador">&nbsp;selecionadas</span></>
                  : <span className="so-computador">Use a faixa à esquerda para selecionar</span>}
              </span>
              <button type="button" className="selecionar-todas__botao" onClick={alternarTodas}>
                {todasMarcadas ? 'Desmarcar todas' : `Selecionar todas (${visiveis.length})`}
              </button>
            </div>
            <ul aria-label={`${visiveis.length} variedades`}>
              {visiveis.map((p, i) => {
                const n = numeros[p.id]?.reservadas ?? 0
                return (
                  <li key={p.id} className={marcadas.has(p.id) ? 'linha-marcada' : undefined}>
                    <button type="button" className="linha__faixa" aria-pressed={marcadas.has(p.id)}
                      aria-label={`Selecionar ${p.nome}`} onClick={(e) => clicarFaixa(e, i)} />
                    <button type="button" className={`linha linha--variedade${p.ativo ? '' : ' linha--apagada'}`}
                      aria-current={!selecionando && p.id === aberta ? 'true' : undefined}
                      onClick={() => (selecionando ? alternar(p.id) : abrir(p.id))}>
                      {fotoDe(p)
                        ? <img className="linha__foto" src={fotoDe(p)} alt="" />
                        : <span className="linha__foto linha__foto--vazia" aria-hidden="true"><IconeFoto tamanho={18} /></span>}
                      <span className="linha__principal">
                        <span className="linha__nome">{p.nome}</span>
                        <span className="linha__resumo">{reais(p.preco_unidade)} a unidade · {n} {n === 1 ? 'reservada' : 'reservadas'}</span>
                      </span>
                      <span className="linha__lado">
                        <span className={`selo ${p.disponivel ? 'selo--paga' : 'selo--cancelada'}`}>
                          <span className="selo__ponto" aria-hidden="true" />{p.disponivel ? 'Disponível' : 'Esgotada'}
                        </span>
                        {!p.ativo && <span className="produto__tag">Escondida</span>}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>

      <section className="reservas__detalhe" aria-label="Detalhe da variedade">{painel}</section>

      {selecionando && !acoesAbertas && (
        <div className="barra-selecao">
          <span><strong>{listaMarcadas.length}</strong> {listaMarcadas.length === 1 ? 'selecionada' : 'selecionadas'}</span>
          <button type="button" className="link" onClick={limpar}>Limpar</button>
          <button type="button" className="botao botao--principal" onClick={() => setAcoesAbertas(true)}>Ações</button>
        </div>
      )}
      {recado && <p className="recado" role="status">{recado}</p>}
    </div>
  )
}
