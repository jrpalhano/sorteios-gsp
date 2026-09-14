import { Link } from 'react-router-dom'

const premios = [
  'Refrigerador 293 Litros',
  'TV Smart',
  'Air Fryer',
  'Ventilador',
  'Quadriciclo Infantil',
  'Vários Prêmios Instantâneos',
]

export default function Index() {
  return (
    <div className="page">
      <div className="hero-bg" />

      <div className="logo-area">
        <img src="/selo-festival-premios.png" alt="Festival de Prêmios Supermercados Popular" />
      </div>

      <div className="card">
        <h1 className="card-title">FESTIVAL DE PRÊMIOS</h1>
        <p className="card-subtitle">Loja Pequiá — Concorra a prêmios incríveis!</p>

        <img
          src="/premios-festival-premios1.png"
          alt="Prêmios do Festival"
          className="premios-img"
        />

        <div className="badge-compra">
          Compras a partir de <strong>R$ 49,00</strong> já garantem sua participação!
        </div>

        <p style={{ fontSize: 13, fontWeight: 700, color: '#FAC21E', letterSpacing: '0.5px', marginBottom: 12 }}>
          PRÊMIOS
        </p>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {premios.map((nome) => (
            <li key={nome} style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', paddingLeft: 16, position: 'relative', lineHeight: 1.5 }}>
              <span style={{ position: 'absolute', left: 0, color: '#FAC21E' }}>•</span>
              {nome}
            </li>
          ))}
        </ul>

        <hr className="divisor" />

        <p style={{ fontSize: 13, fontWeight: 700, color: '#FAC21E', letterSpacing: '0.5px', marginBottom: 12 }}>
          REGULAMENTO
        </p>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
          {[
            'Promoção exclusiva para a loja do Pequiá.',
            'Válido para compras a partir de R$ 49,00.',
            'Cada cupom fiscal gera uma inscrição única no sorteio.',
            'O mesmo cupom não pode ser cadastrado mais de uma vez.',
            'Promoção válida entre os dias 15/09 e 31/10.',
            'O sorteio será realizado ao vivo no dia 31 de outubro.',
            'O ganhador será contactado pelo número de telefone cadastrado.',
          ].map((regra) => (
            <li key={regra} style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', paddingLeft: 16, position: 'relative', lineHeight: 1.5 }}>
              <span style={{ position: 'absolute', left: 0, color: '#FAC21E' }}>•</span>
              {regra}
            </li>
          ))}
        </ul>

        <hr className="divisor" />

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>SORTEIO EM</p>
          <p style={{ fontSize: 22, fontWeight: 800, color: '#FAC21E', letterSpacing: 1 }}>31 DE OUTUBRO</p>
        </div>

        <div>
          <Link to="/loja/piquia" className="btn-primary">
            Participar Agora
          </Link>
        </div>

        <Link to="/meus-cupons" className="btn-ghost">Meus Cupons</Link>
      </div>

      <footer className="footer">
        <span>Todos os direitos reservados a &copy; Supermercados Popular {new Date().getFullYear()}.</span>
        <br />
        <span>Desenvolvido por Master Core Tecnologia.</span>
      </footer>
    </div>
  )
}
