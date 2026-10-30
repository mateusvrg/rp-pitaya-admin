// Ícones de traço, 20px, herdam a cor do texto.
const Svg = ({ children, tamanho = 20, ...resto }) => (
  <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...resto}>
    {children}
  </svg>
)

export const IconeDashboard = (p) => <Svg {...p}><rect x="3.5" y="3.5" width="7" height="9" rx="1.8" /><rect x="13.5" y="3.5" width="7" height="5" rx="1.8" /><rect x="13.5" y="11.5" width="7" height="9" rx="1.8" /><rect x="3.5" y="15.5" width="7" height="5" rx="1.8" /></Svg>
export const IconeReservas = (p) => <Svg {...p}><rect x="4" y="3.5" width="16" height="17" rx="2.5" /><path d="M8 8.5h8M8 12.5h8M8 16.5h5" /></Svg>
export const IconeVariedades = (p) => <Svg {...p}><path d="M12 20c-4.4 0-7-3.1-7-7 0-4.1 3-7.5 7-7.5s7 3.4 7 7.5c0 3.9-2.6 7-7 7z" /><path d="M12 5.5c0-1.3.6-2.3 1.8-3" /><path d="M8 11.5l1.5 1M16 11.5l-1.5 1M12 15.5v1" /></Svg>
export const IconeBusca = (p) => <Svg {...p}><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></Svg>
export const IconeBaixar = (p) => <Svg {...p}><path d="M12 4v11M7.5 10.5L12 15l4.5-4.5" /><path d="M5 19.5h14" /></Svg>
export const IconeSol = (p) => <Svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></Svg>
export const IconeLua = (p) => <Svg {...p}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /></Svg>
export const IconeAuto = (p) => <Svg {...p}><circle cx="12" cy="12" r="8" /><path d="M12 4v16" /><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none" /></Svg>
export const IconeSair = (p) => <Svg {...p}><path d="M14 4.5h4a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-4" /><path d="M10 16l4-4-4-4M14 12H4.5" /></Svg>
export const IconeVoltar = (p) => <Svg {...p}><path d="M15 5l-7 7 7 7" /></Svg>
export const IconeFechar = (p) => <Svg {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>
export const IconeMais = (p) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>
export const IconeAtualizar = (p) => <Svg {...p}><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" /><path d="M19.5 4.5v4h-4" /></Svg>
export const IconeWhatsApp = (p) => <Svg {...p}><path d="M20.5 11.6a8.4 8.4 0 0 1-12.3 7.4L3.5 20.5l1.6-4.6a8.4 8.4 0 1 1 15.4-4.3z" /></Svg>
export const IconeLocal = (p) => <Svg {...p}><path d="M12 21s-6.5-5.8-6.5-11a6.5 6.5 0 0 1 13 0c0 5.2-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.3" /></Svg>
export const IconeTelefone = (p) => <Svg {...p}><path d="M5 4.5h3.2l1.6 4-2 1.3a10 10 0 0 0 6.4 6.4l1.3-2 4 1.6V19a1.5 1.5 0 0 1-1.6 1.5A15.5 15.5 0 0 1 3.5 6.1 1.5 1.5 0 0 1 5 4.5z" /></Svg>
export const IconeFoto = (p) => <Svg {...p}><rect x="3.5" y="5" width="17" height="14" rx="2.5" /><circle cx="9" cy="10" r="1.6" /><path d="M20.5 16l-5-5-8.5 8" /></Svg>
export const IconeCalendario = (p) => <Svg {...p}><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></Svg>
export const IconeFiltro = (p) => <Svg {...p}><path d="M4 6h16M7 12h10M10 18h4" /></Svg>
export const IconeSetaBaixo = (p) => <Svg {...p}><path d="M6 9l6 6 6-6" /></Svg>
