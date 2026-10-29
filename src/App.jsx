import { useEffect, useState } from 'react'
import { aoMudarSessao, lerRetornoDoEmail, sair, sessaoAtual } from './lib/supabase'
import { souAdmin } from './lib/dados'
import { Login } from './components/Login'
import { NovaSenha } from './components/NovaSenha'
import { Painel } from './components/Painel'

// Faixa laranja no topo quando o painel roda no ambiente de teste (VITE_AMBIENTE=teste).
const EM_TESTE = import.meta.env.VITE_AMBIENTE === 'teste'

export default function App() {
  return (
    <>
      {EM_TESTE && <div className="faixa-teste" role="note">Ambiente de teste</div>}
      <Telas />
    </>
  )
}

function Telas() {
  const [retorno] = useState(() => lerRetornoDoEmail())
  const [sessao, setSessao] = useState(sessaoAtual)
  const [acesso, setAcesso] = useState('verificando') // verificando | liberado | negado | erro
  const [trocandoSenha, setTrocandoSenha] = useState(retorno === 'recovery')

  useEffect(() => aoMudarSessao(setSessao), [])

  // Confere o acesso só quando a pessoa entra ou troca de conta (não a cada renovação do login).
  const temSessao = Boolean(sessao)
  const usuarioId = sessao?.usuario?.id
  useEffect(() => {
    if (!temSessao) return
    let ativo = true
    setAcesso('verificando')
    souAdmin()
      .then((ok) => ativo && setAcesso(ok ? 'liberado' : 'negado'))
      .catch(() => ativo && setAcesso('erro'))
    return () => { ativo = false }
  }, [temSessao, usuarioId])

  if (!sessao) return <Login />
  if (trocandoSenha) return <NovaSenha aoConcluir={() => setTrocandoSenha(false)} />

  if (acesso === 'verificando') {
    return <div className="tela-centro"><p className="estado"><span className="girando" aria-hidden="true" /> Abrindo o painel...</p></div>
  }
  if (acesso === 'negado' || acesso === 'erro') {
    return (
      <div className="tela-centro">
        <div className="login">
          <h1 className="login__titulo">{acesso === 'negado' ? 'Esta conta não tem acesso' : 'Não foi possível abrir o painel'}</h1>
          <p className="apoio">
            {acesso === 'negado'
              ? 'Você entrou, mas este e-mail não está na lista de administradores. Peça para incluírem você.'
              : 'Verifique sua internet e tente entrar de novo.'}
          </p>
          <button type="button" className="botao botao--secundario" onClick={sair}>Sair</button>
        </div>
      </div>
    )
  }
  return <Painel />
}
