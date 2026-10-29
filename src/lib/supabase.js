// Acesso ao Supabase pela API REST (login, tabelas e fotos), sem biblioteca extra.
// A chave publicável não dá acesso a nada sozinha: as leituras e edições só passam
// porque o usuário está logado E está na tabela admins (regras RLS do banco).
export const URL_SUPABASE = import.meta.env.VITE_SUPABASE_URL || 'https://deorudlynhjiqjiszoej.supabase.co'
const CHAVE = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_2Ub4z5q3hND7cQXRqa--og_QOap9nI_'

const CHAVE_SESSAO = 'rp-admin-sessao'

export class ErroApi extends Error {
  constructor(mensagem, status) {
    super(mensagem)
    this.status = status
  }
}

// ---------- Sessão ----------
let sessao = lerSessao()
const ouvintes = new Set()

function lerSessao() {
  try { return JSON.parse(localStorage.getItem(CHAVE_SESSAO)) } catch { return null }
}

function salvarSessao(nova) {
  sessao = nova
  try {
    if (nova) localStorage.setItem(CHAVE_SESSAO, JSON.stringify(nova))
    else localStorage.removeItem(CHAVE_SESSAO)
  } catch { /* navegador sem armazenamento: a sessão vale só nesta aba */ }
  ouvintes.forEach((f) => f(nova))
}

export const sessaoAtual = () => sessao
export const aoMudarSessao = (f) => { ouvintes.add(f); return () => ouvintes.delete(f) }

const deResposta = (r) => ({
  access_token: r.access_token,
  refresh_token: r.refresh_token,
  expira_em: Date.now() + (r.expires_in ?? 3600) * 1000,
  usuario: { id: r.user?.id, email: r.user?.email },
})

const MENSAGENS_LOGIN = {
  invalid_credentials: 'E-mail ou senha incorretos.',
  email_not_confirmed: 'Este e-mail ainda não foi confirmado.',
  over_request_rate_limit: 'Muitas tentativas. Espere alguns minutos e tente de novo.',
}

async function auth(caminho, corpo, { token, metodo = 'POST' } = {}) {
  let r
  try {
    r = await fetch(`${URL_SUPABASE}/auth/v1/${caminho}`, {
      method: metodo,
      headers: { apikey: CHAVE, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: corpo ? JSON.stringify(corpo) : undefined,
    })
  } catch {
    throw new ErroApi('Sem conexão com a internet.', 0)
  }
  const dados = await r.json().catch(() => ({}))
  if (!r.ok) {
    const codigo = dados.error_code || dados.code
    throw new ErroApi(MENSAGENS_LOGIN[codigo] || dados.msg || dados.error_description || 'Não foi possível concluir. Tente de novo.', r.status)
  }
  return dados
}

export async function entrar(email, senha) {
  const r = await auth('token?grant_type=password', { email, password: senha })
  salvarSessao(deResposta(r))
}

export async function sair() {
  const token = sessao?.access_token
  salvarSessao(null)
  if (token) auth('logout', null, { token }).catch(() => {})
}

export const pedirNovaSenha = (email) =>
  auth(`recover?redirect_to=${encodeURIComponent(window.location.origin)}`, { email })

export async function definirNovaSenha(senha) {
  const token = await tokenValido()
  await auth('user', { password: senha }, { token, metodo: 'PUT' })
}

// Link de "esqueci minha senha": o Supabase volta com os tokens no endereço.
export function lerRetornoDoEmail() {
  const hash = new URLSearchParams(window.location.hash.slice(1))
  if (!hash.get('access_token')) return null
  salvarSessao(deResposta({
    access_token: hash.get('access_token'),
    refresh_token: hash.get('refresh_token'),
    expires_in: Number(hash.get('expires_in')) || 3600,
    user: {},
  }))
  window.history.replaceState(null, '', window.location.pathname)
  return hash.get('type')
}

let renovando = null
async function renovar() {
  if (!sessao?.refresh_token) throw new ErroApi('Sessão expirada. Entre de novo.', 401)
  renovando ??= auth('token?grant_type=refresh_token', { refresh_token: sessao.refresh_token })
    .then((r) => salvarSessao(deResposta(r)))
    .catch((e) => { salvarSessao(null); throw e })
    .finally(() => { renovando = null })
  await renovando
}

async function tokenValido() {
  if (!sessao) throw new ErroApi('Sessão expirada. Entre de novo.', 401)
  if (Date.now() > sessao.expira_em - 60_000) await renovar()
  return sessao.access_token
}

// ---------- Tabelas ----------
export async function rest(caminho, { metodo = 'GET', corpo, retornar = false } = {}, tentativa = 0) {
  const token = await tokenValido()
  let r
  try {
    r = await fetch(`${URL_SUPABASE}/rest/v1/${caminho}`, {
      method: metodo,
      headers: {
        apikey: CHAVE,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(retornar ? { Prefer: 'return=representation' } : {}),
      },
      body: corpo ? JSON.stringify(corpo) : undefined,
    })
  } catch {
    throw new ErroApi('Sem conexão com a internet.', 0)
  }
  if (r.status === 401 && tentativa === 0) {
    await renovar()
    return rest(caminho, { metodo, corpo, retornar }, 1)
  }
  const dados = r.status === 204 ? null : await r.json().catch(() => null)
  if (!r.ok) throw new ErroApi(traduzirErro(dados), r.status)
  return dados
}

function traduzirErro(dados) {
  if (dados?.code === '23505') return 'Já existe uma variedade com esse nome de endereço (slug).'
  if (dados?.code === '23514') return 'Algum campo está fora do permitido. Confira os valores.'
  if (dados?.code === '42501') return 'Esta conta não tem permissão para isso.'
  return dados?.message || 'Não foi possível salvar. Tente de novo.'
}

// ---------- Fotos ----------
export async function enviarFoto(arquivo, nomeBase) {
  const token = await tokenValido()
  const extensao = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[arquivo.type]
  if (!extensao) throw new ErroApi('Use uma foto JPG, PNG ou WEBP.', 400)
  if (arquivo.size > 3 * 1024 * 1024) throw new ErroApi('A foto passa de 3 MB. Use uma menor.', 400)
  const caminho = `${nomeBase}-${Date.now()}.${extensao}`
  let r
  try {
    r = await fetch(`${URL_SUPABASE}/storage/v1/object/produtos/${caminho}`, {
      method: 'POST',
      headers: { apikey: CHAVE, Authorization: `Bearer ${token}`, 'Content-Type': arquivo.type, 'x-upsert': 'true' },
      body: arquivo,
    })
  } catch {
    throw new ErroApi('Sem conexão com a internet.', 0)
  }
  if (!r.ok) throw new ErroApi('Não foi possível enviar a foto.', r.status)
  return `${URL_SUPABASE}/storage/v1/object/public/produtos/${caminho}`
}
