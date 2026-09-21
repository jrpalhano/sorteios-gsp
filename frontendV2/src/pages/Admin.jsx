import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'

const API_URL = import.meta.env.VITE_API_URL

const loginSchema = yup.object({
  email: yup.string().email('E-mail inválido').required('Informe o e-mail'),
  senha: yup.string().required('Informe a senha'),
})

const cadastroSchema = yup.object({
  nome:          yup.string().required('Informe o nome'),
  nome_completo: yup.string().required('Informe o nome completo'),
  email:         yup.string().email('E-mail inválido').required('Informe o e-mail'),
  senha:         yup.string().min(8, 'Mínimo 8 caracteres').required('Informe a senha'),
  confirmar_senha: yup.string()
    .oneOf([yup.ref('senha')], 'As senhas não coincidem')
    .required('Confirme a senha'),
})

function formatarData(iso) {
  if (!iso) return '-'
  const [y, m, d] = iso.split('T')[0].split('-')
  return `${d}/${m}/${y}`
}

function formatarDataHora(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('pt-BR')
}

// ── Login ──────────────────────────────────────────────────────────────────────
function LoginForm({ onLoggedIn }) {
  const [erroGeral, setErroGeral]         = useState('')
  const [mostrarSenha, setMostrarSenha]   = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(loginSchema),
  })

  async function onSubmit(values) {
    setErroGeral('')
    try {
      const resp = await fetch(`${API_URL}/api/admin/login`, {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body:        JSON.stringify({ email: values.email, senha: values.senha }),
      })
      const data = await resp.json()
      if (resp.ok) {
        onLoggedIn()
      } else {
        setErroGeral(data.erro || 'Credenciais inválidas')
      }
    } catch {
      setErroGeral('Erro de conexão.')
    }
  }

  return (
    <div className="page">
      <div className="hero-bg" />
      <div className="logo-area">
        <img src="/LOGO POPULAR - COM SOMBRA (3).png" alt="Supermercados Popular" />
      </div>
      <div className="card" style={{ maxWidth: 380 }}>
        <h1 className="card-title">Painel Admin</h1>
        <p className="card-subtitle">Acesso restrito</p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="field">
            <label>E-mail<span className="obrigatorio"> *</span></label>
            <input
              type="email"
              autoComplete="email"
              className={errors.email ? 'invalido' : ''}
              {...register('email')}
            />
            {errors.email && <span className="erro-campo" style={{ display: 'block' }}>{errors.email.message}</span>}
          </div>

          <div className="field">
            <label>Senha<span className="obrigatorio"> *</span></label>
            <div style={{ position: 'relative' }}>
              <input
                type={mostrarSenha ? 'text' : 'password'}
                autoComplete="current-password"
                className={errors.senha ? 'invalido' : ''}
                style={{ paddingRight: 44 }}
                {...register('senha')}
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(v => !v)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(255,255,255,0.45)', lineHeight: 1 }}
                tabIndex={-1}
              >
                {mostrarSenha ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
            {errors.senha && <span className="erro-campo" style={{ display: 'block' }}>{errors.senha.message}</span>}
          </div>

          {erroGeral && <div className="msg-erro">{erroGeral}</div>}

          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Seção: Administradores ────────────────────────────────────────────────────
function SecaoAdmins({ adminAtual }) {
  const [admins, setAdmins]               = useState([])
  const [carregando, setCarregando]       = useState(true)
  const [mostrarForm, setMostrarForm]     = useState(false)
  const [erroGeral, setErroGeral]         = useState('')
  const [sucesso, setSucesso]             = useState('')
  const [mostrarSenha, setMostrarSenha]   = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(cadastroSchema),
  })

  const carregarAdmins = useCallback(async () => {
    setCarregando(true)
    try {
      const resp = await fetch(`${API_URL}/api/admin/admins`, { credentials: 'include' })
      const data = await resp.json()
      setAdmins(Array.isArray(data) ? data : [])
    } catch {}
    setCarregando(false)
  }, [])

  useEffect(() => { carregarAdmins() }, [carregarAdmins])

  async function onCadastrar(values) {
    setErroGeral('')
    setSucesso('')
    try {
      const resp = await fetch(`${API_URL}/api/admin/admins`, {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body:        JSON.stringify({
          nome:          values.nome,
          nome_completo: values.nome_completo,
          email:         values.email,
          senha:         values.senha,
        }),
      })
      const data = await resp.json()
      if (resp.ok) {
        setSucesso('Administrador cadastrado com sucesso.')
        reset()
        setMostrarForm(false)
        carregarAdmins()
      } else {
        setErroGeral(data.erro || 'Erro ao cadastrar')
      }
    } catch {
      setErroGeral('Erro de conexão.')
    }
  }

  async function toggleAtivo(id, ativo) {
    try {
      await fetch(`${API_URL}/api/admin/admins/${id}/ativo`, {
        method:      'PATCH',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body:        JSON.stringify({ ativo }),
      })
      carregarAdmins()
    } catch {}
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#FAC21E', letterSpacing: '0.5px' }}>
          ADMINISTRADORES
        </span>
        <button
          onClick={() => { setMostrarForm(v => !v); setErroGeral(''); setSucesso('') }}
          style={{ ...btnStyle, background: 'rgba(250,194,30,0.12)', border: '1px solid rgba(250,194,30,0.3)', color: '#FAC21E', fontSize: 12 }}
        >
          {mostrarForm ? 'Cancelar' : '+ Novo admin'}
        </button>
      </div>

      {sucesso && <div style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 14 }}>{sucesso}</div>}

      {mostrarForm && (
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '20px', marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 16 }}>Novo administrador</p>
          <form onSubmit={handleSubmit(onCadastrar)} noValidate>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Nome (apelido) *</label>
                <input style={inputStyle} className={errors.nome ? 'invalido' : ''} {...register('nome')} />
                {errors.nome && <span style={erroStyle}>{errors.nome.message}</span>}
              </div>
              <div>
                <label style={labelStyle}>Nome completo *</label>
                <input style={inputStyle} className={errors.nome_completo ? 'invalido' : ''} {...register('nome_completo')} />
                {errors.nome_completo && <span style={erroStyle}>{errors.nome_completo.message}</span>}
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>E-mail *</label>
                <input type="email" style={inputStyle} className={errors.email ? 'invalido' : ''} {...register('email')} />
                {errors.email && <span style={erroStyle}>{errors.email.message}</span>}
              </div>
              <div>
                <label style={labelStyle}>Senha *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    style={{ ...inputStyle, paddingRight: 40 }}
                    className={errors.senha ? 'invalido' : ''}
                    {...register('senha')}
                  />
                  <button type="button" onClick={() => setMostrarSenha(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0 }} tabIndex={-1}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                  </button>
                </div>
                {errors.senha && <span style={erroStyle}>{errors.senha.message}</span>}
              </div>
              <div>
                <label style={labelStyle}>Confirmar senha *</label>
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  style={inputStyle}
                  className={errors.confirmar_senha ? 'invalido' : ''}
                  {...register('confirmar_senha')}
                />
                {errors.confirmar_senha && <span style={erroStyle}>{errors.confirmar_senha.message}</span>}
              </div>
            </div>
            {erroGeral && <div style={{ ...erroStyle, display: 'block', marginTop: 10 }}>{erroGeral}</div>}
            <button type="submit" disabled={isSubmitting} style={{ ...btnStyle, marginTop: 14, background: '#FAC21E', color: '#0a1628', fontWeight: 700, border: 'none' }}>
              {isSubmitting ? 'Cadastrando...' : 'Cadastrar'}
            </button>
          </form>
        </div>
      )}

      {carregando ? (
        <div style={{ padding: 20, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Carregando...</div>
      ) : (
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                {['Nome', 'Nome completo', 'E-mail', 'Cadastrado em', 'Status'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {admins.map((a, i) => (
                <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                  <td style={{ ...tdStyle, fontWeight: 600, color: '#fff' }}>
                    {a.nome}
                    {a.id === adminAtual.id && (
                      <span style={{ marginLeft: 8, fontSize: 10, color: '#FAC21E', background: 'rgba(250,194,30,0.1)', border: '1px solid rgba(250,194,30,0.25)', padding: '1px 6px', borderRadius: 10 }}>você</span>
                    )}
                  </td>
                  <td style={tdStyle}>{a.nome_completo}</td>
                  <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.55)' }}>{a.email}</td>
                  <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>{formatarDataHora(a.criado_em)}</td>
                  <td style={tdStyle}>
                    {a.id === adminAtual.id ? (
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>—</span>
                    ) : (
                      <button
                        onClick={() => toggleAtivo(a.id, !a.ativo)}
                        style={{
                          fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, cursor: 'pointer', border: 'none',
                          background: a.ativo ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                          color:      a.ativo ? '#4ade80' : '#f87171',
                        }}
                      >
                        {a.ativo ? 'Ativo' : 'Inativo'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ adminAtual, onLogout }) {
  const [stats, setStats]           = useState([])
  const [lojas, setLojas]           = useState([])
  const [inscricoes, setInscricoes] = useState([])
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(1)
  const [lojaFiltro, setLojaFiltro] = useState('')
  const [busca, setBusca]           = useState('')
  const [buscaInput, setBuscaInput] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [aba, setAba]               = useState('inscricoes')
  const LIMIT = 50

  useEffect(() => {
    fetch(`${API_URL}/api/admin/stats`, { credentials: 'include' })
      .then(r => r.json()).then(setStats).catch(() => {})
    fetch(`${API_URL}/api/lojas`, { credentials: 'include' })
      .then(r => r.json()).then(setLojas).catch(() => {})
  }, [])

  const carregarInscricoes = useCallback(async () => {
    setCarregando(true)
    const params = new URLSearchParams({ page, limit: LIMIT })
    if (lojaFiltro) params.set('loja_id', lojaFiltro)
    if (busca)      params.set('busca', busca)
    try {
      const resp = await fetch(`${API_URL}/api/admin/inscricoes?${params}`, { credentials: 'include' })
      const data = await resp.json()
      setInscricoes(data.data || [])
      setTotal(data.total || 0)
    } catch {}
    setCarregando(false)
  }, [page, lojaFiltro, busca])

  useEffect(() => { carregarInscricoes() }, [carregarInscricoes])

  function handleBuscar(e) {
    e.preventDefault()
    setBusca(buscaInput)
    setPage(1)
  }

  function exportUrl() {
    const params = new URLSearchParams()
    if (lojaFiltro) params.set('loja_id', lojaFiltro)
    return `${API_URL}/api/admin/export?${params}`
  }

  async function handleLogout() {
    await fetch(`${API_URL}/api/admin/logout`, { method: 'POST', credentials: 'include' })
    onLogout()
  }

  const totalGeral = stats.reduce((s, l) => s + l.total, 0)
  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div style={{ minHeight: '100vh', background: '#0a1628', color: '#fff', padding: '0 0 40px' }}>
      {/* Header */}
      <div style={{ background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/LOGO POPULAR - COM SOMBRA (3).png" alt="Supermercados Popular" style={{ height: 36 }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#FAC21E' }}>Painel Admin</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
            Olá, <strong style={{ color: 'rgba(255,255,255,0.8)' }}>{adminAtual.nome}</strong>
          </span>
          <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)', fontSize: 13, padding: '7px 16px', borderRadius: 8, cursor: 'pointer' }}>
            Sair
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px 0' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stats.length + 1}, 1fr)`, gap: 12, marginBottom: 28 }}>
          <div style={cardStyle('#FAC21E')}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#FAC21E' }}>{totalGeral}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>TOTAL GERAL</div>
          </div>
          {stats.map(s => (
            <div key={s.slug} style={cardStyle()}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>{s.total}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>{s.nome.toUpperCase()}</div>
            </div>
          ))}
        </div>

        {/* Abas */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 0 }}>
          {[{ id: 'inscricoes', label: 'Inscrições' }, { id: 'admins', label: 'Administradores' }].map(tab => (
            <button
              key={tab.id}
              onClick={() => setAba(tab.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '10px 18px', fontSize: 13, fontWeight: 600,
                color:        aba === tab.id ? '#FAC21E' : 'rgba(255,255,255,0.45)',
                borderBottom: aba === tab.id ? '2px solid #FAC21E' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Aba: Inscrições */}
        {aba === 'inscricoes' && (
          <>
            {/* Filtros */}
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '0 0 180px' }}>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Loja</label>
                <select value={lojaFiltro} onChange={e => { setLojaFiltro(e.target.value); setPage(1) }} style={selectStyle}>
                  <option value="">Todas</option>
                  {lojas.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
                </select>
              </div>

              <form onSubmit={handleBuscar} style={{ flex: 1, display: 'flex', gap: 8, minWidth: 200 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Buscar</label>
                  <input type="text" placeholder="Nome, telefone ou cupom..." value={buscaInput} onChange={e => setBuscaInput(e.target.value)} style={inputStyle} />
                </div>
                <button type="submit" style={{ ...btnStyle, alignSelf: 'flex-end' }}>Buscar</button>
                {busca && (
                  <button type="button" onClick={() => { setBuscaInput(''); setBusca(''); setPage(1) }} style={{ ...btnStyle, background: 'rgba(255,255,255,0.1)', alignSelf: 'flex-end' }}>
                    Limpar
                  </button>
                )}
              </form>

              <a
                href={exportUrl()}
                target="_blank"
                rel="noreferrer"
                style={{ ...btnStyle, textDecoration: 'none', alignSelf: 'flex-end', background: 'rgba(250,194,30,0.15)', border: '1px solid rgba(250,194,30,0.4)', color: '#FAC21E' }}
              >
                Exportar Excel
              </a>
            </div>

            {/* Tabela */}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#FAC21E', letterSpacing: '0.5px' }}>INSCRIÇÕES</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{total} registro{total !== 1 ? 's' : ''}</span>
              </div>

              {carregando ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Carregando...</div>
              ) : inscricoes.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Nenhuma inscrição encontrada.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                        {['#', 'Loja', 'Nome', 'Telefone', 'CPF', 'Cupom', 'Data', 'Influencer', 'Cadastrado em'].map(h => (
                          <th key={h} style={thStyle}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {inscricoes.map((insc, i) => (
                        <tr key={insc.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                          <td style={tdStyle}>{insc.id}</td>
                          <td style={tdStyle}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#FAC21E', background: 'rgba(250,194,30,0.12)', border: '1px solid rgba(250,194,30,0.25)', padding: '2px 8px', borderRadius: 20 }}>
                              {insc.loja}
                            </span>
                          </td>
                          <td style={{ ...tdStyle, fontWeight: 600, color: '#fff' }}>{insc.nome}</td>
                          <td style={tdStyle}>{insc.telefone}</td>
                          <td style={tdStyle}>{insc.cpf}</td>
                          <td style={{ ...tdStyle, fontWeight: 700 }}>{insc.numero_cupom}</td>
                          <td style={tdStyle}>{formatarData(insc.data_cupom)}</td>
                          <td style={tdStyle}>
                            {insc.comprou_influencer === 'true' ? (insc.influencer_nome || 'Sim') : <span style={{ color: 'rgba(255,255,255,0.3)' }}>—</span>}
                          </td>
                          <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>{formatarDataHora(insc.criado_em)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {totalPages > 1 && (
                <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={pgBtnStyle(page === 1)}>← Anterior</button>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', padding: '0 8px' }}>Página {page} de {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={pgBtnStyle(page === totalPages)}>Próxima →</button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Aba: Administradores */}
        {aba === 'admins' && <SecaoAdmins adminAtual={adminAtual} />}
      </div>
    </div>
  )
}

// ── Estilos auxiliares ────────────────────────────────────────────────────────
const cardStyle = (accent) => ({
  background:   'rgba(255,255,255,0.05)',
  border:       `1px solid ${accent ? 'rgba(250,194,30,0.3)' : 'rgba(255,255,255,0.1)'}`,
  borderRadius: 12,
  padding:      '18px 20px',
})

const selectStyle = {
  width:      '100%',
  background: 'rgba(255,255,255,0.06)',
  border:     '1px solid rgba(255,255,255,0.15)',
  color:      '#fff',
  borderRadius: 8,
  padding:    '10px 12px',
  fontSize:   13,
}

const inputStyle = {
  width:      '100%',
  background: 'rgba(255,255,255,0.06)',
  border:     '1px solid rgba(255,255,255,0.15)',
  color:      '#fff',
  borderRadius: 8,
  padding:    '10px 12px',
  fontSize:   13,
  boxSizing:  'border-box',
}

const btnStyle = {
  background:  'rgba(255,255,255,0.08)',
  border:      '1px solid rgba(255,255,255,0.2)',
  color:       '#fff',
  borderRadius: 8,
  padding:     '10px 16px',
  fontSize:    13,
  cursor:      'pointer',
  whiteSpace:  'nowrap',
}

const labelStyle = {
  fontSize:      11,
  color:         'rgba(255,255,255,0.45)',
  display:       'block',
  marginBottom:  5,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
}

const erroStyle = {
  fontSize:   11,
  color:      '#f87171',
  marginTop:  4,
}

const thStyle = {
  padding:       '10px 14px',
  textAlign:     'left',
  fontSize:      10,
  fontWeight:    700,
  color:         'rgba(255,255,255,0.4)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  whiteSpace:    'nowrap',
}

const tdStyle = {
  padding:       '11px 14px',
  color:         'rgba(255,255,255,0.75)',
  verticalAlign: 'middle',
}

const pgBtnStyle = (disabled) => ({
  ...btnStyle,
  opacity: disabled ? 0.3 : 1,
  cursor:  disabled ? 'default' : 'pointer',
})

// ── Componente principal ──────────────────────────────────────────────────────
export default function Admin() {
  const [adminAtual, setAdminAtual] = useState(undefined) // undefined = verificando

  useEffect(() => {
    fetch(`${API_URL}/api/admin/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => setAdminAtual(data))
      .catch(() => setAdminAtual(null))
  }, [])

  if (adminAtual === undefined) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a1628', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
        Verificando sessão...
      </div>
    )
  }

  if (!adminAtual) {
    return <LoginForm onLoggedIn={() => {
      fetch(`${API_URL}/api/admin/me`, { credentials: 'include' })
        .then(r => r.json())
        .then(setAdminAtual)
        .catch(() => setAdminAtual(null))
    }} />
  }

  return <Dashboard adminAtual={adminAtual} onLogout={() => setAdminAtual(null)} />
}
