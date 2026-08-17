import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { useParams, useNavigate } from 'react-router-dom'
import FormField from '../components/FormField'

const API_URL  = import.meta.env.VITE_API_URL
const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY

// ── Schema Yup ────────────────────────────────────────────────────────────────
const schema = yup.object({
  nome: yup
    .string().trim()
    .min(3, 'Nome deve ter ao menos 3 caracteres')
    .required('Nome é obrigatório'),

  telefone: yup
    .string()
    .matches(/^\(\d{2}\) \d{4,5}-\d{4}$/, 'Informe um telefone válido — ex: (99) 99999-9999')
    .required('Telefone é obrigatório'),

  cpf: yup
    .string()
    .matches(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF inválido — use 000.000.000-00')
    .required('CPF é obrigatório'),

  numero_cupom: yup
    .string()
    .matches(/^\d+$/, 'O cupom deve conter apenas números')
    .required('Informe o número do cupom'),

  data_cupom: yup
    .string()
    .required('Informe a data do cupom'),

  comprou_influencer: yup
    .string()
    .oneOf(['sim', 'nao'], 'Selecione uma opção')
    .required('Selecione uma opção'),

  influencer_nome: yup.string().when('comprou_influencer', {
    is: 'sim',
    then: (s) => s.trim().min(2, 'Informe o nome da influenciadora').required('Informe o nome da influenciadora'),
    otherwise: (s) => s.optional(),
  }),

  lgpd: yup
    .bool()
    .oneOf([true], 'Você precisa aceitar os termos da LGPD')
    .required(),
})

// ── reCAPTCHA ─────────────────────────────────────────────────────────────────
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
      try { resolve(await window.grecaptcha.execute(SITE_KEY, { action: 'inscricao' })) }
      catch { resolve('') }
    })
  })
}

// ── Máscaras ──────────────────────────────────────────────────────────────────
function applyMaskTelefone(value) {
  let v = value.replace(/\D/g, '').slice(0, 11)
  if (v.length > 6)      return `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`
  if (v.length > 2)      return `(${v.slice(0,2)}) ${v.slice(2)}`
  if (v.length > 0)      return `(${v}`
  return v
}

function applyMaskCpf(value) {
  let v = value.replace(/\D/g, '').slice(0, 11)
  if (v.length > 9)      return `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6,9)}-${v.slice(9)}`
  if (v.length > 6)      return `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6)}`
  if (v.length > 3)      return `${v.slice(0,3)}.${v.slice(3)}`
  return v
}

