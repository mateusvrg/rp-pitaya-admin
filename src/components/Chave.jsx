export function Chave({ ligado, rotulo, aoMudar, ocupado }) {
  return (
    <button type="button" role="switch" aria-checked={ligado} className="chave" onClick={aoMudar} disabled={ocupado}>
      <span className="chave__trilho" aria-hidden="true"><span className="chave__bola" /></span>
      <span className="chave__rotulo">{rotulo}</span>
    </button>
  )
}
