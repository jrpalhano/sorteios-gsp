import { Routes, Route, Navigate } from 'react-router-dom'
import Index      from './pages/Index'
import Form       from './pages/Form'
import Obrigado   from './pages/Obrigado'
import MeusCupons from './pages/MeusCupons'
import Admin      from './pages/Admin'

export default function App() {
  return (
    <Routes>
      <Route path="/"               element={<Index />} />
      <Route path="/loja/:slug"     element={<Form />} />
      <Route path="/obrigado"       element={<Obrigado />} />
      <Route path="/meus-cupons"    element={<MeusCupons />} />
      <Route path="/admin"          element={<Admin />} />
      <Route path="*"               element={<Navigate to="/" replace />} />
    </Routes>
  )
}
