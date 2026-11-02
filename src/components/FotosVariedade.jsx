import { IconeFoto } from './Icones'

// Foto da variedade no painel: uma, ou duas lado a lado (como no cartão do site).
export function FotosVariedade({ fotos, className, vazia, tamanhoIcone = 18, alt = '' }) {
  if (!fotos?.length) {
    return <span className={`${className} ${className}--vazia`} aria-hidden="true">{vazia ?? <IconeFoto tamanho={tamanhoIcone} />}</span>
  }
  if (fotos.length === 1) return <img className={className} src={fotos[0]} alt={alt} />
  return (
    <span className={`${className} fotos-duplas`} role={alt ? 'img' : undefined} aria-label={alt || undefined}>
      {fotos.slice(0, 2).map((f) => <img key={f} src={f} alt="" />)}
    </span>
  )
}
