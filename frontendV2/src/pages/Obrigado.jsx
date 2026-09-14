import { Link } from 'react-router-dom'

export default function Obrigado() {
  return (
    <div className="page">
      <div className="hero-bg" />

      <div className="logo-area">
        <img src="/selo-festival-premios.png" alt="Festival de Prêmios" />
      </div>

      <div className="card" style={{ alignItems: 'center', textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64,
          background: 'rgba(250,194,30,0.15)',
          border: '2px solid #FAC21E',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 24,
          margin: '0 auto 24px',
        }}>
          <svg viewBox="0 0 24 24" width={32} height={32} fill="none"
            stroke="#FAC21E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1 className="card-title">Inscrição Confirmada!</h1>

        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, margin: '12px 0 8px' }}>
          Obrigado por participar do <strong style={{ color: '#fff' }}>Festival de Prêmios</strong>{' '}
          do Supermercados Popular!
        </p>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, marginBottom: 8 }}>
          Sua inscrição foi registrada com sucesso.<br />
          Caso seja o ganhador, entraremos em contato pelo{' '}
          <strong style={{ color: '#fff' }}>número de telefone</strong> informado.
        </p>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, marginBottom: 8 }}>
          Seu cupom será validado em nossos servidores e você receberá uma mensagem de confirmação no número cadastrado.
        </p>

        <hr className="divisor" style={{ width: '100%' }} />

        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 28 }}>
          Sorteio válido para compras realizadas entre{' '}
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>15/09 e 31/10</strong>.
          O sorteio será realizado em{' '}
          <strong style={{ color: '#FAC21E' }}>31 de outubro</strong>.
        </p>

        <Link to="/" className="btn-primary" style={{ display: 'inline-block', width: 'auto', padding: '13px 32px' }}>
          Voltar ao início
        </Link>
      </div>

      <footer className="footer">
        <span>Todos os direitos reservados a &copy; Supermercados Popular {new Date().getFullYear()}.</span>
        <br />
        <span>Desenvolvido por Master Core Tecnologia.</span>
      </footer>
    </div>
  )
}
