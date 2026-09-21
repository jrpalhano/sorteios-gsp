import { Routes, Route, Navigate } from 'react-router-dom'
import Index       from './pages/Index'
import Form        from './pages/Form'
import Obrigado    from './pages/Obrigado'
import MeusCupons  from './pages/MeusCupons'
import Admin       from './pages/Admin'
import Privacidade from './pages/Privacidade'
import PromoPage   from './pages/PromoPage'

export default function App() {
  return (
    <Routes>
      {/* ── v1 — Festival de Prêmios (intocado) ── */}
      <Route path="/"                            element={<Index />} />
      <Route path="/loja/:slug"                  element={<Form />} />
      <Route path="/obrigado"                    element={<Obrigado />} />
      <Route path="/meus-cupons"                 element={<MeusCupons />} />
      <Route path="/privacidade"                 element={<Privacidade />} />

      {/* ── Admin ── */}
      <Route path="/admin"                       element={<Admin />} />

      {/* ── v2 — Promoções dinâmicas ── */}
      <Route path="/promo/:slug"                 element={<PromoPage />} />
      <Route path="/promo/:slug/loja/:lojaSlug"  element={<PromoPage />} />

      <Route path="*"                            element={<Navigate to="/" replace />} />
    </Routes>
  )
}
