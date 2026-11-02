import { useEffect, useRef, useState } from 'react'
import { STATUS, lancarReservas } from '../lib/dados'
import { fotoDe, kg, numeroKg, reais } from '../lib/formato'
import { normalizarWhatsApp, lerNumero } from '../lib/importar'
import { IconeFechar, IconeFoto, IconeVoltar, IconeWhatsApp, IconeInstagram } from './Icones'

// "2026-10-31T14:05" no fuso de quem está usando (para o campo de data e hora).
const paraCampo = (d) => {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
const precoTexto = (n) => Number(n).toFixed(2).replace('.', ',')

// Máscara do WhatsApp enquanto digita: (34) 99999-8888
function mascara(v) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

// Lançar à mão uma reserva combinada pelo WhatsApp.
export function NovaReserva({ produtos, aoCancelar, aoLancar }) {
  const vars = produtos.filter((p) => p.ativo || p.disponivel)
  const [f, setF] = useState(() => ({
    nome: '', whatsapp: '', canal: null, modo: 'retirada', endereco: '', status: 'nova', data: paraCampo(new Date()), observacao: '',
  }))
  const [qtd, setQtd] = useState({})
  const [precos, setPrecos] = useState(() => Object.fromEntries(vars.map((p) => [p.id, precoTexto(p.preco_unidade)])))
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const titulo = useRef(null)

  useEffect(() => { titulo.current?.focus({ preventScroll: true }) }, [])
  useEffect(() => {
    const tecla = (e) => { if (e.key === 'Escape') aoCancelar() }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [aoCancelar])

  const mudar = (campo) => (e) => setF((x) => ({ ...x, [campo]: e.target.value }))
  // Quilos: o que está escrito no campo (texto, aceita vírgula). Os botões andam de meio em meio quilo.
  const kgDe = (id) => { const n = lerNumero(qtd[id]); return n == null || Number.isNaN(n) ? 0 : n }
  const somar = (id, delta) => setQtd((q) => {
    const atual = kgDe(id)
    const base = delta > 0 ? Math.floor(atual / 0.5 + 1e-9) * 0.5 : Math.ceil(atual / 0.5 - 1e-9) * 0.5
    return { ...q, [id]: numeroKg(Math.max(0, Math.min(500, Math.round((base + delta) * 100) / 100))) }
  })

  const itens = vars
    .filter((p) => kgDe(p.id) > 0)
    .map((p) => {
      const preco = lerNumero(precos[p.id])
      return { produto: p, quantidade: Math.round(kgDe(p.id) * 100) / 100, preco: preco == null || Number.isNaN(preco) ? NaN : preco }
    })
  const total = itens.reduce((s, i) => s + Math.round(i.quantidade * (Number.isNaN(i.preco) ? 0 : i.preco) * 100) / 100, 0)
  const totalKg = Math.round(itens.reduce((s, i) => s + i.quantidade, 0) * 100) / 100
  const esgotadas = itens.filter((i) => !i.produto.disponivel).map((i) => i.produto.nome)

  const aoEnviar = async (e) => {
    e.preventDefault()
    setErro('')
    const w = normalizarWhatsApp(f.whatsapp)
    const data = f.data ? new Date(f.data) : new Date()
    if (f.nome.trim().length < 3) return setErro('Escreva o nome do cliente.')
    if (!w.ok) return setErro('Escreva o WhatsApp com DDD, por exemplo (34) 99999-8888.')
    if (Number.isNaN(data.getTime()) || data > new Date(Date.now() + 86400000)) return setErro('A data precisa ser de hoje ou de antes.')
    if (itens.length === 0) return setErro('Coloque os quilos de pelo menos uma variedade.')
    if (itens.some((i) => i.quantidade < 0.1 || i.quantidade > 500)) return setErro('Cada variedade aceita de 0,1 a 500 kg.')
    if (itens.some((i) => Number.isNaN(i.preco) || i.preco < 0)) return setErro('Algum preço está inválido. Use por exemplo 10,00.')

    setSalvando(true)
    try {
      await lancarReservas([{
        nome: f.nome.trim().replace(/\s+/g, ' '), whatsapp: w.numero, modo: f.modo,
        endereco: f.modo === 'entrega' ? f.endereco.trim() || null : null,
        canal: f.canal ?? 'site', status: f.status, data: data.toISOString(), observacao: f.observacao.trim() || null,
        itens: itens.map((i) => ({ produto_id: i.produto.id, quantidade: i.quantidade, preco: i.preco })),
      }], 'manual')
      aoLancar(f.nome.trim().split(' ')[0])
    } catch (err) {
      setErro(err.message)
      setSalvando(false)
    }
  }

  return (
    <form className="detalhe nova-reserva" onSubmit={aoEnviar} noValidate>
      <div className="detalhe__topo">
        <button type="button" className="botao-fantasma detalhe__voltar" onClick={aoCancelar} aria-label="Voltar para a lista"><IconeVoltar /></button>
        <div className="detalhe__titulo">
          <h2 ref={titulo} tabIndex={-1}>Nova reserva</h2>
          <p>Lançar à mão uma reserva combinada fora do site</p>
        </div>
        <button type="button" className="botao-fantasma detalhe__fechar" onClick={aoCancelar} aria-label="Fechar"><IconeFechar /></button>
      </div>

      <div className="detalhe__corpo">
        <div className="bloco">
          <label className="campo-rotulo">Nome do cliente
            <input className="campo" value={f.nome} onChange={mudar('nome')} maxLength={100} autoComplete="off" placeholder="Ex.: Maria da Silva" />
          </label>
          <label className="campo-rotulo">WhatsApp
            <input className="campo" type="tel" inputMode="tel" value={f.whatsapp} autoComplete="off" placeholder="(34) 99999-8888"
              onChange={(e) => setF((x) => ({ ...x, whatsapp: mascara(e.target.value) }))} />
          </label>
          {/* Por onde chegou: tocar de novo desmarca. Sem nada marcado, conta como reserva do site. */}
          <div className="campo-rotulo">
            <span>Veio por <span className="apoio">(sem marcar = site)</span></span>
            <div className="canal-escolha" role="group" aria-label="Por onde a reserva chegou">
              {[['whatsapp', 'WhatsApp', IconeWhatsApp], ['instagram', 'Instagram', IconeInstagram]].map(([id, nome, Icone]) => (
                <button key={id} type="button" className={`canal-opcao canal-opcao--${id}`} aria-pressed={f.canal === id}
                  onClick={() => setF((x) => ({ ...x, canal: x.canal === id ? null : id }))}>
                  <Icone tamanho={17} />{nome}
                </button>
              ))}
            </div>
          </div>
        </div>

        <fieldset className="bloco">
          <legend className="bloco__legenda">Pitayas (em kg)</legend>
          <ul className="escolha-itens">
            {vars.map((p) => {
              const n = kgDe(p.id)
              return (
                <li key={p.id} className={n > 0 ? 'escolha-itens--com' : undefined}>
                  {fotoDe(p)
                    ? <img className="escolha-itens__foto" src={fotoDe(p)} alt="" />
                    : <span className="escolha-itens__foto escolha-itens__foto--vazia" aria-hidden="true"><IconeFoto tamanho={16} /></span>}
                  <span className="escolha-itens__nome">
                    {p.nome}
                    {!p.disponivel && <span className="produto__tag">Esgotada</span>}
                  </span>
                  <span className="contador-qtd">
                    <button type="button" onClick={() => somar(p.id, -0.5)} disabled={n === 0} aria-label={`Tirar meio quilo de ${p.nome}`}>−</button>
                    <input inputMode="decimal" value={qtd[p.id] ?? '0'} aria-label={`Quilos de ${p.nome}`}
                      onFocus={(e) => e.target.select()}
                      onBlur={() => setQtd((q) => ({ ...q, [p.id]: numeroKg(Math.min(500, Math.round(kgDe(p.id) * 100) / 100)) }))}
                      onChange={(e) => setQtd((q) => ({ ...q, [p.id]: e.target.value.replace(/[^\d.,]/g, '').replace(/([.,].*)[.,]/, '$1').slice(0, 6) }))} />
                    <span className="contador-qtd__kg" aria-hidden="true">kg</span>
                    <button type="button" onClick={() => somar(p.id, 0.5)} disabled={n >= 500} aria-label={`Mais meio quilo de ${p.nome}`}>+</button>
                  </span>
                  {n > 0 && (
                    <label className="escolha-itens__preco">
                      <span>Preço do kg</span>
                      <span className="campo-dinheiro">R$
                        <input inputMode="decimal" value={precos[p.id] ?? ''} aria-label={`Preço de ${p.nome}`}
                          onChange={(e) => setPrecos((x) => ({ ...x, [p.id]: e.target.value }))} />
                      </span>
                      {lerNumero(precos[p.id]) !== p.preco_unidade && <span className="escolha-itens__site">no site: {reais(p.preco_unidade)}</span>}
                    </label>
                  )}
                </li>
              )
            })}
          </ul>
          <div className="itens__total">
            <span>{kg(totalKg)}</span>
            <strong>{reais(total)}</strong>
          </div>
          {esgotadas.length > 0 && (
            <p className="aviso" role="status">
              {esgotadas.join(' e ')} {esgotadas.length === 1 ? 'está esgotada' : 'estão esgotadas'} no site. A reserva entra mesmo assim.
            </p>
          )}
        </fieldset>

        <fieldset className="bloco">
          <legend className="bloco__legenda">Recebimento</legend>
          <div className="segmentos segmentos--largo" role="group" aria-label="Recebimento">
            {[['retirada', 'Retirada no sítio'], ['entrega', 'Entrega']].map(([id, nome]) => (
              <button key={id} type="button" className="segmento" aria-pressed={f.modo === id} onClick={() => setF((x) => ({ ...x, modo: id }))}>{nome}</button>
            ))}
          </div>
          {f.modo === 'entrega' && (
            <label className="campo-rotulo"><span>Endereço <span className="apoio">(pode deixar para depois)</span></span>
              <input className="campo" value={f.endereco} onChange={mudar('endereco')} maxLength={300} placeholder="Rua, número, bairro" />
            </label>
          )}
        </fieldset>

        <fieldset className="status-escolha">
          <legend>Status</legend>
          <div className="status-escolha__opcoes">
            {STATUS.map((s) => (
              <button key={s.id} type="button" className={`status-opcao selo--${s.id}`} aria-pressed={f.status === s.id}
                onClick={() => setF((x) => ({ ...x, status: s.id }))}>
                <span className="selo__ponto" aria-hidden="true" />{s.nome}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="campo-rotulo">Data da reserva
          <input className="campo" type="datetime-local" value={f.data} max={paraCampo(new Date())} onChange={mudar('data')} />
        </label>

        <label className="campo-rotulo">Anotações
          <textarea className="campo" rows="2" maxLength={1000} value={f.observacao} onChange={mudar('observacao')}
            placeholder="Ex.: pagou metade no Pix" />
        </label>

        {erro && <p className="erro" role="alert">{erro}</p>}
        <div className="form__botoes">
          <button type="button" className="botao botao--secundario" onClick={aoCancelar} disabled={salvando}>Cancelar</button>
          <button type="submit" className="botao botao--principal" disabled={salvando}>{salvando ? 'Salvando...' : 'Lançar reserva'}</button>
        </div>
      </div>
    </form>
  )
}
