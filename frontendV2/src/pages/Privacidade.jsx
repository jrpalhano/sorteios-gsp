import { Link } from 'react-router-dom'

const secoes = [
  {
    titulo: '1. Quem é o responsável pelos seus dados',
    texto: 'O controlador dos dados coletados nesta promoção é o Supermercados Popular, estabelecido em Açailândia — MA. Para dúvidas ou solicitações relacionadas aos seus dados, entre em contato pelo WhatsApp ou diretamente em qualquer uma de nossas lojas.',
  },
  {
    titulo: '2. Quais dados coletamos',
    texto: 'Coletamos apenas os dados estritamente necessários para sua participação no sorteio: nome completo, número de CPF, número de telefone, número do cupom fiscal e data da compra.',
  },
  {
    titulo: '3. Para que usamos seus dados',
    texto: 'Seus dados são utilizados exclusivamente para: (a) registrar sua participação no sorteio Festival de Prêmios; (b) validar o cupom fiscal informado; e (c) entrar em contato caso você seja o ganhador. Seus dados não são utilizados para publicidade, marketing ou qualquer outra finalidade além do sorteio.',
  },
  {
    titulo: '4. Compartilhamento de dados',
    texto: 'Seus dados não são vendidos, alugados ou compartilhados com terceiros para fins comerciais. O acesso é restrito à equipe administrativa do Supermercados Popular responsável pela gestão do sorteio.',
  },
  {
    titulo: '5. Por quanto tempo guardamos seus dados',
    texto: 'Os dados são mantidos pelo período da promoção (15/09/2026 a 31/10/2026) e por até 90 dias após o sorteio, necessários para eventuais contestações ou comprovação do resultado. Após esse prazo, os dados pessoais são excluídos ou anonimizados.',
  },
  {
    titulo: '6. Segurança dos dados',
    texto: 'Seu CPF é armazenado de forma criptografada (AES-256-GCM) em nossos servidores. Os demais dados são protegidos por controle de acesso restrito e conexão segura (HTTPS).',
  },
  {
    titulo: '7. Seus direitos como titular',
    texto: 'Conforme a Lei 13.709/2018 (LGPD), você tem direito a: confirmar a existência do tratamento; acessar seus dados; corrigir dados incompletos ou incorretos; solicitar a exclusão dos seus dados; e revogar o consentimento a qualquer momento. Para exercer qualquer um desses direitos, entre em contato conosco diretamente em nossas lojas ou pelo WhatsApp.',
  },
  {
    titulo: '8. Base legal',
    texto: 'O tratamento dos seus dados é baseado no seu consentimento livre e informado, fornecido ao marcar a caixa de aceite no formulário de inscrição (Art. 7º, inciso I da LGPD).',
  },
]

export default function Privacidade() {
  return (
    <div className="page">
      <div className="hero-bg" />

      <div className="logo-area">
        <img src="/selo-festival-premios.png" alt="Festival de Prêmios" />
      </div>

      <div className="card" style={{ maxWidth: 560 }}>
        <h1 className="card-title" style={{ marginBottom: 4 }}>Política de Privacidade</h1>
        <p className="card-subtitle" style={{ marginBottom: 28 }}>
          Festival de Prêmios — Supermercados Popular
        </p>

        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 28 }}>
          Última atualização: setembro de 2026
        </p>

        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, marginBottom: 28 }}>
          O Supermercados Popular respeita a sua privacidade e está comprometido com a proteção
          dos seus dados pessoais, em conformidade com a{' '}
          <strong style={{ color: 'rgba(255,255,255,0.9)' }}>Lei Geral de Proteção de Dados (Lei 13.709/2018)</strong>.
          Esta política explica de forma clara como tratamos as informações coletadas durante
          a promoção Festival de Prêmios.
        </p>

        {secoes.map((s, i) => (
          <div key={i} style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#FAC21E', marginBottom: 8 }}>
              {s.titulo}
            </p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7 }}>
              {s.texto}
            </p>
            {i < secoes.length - 1 && <hr className="divisor" style={{ marginTop: 20, marginBottom: 0 }} />}
          </div>
        ))}

        <hr className="divisor" />

        <Link to="/" className="btn-ghost" style={{ marginTop: 0 }}>
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
