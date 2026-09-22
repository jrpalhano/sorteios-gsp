import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import PromoForm from './PromoForm'

const API_URL = import.meta.env.VITE_API_URL

// ── Loading ───────────────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#000D26 0%,#001A4D 50%,#003D90 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
      <img src="/LOGO POPULAR - COM SOMBRA (3).png" alt="Supermercados Popular" style={{ width: '100%', maxWidth: 280, objectFit: 'contain' }} />
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.5px' }}>Carregando...</p>
    </div>
  )
}

// ── Promoção encerrada ────────────────────────────────────────────────────────

function PromoEncerrada() {
  return (
    <div className="page">
      <div className="logo-area">
        <img src="/LOGO POPULAR - COM SOMBRA (3).png" alt="Supermercados Popular" />
      </div>
      <div className="card" style={{ maxWidth: 420, textAlign: 'center' }}>
        <h1 className="card-title">Promoção encerrada</h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, margin: '16px 0' }}>
          Esta promoção não está mais vigente.<br />
          Fique de olho nas nossas próximas promoções!
        </p>
      </div>
      <footer className="footer">
        <span>© Supermercados Popular {new Date().getFullYear()}</span>
      </footer>
    </div>
  )
}

// ── Promoção não encontrada ───────────────────────────────────────────────────

function PromoNaoEncontrada() {
  return (
    <div className="page">
      <div className="logo-area">
        <img src="/LOGO POPULAR - COM SOMBRA (3).png" alt="Supermercados Popular" />
      </div>
      <div className="card" style={{ maxWidth: 420, textAlign: 'center' }}>
        <h1 className="card-title">Ops!</h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, margin: '16px 0' }}>
          Esta promoção não foi encontrada.<br />
          Verifique o link e tente novamente.
        </p>
      </div>
      <footer className="footer">
        <span>© Supermercados Popular {new Date().getFullYear()}</span>
      </footer>
    </div>
  )
}

// ── Gera o estilo de fundo a partir dos dados da promoção ─────────────────────

function fundoStyle(promo) {
  if (!promo) return {}
  if (promo.tipo_fundo === 'solido') {
    return { background: promo.cor_fundo_1 || '#000D26' }
  }
  return {
    background: `linear-gradient(180deg, ${promo.cor_fundo_1 || '#000D26'} 0%, ${promo.cor_fundo_2 || '#003D90'} 100%)`,
    backgroundAttachment: 'fixed',
  }
}

// ── Landing page da promoção ──────────────────────────────────────────────────

function LandingPage({ promo, lojaSlug }) {
  const [mostrarForm, setMostrarForm] = useState(false)
  const [inscrito, setInscrito]       = useState(false)

  const bg = fundoStyle(promo)

  if (inscrito) {
    return (
      <div className="page" style={bg}>
        <div className="logo-area">
          <img src={promo.selo_url ? `${API_URL}${promo.selo_url}` : '/LOGO POPULAR - COM SOMBRA (3).png'} alt="Promoção" />
        </div>
        <div className="card" style={{ maxWidth: 420, textAlign: 'center' }}>
          <h1 className="card-title">Inscrição realizada!</h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, marginTop: 12 }}>
            Sua participação foi registrada com sucesso. Boa sorte!
          </p>
        </div>
      </div>
    )
  }

  if (mostrarForm) {
    return <PromoForm promo={promo} lojaSlug={lojaSlug} onVoltar={() => setMostrarForm(false)} onSucesso={() => setInscrito(true)} fundo={bg} />
  }

  return (
    <div className="page" style={bg}>
      {/* Selo */}
      {promo.selo_url && (
        <div className="logo-area">
          <img src={`${API_URL}${promo.selo_url}`} alt="Selo da promoção" />
        </div>
      )}

      <div className="card">
        {/* Título e loja */}
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#FAC21E', textAlign: 'center', marginBottom: lojaSlug ? 4 : 16, letterSpacing: '0.3px' }}>
          {promo.titulo}
        </h1>
        {lojaSlug && (
          <p style={{ fontSize: 14, fontWeight: 400, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 16 }}>
            {promo.lojas?.find(l => l.slug === lojaSlug)?.nome ?? lojaSlug.toUpperCase()}
          </p>
        )}

        {/* Imagem dos produtos */}
        {promo.imagem_produtos_url && (
          <img
            src={`${API_URL}${promo.imagem_produtos_url}`}
            alt="Produtos da promoção"
            className="premios-img"
            loading="lazy"
          />
        )}

        {/* Lista de produtos */}
        {promo.produtos?.length > 0 && (
          <>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#FAC21E', letterSpacing: '0.5px', marginBottom: 12 }}>PRODUTOS</p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
              {promo.produtos.map((nome, i) => (
                <li key={i} style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', paddingLeft: 16, position: 'relative', lineHeight: 1.5 }}>
                  <span style={{ position: 'absolute', left: 0, color: '#FAC21E' }}>•</span>
                  {nome}
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Regulamento */}
        {promo.regras?.length > 0 && (
          <>
            <hr className="divisor" />
            <p style={{ fontSize: 13, fontWeight: 700, color: '#FAC21E', letterSpacing: '0.5px', marginBottom: 12 }}>REGULAMENTO</p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
              {promo.regras.map((regra, i) => (
                <li key={i} style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', paddingLeft: 16, position: 'relative', lineHeight: 1.5 }}>
                  <span style={{ position: 'absolute', left: 0, color: '#FAC21E' }}>•</span>
                  {regra}
                </li>
              ))}
            </ul>
          </>
        )}

        <hr className="divisor" />

        <button onClick={() => setMostrarForm(true)} className="btn-primary">
          Participar Agora
        </button>
      </div>

      <footer className="footer">
        <span>© Supermercados Popular {new Date().getFullYear()}</span><br />
        <Link to="/privacidade" style={{ color: 'rgba(255,255,255,0.35)' }}>Política de Privacidade</Link>
      </footer>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function PromoPage() {
  const { slug, lojaSlug }    = useParams()
  const [estado, setEstado]   = useState('loading') // loading | ativa | encerrada | nao_encontrada
  const [promo, setPromo]     = useState(null)

  useEffect(() => {
    const minEspera  = new Promise(resolve => setTimeout(resolve, 1500))
    const fetchPromo = fetch(`${API_URL}/api/v2/promocoes/${slug}`).then(async r => {
      const data = await r.json()
      if (r.status === 404) return { codigo: 'NAO_ENCONTRADA' }
      if (r.status === 410) return { codigo: 'ENCERRADA' }
      if (!r.ok)            return { codigo: 'NAO_ENCONTRADA' }
      return { codigo: 'ATIVA', data }
    }).catch(() => ({ codigo: 'NAO_ENCONTRADA' }))

    Promise.all([minEspera, fetchPromo]).then(([, resultado]) => {
      if (resultado.codigo === 'ATIVA') {
        setPromo(resultado.data)
        setEstado('ativa')
      } else if (resultado.codigo === 'ENCERRADA') {
        setEstado('encerrada')
      } else {
        setEstado('nao_encontrada')
      }
    })
  }, [slug])

  if (estado === 'loading')        return <LoadingScreen />
  if (estado === 'encerrada')      return <PromoEncerrada />
  if (estado === 'nao_encontrada') return <PromoNaoEncontrada />

  return <LandingPage promo={promo} lojaSlug={lojaSlug} />
}
