import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import FormField from '../components/FormField'

const API_URL  = import.meta.env.VITE_API_URL
const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY

function loadRecaptcha() {
  if (!SITE_KEY || document.querySelector('script[data-recaptcha]')) return
  const s = document.createElement('script')
  s.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`
  s.dataset.recaptcha = '1'
  document.head.appendChild(s)
}

async function getRecaptchaToken() {
  if (!SITE_KEY || !window.grecaptcha) return ''
  return new Promise((resolve) => {
    window.grecaptcha.ready(async () => {
      try { resolve(await window.grecaptcha.execute(SITE_KEY, { action: 'consulta' })) }
      catch { resolve('') }
    })
  })
}

const schema = yup.object({
  telefone: yup
    .string()
    .matches(/^\(\d{2}\) \d{4,5}-\d{4}$/, 'Telefone inválido')
    .required('Telefone é obrigatório'),
  cpf: yup
    .string()
    .matches(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF inválido')
    .required('CPF é obrigatório'),
})

function applyMaskTelefone(v) {
  v = v.replace(/\D/g, '').slice(0, 11)
  if (v.length > 6)      return `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`
  if (v.length > 2)      return `(${v.slice(0,2)}) ${v.slice(2)}`
  if (v.length > 0)      return `(${v}`
  return v
}

function applyMaskCpf(v) {
  v = v.replace(/\D/g, '').slice(0, 11)
  if (v.length > 9)      return `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6,9)}-${v.slice(9)}`
  if (v.length > 6)      return `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6)}`
  if (v.length > 3)      return `${v.slice(0,3)}.${v.slice(3)}`
  return v
}

function formatarData(iso) {
  const [y, m, d] = iso.split('T')[0].split('-')
  return `${d}/${m}/${y}`
}

export default function MeusCupons() {
  const [cupons, setCupons] = useState(null)
  const [erroGeral, setErroGeral] = useState('')

  useEffect(() => { loadRecaptcha() }, [])

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(schema),
    mode: 'onBlur',
  })

  async function onSubmit(values) {
    setErroGeral('')
    setCupons(null)
    try {
      const recaptcha_token = await getRecaptchaToken()
      const params = new URLSearchParams({ telefone: values.telefone, cpf: values.cpf, recaptcha_token })
      const resp = await fetch(`${API_URL}/api/consulta?${params}`)
      const data = await resp.json()
      if (!resp.ok) {
        setErroGeral(data.erro || 'Erro ao consultar. Tente novamente.')
      } else {
        setCupons(data)
      }
    } catch {
      setErroGeral('Erro de conexão. Verifique sua internet.')
    }
  }

  return (
    <div className="page">
      <div className="hero-bg" />

      <div className="logo-area">
        <img src="/selo-kit-ver1.png" alt="Selo Kit Verão" />
      </div>

      <div className="card">
        <h1 className="card-title">Meus Cupons</h1>
        <p className="card-subtitle">Informe seus dados para consultar suas inscrições</p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FormField label="Telefone" required error={errors.telefone?.message}>
            <input
              type="tel"
              placeholder="(00) 00000-0000"
              maxLength={15}
              className={errors.telefone ? 'invalido' : ''}
              {...register('telefone', { onChange: (e) => { e.target.value = applyMaskTelefone(e.target.value) } })}
            />
          </FormField>

          <FormField label="CPF" required error={errors.cpf?.message}>
            <input
              type="text"
              placeholder="000.000.000-00"
              maxLength={14}
              inputMode="numeric"
              className={errors.cpf ? 'invalido' : ''}
              {...register('cpf', { onChange: (e) => { e.target.value = applyMaskCpf(e.target.value) } })}
            />
          </FormField>

          {erroGeral && <div className="msg-erro">{erroGeral}</div>}

          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Consultando...' : 'Consultar Cupons'}
          </button>
        </form>

        {cupons !== null && (
          <>
            <hr className="divisor" />
            <p style={{ fontSize: 13, fontWeight: 700, color: '#FAC21E', marginBottom: 14, letterSpacing: '0.5px' }}>
              CUPONS CADASTRADOS
            </p>

            {cupons.length === 0 ? (
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '20px 0' }}>
                Nenhum cupom encontrado para os dados informados.
              </p>
            ) : (
              <>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
                      <th style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textAlign: 'left', paddingBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cupom</th>
                      <th style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textAlign: 'right', paddingBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cupons.map((c, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                        <td style={{ padding: '12px 0', verticalAlign: 'middle' }}>
                          <div style={{ fontWeight: 700, color: '#fff', fontSize: 15 }}>{c.numero_cupom}</div>
                          <div>
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#FAC21E', background: 'rgba(250,194,30,0.12)', border: '1px solid rgba(250,194,30,0.3)', padding: '2px 8px', borderRadius: 20, letterSpacing: '0.5px' }}>
                              {c.loja}
                            </span>
                          </div>
                        </td>
                        <td style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', textAlign: 'right', padding: '12px 0' }}>
                          {formatarData(c.data_cupom)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'right', marginTop: 14 }}>
                  {cupons.length} cupom{cupons.length > 1 ? 's' : ''} encontrado{cupons.length > 1 ? 's' : ''}
                </p>
              </>
            )}
          </>
        )}

        <Link to="/" style={{ display: 'block', textAlign: 'center', marginTop: 28, fontSize: 13, color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>
          ← Voltar ao início
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