// ── Componente ────────────────────────────────────────────────────────────────
export default function Form() {
  const { slug }           = useParams()
  const navigate           = useNavigate()
  const [lojaNome, setLojaNome] = useState('...')
  const [erroGeral, setErroGeral] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    mode: 'onBlur',
  })

  const comprouInfluencer = watch('comprou_influencer')

  useEffect(() => {
    loadRecaptcha()
    if (slug) {
      fetch(`${API_URL}/api/lojas/slug/${slug}`)
        .then(r => r.json())
        .then(d => { if (d.nome) setLojaNome(d.nome) })
        .catch(() => {})
    }
  }, [slug])

  async function onSubmit(values) {
    setErroGeral('')
    setSubmitting(true)
    try {
      const recaptcha_token = await getRecaptchaToken()
      const payload = {
        nome:               values.nome.trim(),
        telefone:           values.telefone,
        cpf:                values.cpf,
        numero_cupom:       values.numero_cupom,
        data_cupom:         values.data_cupom,
        comprou_influencer: values.comprou_influencer === 'sim' ? 'true' : 'false',
        influencer_nome:    values.influencer_nome?.trim() || '',
        loja_slug:          slug || '',
        lgpd_aceite:        'true',
        recaptcha_token,
      }

      const resp = await fetch(`${API_URL}/api/inscricoes`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      const data = await resp.json()

      if (resp.ok) {
        navigate('/obrigado')
      } else {
        setErroGeral(data.erros ? data.erros.join(' • ') : (data.erro || 'Erro ao enviar. Tente novamente.'))
      }
    } catch {
      setErroGeral('Erro de conexão. Verifique sua internet e tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      <div className="hero-bg" />

      <div className="logo-area">
        <img src="/selo-kit-ver1.png" alt="Selo Kit Verão" />
      </div>

      <div className="card">
        <h1 className="card-title">Sorteio Kit Verão</h1>
        <p className="card-subtitle">Preencha os dados abaixo para participar</p>

        <div className="badge-wrap">
          <span className="loja-badge">Loja {lojaNome}</span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>

          <FormField label="Nome completo" required error={errors.nome?.message}>
            <input
              type="text"
              placeholder="Seu nome completo"
              autoComplete="name"
              className={errors.nome ? 'invalido' : ''}
              {...register('nome')}
            />
          </FormField>

          <FormField label="Telefone" required error={errors.telefone?.message}>
            <input
              type="tel"
              placeholder="(00) 00000-0000"
              maxLength={15}
              className={errors.telefone ? 'invalido' : ''}
              {...register('telefone', {
                onChange: (e) => {
                  e.target.value = applyMaskTelefone(e.target.value)
                },
              })}
            />
          </FormField>

          <FormField label="CPF" required error={errors.cpf?.message}>
            <input
              type="text"
              placeholder="000.000.000-00"
              maxLength={14}
              inputMode="numeric"
              className={errors.cpf ? 'invalido' : ''}
              {...register('cpf', {
                onChange: (e) => {
                  e.target.value = applyMaskCpf(e.target.value)
                },
              })}
            />
          </FormField>

          <FormField
            label="Número do cupom"
            required
            hint="Encontre o número no rodapé do seu cupom fiscal."
            error={errors.numero_cupom?.message}
          >
            <input
              type="text"
              placeholder="Número impresso no cupom fiscal"
              inputMode="numeric"
              className={errors.numero_cupom ? 'invalido' : ''}
              {...register('numero_cupom')}
            />
          </FormField>

          <FormField label="Data do cupom" required error={errors.data_cupom?.message}>
            <input
              type="date"
              className={errors.data_cupom ? 'invalido' : ''}
              {...register('data_cupom')}
            />
          </FormField>

          <hr className="divisor" />

          {/* Influencer */}
          <div className="field">
            <label>
              Você soube do sorteio por alguma influenciadora?
              <span className="obrigatorio"> *</span>
            </label>
            <div className={`radio-group${errors.comprou_influencer ? ' invalido' : ''}`}>
              <label className="radio-option">
                <input type="radio" value="sim" {...register('comprou_influencer')} />
                Sim
              </label>
              <label className="radio-option">
                <input type="radio" value="nao" {...register('comprou_influencer')} />
                Não
              </label>
            </div>
            {errors.comprou_influencer && (
              <span className="erro-campo" style={{ display: 'block' }}>
                {errors.comprou_influencer.message}
              </span>
            )}
          </div>

          {comprouInfluencer === 'sim' && (
            <FormField label="Qual influenciadora?" required error={errors.influencer_nome?.message}>
              <input
                type="text"
                placeholder="Nome ou @ da influenciadora"
                className={errors.influencer_nome ? 'invalido' : ''}
                {...register('influencer_nome')}
              />
            </FormField>
          )}

          <hr className="divisor" />

          {/* LGPD */}
          <div className={`field-lgpd${errors.lgpd ? ' lgpd-invalida' : ''}`}>
            <label className="lgpd-label">
              <input type="checkbox" {...register('lgpd')} />
              <span>
                Autorizo o Supermercados Popular a utilizar meus dados pessoais (nome, CPF e telefone)
                exclusivamente para fins de participação neste sorteio, conforme a{' '}
                <strong>Lei 13.709/2018 (LGPD)</strong>.
              </span>
            </label>
            {errors.lgpd && (
              <span className="erro-campo" style={{ display: 'block', marginTop: 8 }}>
                {errors.lgpd.message}
              </span>
            )}
          </div>

          {erroGeral && <div className="msg-erro">{erroGeral}</div>}

          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Enviando...' : 'Participar do Sorteio'}
          </button>

          <p className="recaptcha-note">
            Protegido por reCAPTCHA &nbsp;·&nbsp; Seus dados estão seguros
          </p>
        </form>
      </div>

      <footer className="footer">
        <span>Todos os direitos reservados a &copy; Supermercados Popular {new Date().getFullYear()}.</span>
        <br />
        <span>Desenvolvido por Master Core Tecnologia.</span>
      </footer>
    </div>
  )
}
