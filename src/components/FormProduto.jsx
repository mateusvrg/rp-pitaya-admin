import { useEffect, useState } from 'react'
import { salvarProduto } from '../lib/dados'
import { enviarFoto } from '../lib/supabase'
import { fotosDoSite, pluralUnidade, reais, slugDe } from '../lib/formato'
import { FotosVariedade } from './FotosVariedade'

// Prévia de uma foto escolhida no computador (antes de enviar).
function usePrevia(arquivo) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    if (!arquivo) { setUrl(null); return }
    const u = URL.createObjectURL(arquivo)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [arquivo])
  return url
}

export function FormProduto({ produto, proximaOrdem, slugsUsados, aoCancelar, aoSalvar }) {
  const novo = !produto
  const [f, setF] = useState(() => ({
    nome: produto?.nome ?? '',
    nome_cartao: produto?.nome_cartao ?? '',
    venda: produto?.venda ?? 'kg',
    unidade_nome: produto?.unidade_nome ?? '',
    secao: produto?.secao ?? 'frutas',
    descricao: produto?.descricao ?? '',
    beneficio: produto?.beneficio ?? '',
    preco: produto ? String(produto.preco_unidade).replace('.', ',') : '',
    ordem: produto?.ordem ?? proximaOrdem,
    disponivel: produto?.disponivel ?? true,
    ativo: produto?.ativo ?? true,
    imagem_url: produto?.imagem_url ?? '',
    imagem_url_2: produto?.imagem_url_2 ?? '',
  }))
  const [foto, setFoto] = useState(null)
  const [foto2, setFoto2] = useState(null)
  const previa = usePrevia(foto)
  const previa2 = usePrevia(foto2)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)


  const mudar = (campo) => (e) => setF((x) => ({ ...x, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const slug = produto?.slug ?? slugDe(f.nome)

  const aoEnviar = async (e) => {
    e.preventDefault()
    setErro('')
    const preco = Number(f.preco.replace(/\./g, '').replace(',', '.'))
    if (f.nome.trim().length < 2) return setErro('Escreva o nome da variedade.')
    if (novo && slugsUsados.includes(slug)) return setErro('Já existe uma variedade com esse nome.')
    if (!f.preco.trim() || Number.isNaN(preco) || preco < 0) return setErro('Escreva um preço válido, por exemplo 10,00.')
    if (f.venda === 'unidade' && !/^.{2,20}$/.test(f.unidade_nome.trim())) return setErro('Escreva o nome da unidade, no singular (ex.: muda).')

    setSalvando(true)
    try {
      const imagem_url = foto ? await enviarFoto(foto, slug) : f.imagem_url
      const imagem_url_2 = foto2 ? await enviarFoto(foto2, `${slug}-2`) : f.imagem_url_2
      const salvo = await salvarProduto({
        id: produto?.id, slug, nome: f.nome.trim(), nome_cartao: f.nome_cartao.trim().replace(/\s*\/\s*/g, ' / '), descricao: f.descricao.trim(), beneficio: f.beneficio.trim(),
        preco_unidade: preco, ordem: Number(f.ordem) || 0, disponivel: f.disponivel, ativo: f.ativo, imagem_url, imagem_url_2,
        venda: f.venda, unidade_nome: f.unidade_nome, secao: f.secao,
      })
      aoSalvar({ ...salvo, preco_unidade: Number(salvo.preco_unidade) }, novo)
    } catch (err) {
      setErro(err.message)
    } finally {
      setSalvando(false)
    }
  }

  // Fotos enviadas pelo painel; sem nenhuma, o site usa as que já vêm com ele.
  const primeira = previa || f.imagem_url
  const segunda = primeira ? (previa2 || f.imagem_url_2) : null
  const doSite = !primeira ? fotosDoSite(slug) : []
  const fotosNoSite = primeira ? [primeira, segunda].filter(Boolean) : doSite
  const nomesCartao = (f.nome_cartao || f.nome).split('/').map((x) => x.trim()).filter(Boolean)

  // Vende por quilo ou por unidade. Num produto novo, a seção do site acompanha (unidade → Mudas),
  // a não ser que o Julio já tenha escolhido a seção na mão.
  const [secaoNaMao, setSecaoNaMao] = useState(!novo)
  const porUnidade = f.venda === 'unidade'
  const unidade = (f.unidade_nome.trim().toLowerCase() || 'unidade')
  const escolherVenda = (venda) => setF((x) => ({ ...x, venda, secao: secaoNaMao ? x.secao : venda === 'unidade' ? 'mudas' : 'frutas' }))
  const escolherSecao = (secao) => { setSecaoNaMao(true); setF((x) => ({ ...x, secao })) }
  const precoExemplo = Number(f.preco.replace(/\./g, '').replace(',', '.')) || 0

  return (
    <form className="painel-form form" onSubmit={aoEnviar} noValidate>
      <h2 className="painel-form__titulo">{novo ? 'Nova variedade' : `Editar ${produto.nome}`}</h2>

      <label className="campo-rotulo">Nome
        <input className="campo" value={f.nome} onChange={mudar('nome')} maxLength={60} placeholder="Ex.: Pitaya Amarela" />
        <span className="apoio">É o que o cliente escolhe na reserva e o que aparece nas reservas do painel.</span>
      </label>
      <label className="campo-rotulo"><span>Nome no cartão do site <span className="apoio">(opcional)</span></span>
        <input className="campo" value={f.nome_cartao} onChange={mudar('nome_cartao')} maxLength={80} placeholder="Ex.: Royal Red / Teruya do Vale" />
        <span className="apoio">Para juntar variedades parecidas num cartão só, separe os nomes com /. Em branco, o cartão usa o nome.</span>
      </label>

      <div className="campo-rotulo">
        <span>Vende por</span>
        <div className="segmentos segmentos--largo" role="group" aria-label="Vende por">
          <button type="button" className="segmento" aria-pressed={!porUnidade} onClick={() => escolherVenda('kg')}>Quilo (kg)</button>
          <button type="button" className="segmento" aria-pressed={porUnidade} onClick={() => escolherVenda('unidade')}>Unidade</button>
        </div>
        {!novo && f.venda !== (produto.venda ?? 'kg') && (
          <span className="apoio">As reservas que já existem continuam na unidade em que foram feitas.</span>
        )}
      </div>
      {porUnidade && (
        <label className="campo-rotulo">Nome da unidade, no singular
          <input className="campo" value={f.unidade_nome} onChange={mudar('unidade_nome')} maxLength={20} placeholder="Ex.: muda" />
          <span className="apoio">
            No site: “{reais(precoExemplo)} por {unidade}” e “3 {pluralUnidade(unidade)}”. O cliente escolhe de 1 em 1 (só número inteiro).
          </span>
        </label>
      )}
      <div className="campo-rotulo">
        <span>Aparece no site em</span>
        <div className="segmentos segmentos--largo" role="group" aria-label="Seção do site">
          <button type="button" className="segmento" aria-pressed={f.secao === 'frutas'} onClick={() => escolherSecao('frutas')}>Pitayas</button>
          <button type="button" className="segmento" aria-pressed={f.secao === 'mudas'} onClick={() => escolherSecao('mudas')}>Mudas</button>
        </div>
      </div>

      <div className="duas-colunas">
        <label className="campo-rotulo">{porUnidade ? `Preço por ${unidade} (R$)` : 'Preço do quilo (R$/kg)'}
          <input className="campo" inputMode="decimal" value={f.preco} onChange={mudar('preco')} placeholder="10,00" />
        </label>
        <label className="campo-rotulo">Posição no site
          <input className="campo" type="number" min="0" value={f.ordem} onChange={mudar('ordem')} />
        </label>
      </div>

      <label className="campo-rotulo">Descrição curta
        <input className="campo" value={f.descricao} onChange={mudar('descricao')} maxLength={200} placeholder="Ex.: Polpa vermelha intensa." />
      </label>
      <label className="campo-rotulo">Benefício
        <input className="campo" value={f.beneficio} onChange={mudar('beneficio')} maxLength={200} placeholder="Ex.: Rica em vitamina C." />
      </label>

      <div className="campo-rotulo">
        <span>Fotos</span>
        <div className="fotos-form">
          <FotosVariedade className="fotos-form__previa" fotos={fotosNoSite} vazia={novo ? 'Sem foto' : 'Sem foto'} alt="Prévia do cartão no site" />
          <p className="apoio">
            {fotosNoSite.length === 2
              ? `No site, as duas aparecem lado a lado: ${nomesCartao[0] ?? 'primeira'} à esquerda${nomesCartao[1] ? `, ${nomesCartao[1]} à direita` : ''}.`
              : doSite.length ? 'Usando as fotos que já vêm com o site. Enviar uma foto substitui essas.' : 'Uma foto ocupa o cartão inteiro.'}
          </p>
          <div className="fotos-form__botoes">
            <label className="botao botao--secundario botao--pequeno">
              {primeira ? 'Trocar 1ª foto' : 'Enviar foto'}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
                onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
            </label>
            {primeira && (
              <label className="botao botao--secundario botao--pequeno">
                {segunda ? 'Trocar 2ª foto' : 'Adicionar 2ª foto'}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
                  onChange={(e) => setFoto2(e.target.files?.[0] ?? null)} />
              </label>
            )}
            {segunda && (
              <button type="button" className="link" onClick={() => { setFoto2(null); setF((x) => ({ ...x, imagem_url_2: '' })) }}>
                Tirar 2ª foto
              </button>
            )}
          </div>
          <p className="apoio">JPG, PNG ou WEBP, até 3 MB. Com duas fotos, o nome de cada variedade (do “Nome no cartão”, separado por /) aparece em cima de cada uma.</p>
        </div>
      </div>

      <label className="marcar"><input type="checkbox" checked={f.disponivel} onChange={mudar('disponivel')} /> Disponível para reserva</label>
      <label className="marcar"><input type="checkbox" checked={f.ativo} onChange={mudar('ativo')} /> Aparece no site</label>

      {erro && <p className="erro" role="alert">{erro}</p>}
      <div className="form__botoes">
        <button type="button" className="botao botao--secundario" onClick={aoCancelar} disabled={salvando}>Cancelar</button>
        <button type="submit" className="botao botao--principal" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar variedade'}</button>
      </div>
    </form>
  )
}
