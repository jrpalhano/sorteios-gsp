import { Link } from 'react-router-dom'

const itens = [
  'Caixa Térmica 32 lt - 1 unid',
  'Gelo - 1 unid',
  'Cerveja Skol - 1 cx',
  'Costela Bovina - 3 kg',
  'Whisky Cavalo Branco - 1 unid',
  'Energético Baly 2 lt - 1 unid',
  'Carvão - 1 unid',
]

export default function Index() {
  return (
    <div className="page">
      <div className="hero-bg" />

      <div className="logo-area">
        <img src="/selo-kit-ver1.png" alt="Selo Kit Verão Supermercados Popular" />
      </div>

      <div className="card">
        <h1 className="card-title">O QUE VOCÊ PODE GANHAR</h1>
        <p className="card-subtitle">Kit completo para curtir o verão!</p>

        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 28 }}>
          <div style={{ flex: '0 0 200px' }}>
            <img src="/kit-verao.png" alt="Kit Verão" style={{ width: '100%', borderRadius: 10 }} />
          </div>
          <ul style={{ listStyle: 'none', flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {itens.map((item) => (
              <li key={item} style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', padding: '1px 0', lineHeight: 1.4 }}>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <hr className="divisor" />

        <p style={{ fontSize: 13, fontWeight: 700, color: '#FAC21E', letterSpacing: '0.5px', marginBottom: 12 }}>
          REGULAMENTO
        </p>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
          {[
            'Válido para compras realizadas nas lojas participantes (PIQUIA e CENTRO).',
            'Cada cupom fiscal gera uma inscrição única no sorteio.',
            'O mesmo cupom não pode ser cadastrado mais de uma vez.',
            'O sorteio será realizado ao vivo nas redes sociais do Supermercados Popular.',
            'O ganhador será contactado pelo número de telefone cadastrado.',
            'Promoção válida entre os dias 18 e 22 de agosto.',
          ].map((regra) => (
            <li key={regra} style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', paddingLeft: 16, position: 'relative', lineHeight: 1.5 }}>
              <span style={{ position: 'absolute', left: 0, color: '#FAC21E' }}>•</span>
              {regra}
            </li>
          ))}
        </ul>

        <hr className="divisor" />

        <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', textAlign: 'center', marginBottom: 12, letterSpacing: '0.5px' }}>
          Escolha sua loja para participar
        </p>

        <div>
          <Link to="/loja/centro" className="btn-primary" style={{ lineHeight: 1.3 }}>
            CENTRO
            <span style={{ display: 'block', fontSize: 11, fontWeight: 600, opacity: 0.8, marginTop: 3 }}>
              Participar Agora
            </span>
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
