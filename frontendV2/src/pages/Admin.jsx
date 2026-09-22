import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import FormField from '../components/FormField'

const API_URL = import.meta.env.VITE_API_URL

// ── Schemas ───────────────────────────────────────────────────────────────────

const loginSchema = yup.object({
  email: yup.string().email('E-mail inválido').required('Informe o e-mail'),
  senha: yup.string().required('Informe a senha'),
})

const cadastroAdminSchema = yup.object({
  nome:            yup.string().required('Informe o nome'),
  nome_completo:   yup.string().required('Informe o nome completo'),
  email:           yup.string().email('E-mail inválido').required('Informe o e-mail'),
  senha:           yup.string().min(8, 'Mínimo 8 caracteres').required('Informe a senha'),
  confirmar_senha: yup.string().oneOf([yup.ref('senha')], 'As senhas não coincidem').required('Confirme a senha'),
})

const promocaoSchema = yup.object({
  titulo:          yup.string().required('Informe o título'),
  slug:            yup.string().matches(/^[a-z0-9-]+$/, 'Apenas letras minúsculas, números e hífens').required('Informe o slug'),
  vigencia_inicio: yup.string().required('Informe o início da vigência'),
  vigencia_fim:    yup.string().required('Informe o fim da vigência'),
  tipo_fundo:      yup.string().oneOf(['solido', 'gradiente']).default('gradiente'),
  cor_fundo_1:     yup.string().default('#000D26'),
  cor_fundo_2:     yup.string().default('#003D90'),
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(str) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function formatarDataHora(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('pt-BR')
}

function formatarData(iso) {
  if (!iso) return '-'
  const [y, m, d] = iso.split('T')[0].split('-')
  return `${d}/${m}/${y}`
}

// ── Login ─────────────────────────────────────────────────────────────────────

function LoginForm({ onLoggedIn }) {
  const [erroGeral, setErroGeral]       = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: yupResolver(loginSchema) })

  async function onSubmit(values) {
    setErroGeral('')
    try {
      const resp = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify({ email: values.email, senha: values.senha }),
      })
      const data = await resp.json()
      if (resp.ok) onLoggedIn()
      else setErroGeral(data.erro || 'Credenciais inválidas')
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
          <FormField label="E-mail" required error={errors.email?.message}>
            <input type="email" autoComplete="email" className={errors.email ? 'invalido' : ''} {...register('email')} />
          </FormField>
          <FormField label="Senha" required error={errors.senha?.message}>
            <div style={{ position: 'relative' }}>
              <input
                type={mostrarSenha ? 'text' : 'password'}
                autoComplete="current-password"
                className={errors.senha ? 'invalido' : ''}
                style={{ paddingRight: 44 }}
                {...register('senha')}
              />
              <button type="button" onClick={() => setMostrarSenha(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(255,255,255,0.45)' }} tabIndex={-1}>
                {mostrarSenha
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>
          </FormField>
          {erroGeral && <div className="msg-erro">{erroGeral}</div>}
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Seção: Inscrições v1 ──────────────────────────────────────────────────────

function SecaoInscricoes() {
  const [lojas, setLojas]           = useState([])
  const [inscricoes, setInscricoes] = useState([])
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(1)
  const [lojaFiltro, setLojaFiltro] = useState('')
  const [busca, setBusca]           = useState('')
  const [buscaInput, setBuscaInput] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim]       = useState('')
  const [carregando, setCarregando] = useState(false)
  const LIMIT = 50

  useEffect(() => {
    fetch(`${API_URL}/api/lojas`, { credentials: 'include' }).then(r => r.json()).then(setLojas).catch(() => {})
  }, [])

  const carregar = useCallback(async () => {
    setCarregando(true)
    const params = new URLSearchParams({ page, limit: LIMIT })
    if (lojaFiltro) params.set('loja_id', lojaFiltro)
    if (busca)      params.set('busca', busca)
    if (dataInicio) params.set('data_inicio', dataInicio)
    if (dataFim)    params.set('data_fim', dataFim)
    try {
      const resp = await fetch(`${API_URL}/api/admin/inscricoes?${params}`, { credentials: 'include' })
      const data = await resp.json()
      setInscricoes(data.data || [])
      setTotal(data.total || 0)
    } catch {}
    setCarregando(false)
  }, [page, lojaFiltro, busca, dataInicio, dataFim])

  useEffect(() => { carregar() }, [carregar])

  function handleBuscar(e) { e.preventDefault(); setBusca(buscaInput); setPage(1) }

  function exportUrl() {
    const p = new URLSearchParams()
    if (lojaFiltro) p.set('loja_id', lojaFiltro)
    if (dataInicio) p.set('data_inicio', dataInicio)
    if (dataFim)    p.set('data_fim', dataFim)
    return `${API_URL}/api/admin/export?${p}`
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div>
      {/* Filtros */}
      <div style={filtrosStyle}>
        <div style={{ flex: '0 0 160px' }}>
          <label style={labelFiltroStyle}>Loja</label>
          <select value={lojaFiltro} onChange={e => { setLojaFiltro(e.target.value); setPage(1) }} style={selectStyle}>
            <option value="">Todas</option>
            {lojas.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
          </select>
        </div>
        <div style={{ flex: '0 0 150px' }}>
          <label style={labelFiltroStyle}>De</label>
          <input type="date" value={dataInicio} onChange={e => { setDataInicio(e.target.value); setPage(1) }} style={inputFiltroStyle} />
        </div>
        <div style={{ flex: '0 0 150px' }}>
          <label style={labelFiltroStyle}>Até</label>
          <input type="date" value={dataFim} onChange={e => { setDataFim(e.target.value); setPage(1) }} style={inputFiltroStyle} />
        </div>
        <form onSubmit={handleBuscar} style={{ flex: 1, display: 'flex', gap: 8, minWidth: 200 }}>
          <div style={{ flex: 1 }}>
            <label style={labelFiltroStyle}>Buscar</label>
            <input type="text" placeholder="Nome, telefone ou cupom..." value={buscaInput} onChange={e => setBuscaInput(e.target.value)} style={inputFiltroStyle} />
          </div>
          <button type="submit" style={{ ...btnAcaoStyle, alignSelf: 'flex-end' }}>Buscar</button>
          {(busca || dataInicio || dataFim || lojaFiltro) && (
            <button type="button" onClick={() => { setBuscaInput(''); setBusca(''); setDataInicio(''); setDataFim(''); setLojaFiltro(''); setPage(1) }} style={{ ...btnAcaoStyle, background: 'rgba(255,255,255,0.08)', alignSelf: 'flex-end' }}>Limpar</button>
          )}
        </form>
        <a href={exportUrl()} target="_blank" rel="noreferrer" style={{ ...btnAcaoStyle, textDecoration: 'none', alignSelf: 'flex-end', background: 'rgba(250,194,30,0.12)', border: '1px solid rgba(250,194,30,0.3)', color: '#FAC21E' }}>
          Exportar Excel
        </a>
      </div>

      {/* Tabela */}
      <div style={tabelaBoxStyle}>
        <div style={tabelaHeaderStyle}>
          <span style={tabelaTituloStyle}>INSCRIÇÕES — FESTIVAL DE PRÊMIOS</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{total} registro{total !== 1 ? 's' : ''}</span>
        </div>
        {carregando ? (
          <div style={loadingStyle}>Carregando...</div>
        ) : inscricoes.length === 0 ? (
          <div style={loadingStyle}>Nenhuma inscrição encontrada.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead><tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                {['#', 'Loja', 'Nome', 'Telefone', 'CPF', 'Cupom', 'Data', 'Influencer', 'Cadastrado em'].map(h => <th key={h} style={thStyle}>{h}</th>)}
              </tr></thead>
              <tbody>
                {inscricoes.map((r, i) => (
                  <tr key={r.id} style={trStyle(i)}>
                    <td style={tdStyle}>{r.id}</td>
                    <td style={tdStyle}><span style={badgeLojaStyle}>{r.loja}</span></td>
                    <td style={{ ...tdStyle, fontWeight: 600, color: '#fff' }}>{r.nome}</td>
                    <td style={tdStyle}>{r.telefone}</td>
                    <td style={tdStyle}>{r.cpf}</td>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{r.numero_cupom}</td>
                    <td style={tdStyle}>{formatarData(r.data_cupom)}</td>
                    <td style={tdStyle}>{r.comprou_influencer === 'true' ? (r.influencer_nome || 'Sim') : <span style={{ color: 'rgba(255,255,255,0.3)' }}>—</span>}</td>
                    <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>{formatarDataHora(r.criado_em)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div style={paginacaoStyle}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={pgBtnStyle(page === 1)}>← Anterior</button>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', padding: '0 8px' }}>Página {page} de {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={pgBtnStyle(page === totalPages)}>Próxima →</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Seção: Administradores ────────────────────────────────────────────────────

function SecaoAdmins({ adminAtual }) {
  const [admins, setAdmins]             = useState([])
  const [carregando, setCarregando]     = useState(true)
  const [mostrarForm, setMostrarForm]   = useState(false)
  const [erroGeral, setErroGeral]       = useState('')
  const [sucesso, setSucesso]           = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ resolver: yupResolver(cadastroAdminSchema) })

  const carregarAdmins = useCallback(async () => {
    setCarregando(true)
    try {
      const r = await fetch(`${API_URL}/api/admin/admins`, { credentials: 'include' })
      setAdmins(await r.json())
    } catch {}
    setCarregando(false)
  }, [])

  useEffect(() => { carregarAdmins() }, [carregarAdmins])

  async function onCadastrar(values) {
    setErroGeral(''); setSucesso('')
    try {
      const resp = await fetch(`${API_URL}/api/admin/admins`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ nome: values.nome, nome_completo: values.nome_completo, email: values.email, senha: values.senha }),
      })
      const data = await resp.json()
      if (resp.ok) { setSucesso('Administrador cadastrado com sucesso.'); reset(); setMostrarForm(false); carregarAdmins() }
      else setErroGeral(data.erro || 'Erro ao cadastrar')
    } catch { setErroGeral('Erro de conexão.') }
  }

  async function toggleAtivo(id, ativo) {
    try {
      await fetch(`${API_URL}/api/admin/admins/${id}/ativo`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ ativo }),
      })
      carregarAdmins()
    } catch {}
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={tabelaTituloStyle}>ADMINISTRADORES</span>
        <button onClick={() => { setMostrarForm(v => !v); setErroGeral(''); setSucesso('') }} style={{ ...btnAcaoStyle, background: 'rgba(250,194,30,0.12)', border: '1px solid rgba(250,194,30,0.3)', color: '#FAC21E', fontSize: 12 }}>
          {mostrarForm ? 'Cancelar' : '+ Novo admin'}
        </button>
      </div>

      {sucesso && <div style={msgSucessoStyle}>{sucesso}</div>}

      {mostrarForm && (
        <div style={{ ...tabelaBoxStyle, padding: 20, marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 16 }}>Novo administrador</p>
          <form onSubmit={handleSubmit(onCadastrar)} noValidate>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelFiltroStyle}>Nome (apelido) *</label>
                <input style={inputFiltroStyle} className={errors.nome ? 'invalido' : ''} {...register('nome')} />
                {errors.nome && <span style={erroInlineStyle}>{errors.nome.message}</span>}
              </div>
              <div>
                <label style={labelFiltroStyle}>Nome completo *</label>
                <input style={inputFiltroStyle} className={errors.nome_completo ? 'invalido' : ''} {...register('nome_completo')} />
                {errors.nome_completo && <span style={erroInlineStyle}>{errors.nome_completo.message}</span>}
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelFiltroStyle}>E-mail *</label>
                <input type="email" style={inputFiltroStyle} className={errors.email ? 'invalido' : ''} {...register('email')} />
                {errors.email && <span style={erroInlineStyle}>{errors.email.message}</span>}
              </div>
              <div>
                <label style={labelFiltroStyle}>Senha *</label>
                <div style={{ position: 'relative' }}>
                  <input type={mostrarSenha ? 'text' : 'password'} style={{ ...inputFiltroStyle, paddingRight: 40 }} className={errors.senha ? 'invalido' : ''} {...register('senha')} />
                  <button type="button" onClick={() => setMostrarSenha(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0 }} tabIndex={-1}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                </div>
                {errors.senha && <span style={erroInlineStyle}>{errors.senha.message}</span>}
              </div>
              <div>
                <label style={labelFiltroStyle}>Confirmar senha *</label>
                <input type={mostrarSenha ? 'text' : 'password'} style={inputFiltroStyle} className={errors.confirmar_senha ? 'invalido' : ''} {...register('confirmar_senha')} />
                {errors.confirmar_senha && <span style={erroInlineStyle}>{errors.confirmar_senha.message}</span>}
              </div>
            </div>
            {erroGeral && <div style={{ ...erroInlineStyle, display: 'block', marginTop: 10 }}>{erroGeral}</div>}
            <button type="submit" disabled={isSubmitting} style={{ ...btnAcaoStyle, marginTop: 14, background: '#FAC21E', color: '#0a1628', fontWeight: 700, border: 'none' }}>
              {isSubmitting ? 'Cadastrando...' : 'Cadastrar'}
            </button>
          </form>
        </div>
      )}

      {carregando ? <div style={loadingStyle}>Carregando...</div> : (
        <div style={tabelaBoxStyle}>
          <table style={tableStyle}>
            <thead><tr style={{ background: 'rgba(0,0,0,0.2)' }}>
              {['Nome', 'Nome completo', 'E-mail', 'Cadastrado em', 'Status'].map(h => <th key={h} style={thStyle}>{h}</th>)}
            </tr></thead>
            <tbody>
              {admins.map((a, i) => (
                <tr key={a.id} style={trStyle(i)}>
                  <td style={{ ...tdStyle, fontWeight: 600, color: '#fff' }}>
                    {a.nome}
                    {a.id === adminAtual.id && <span style={{ marginLeft: 8, fontSize: 10, color: '#FAC21E', background: 'rgba(250,194,30,0.1)', border: '1px solid rgba(250,194,30,0.25)', padding: '1px 6px', borderRadius: 10 }}>você</span>}
                  </td>
                  <td style={tdStyle}>{a.nome_completo}</td>
                  <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.55)' }}>{a.email}</td>
                  <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>{formatarDataHora(a.criado_em)}</td>
                  <td style={tdStyle}>
                    {a.id === adminAtual.id ? <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>—</span> : (
                      <button onClick={() => toggleAtivo(a.id, !a.ativo)} style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, cursor: 'pointer', border: 'none', background: a.ativo ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: a.ativo ? '#4ade80' : '#f87171' }}>
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

// ── Seção: Promoções ──────────────────────────────────────────────────────────

function SecaoPromocoes() {
  const [promocoes, setPromocoes]           = useState([])
  const [carregando, setCarregando]         = useState(true)
  const [vista, setVista]                   = useState('lista') // lista | form | inscricoes
  const [editando, setEditando]             = useState(null)
  const [promoSelecionada, setPromoSelecionada] = useState(null)
  const [erroGeral, setErroGeral]           = useState('')
  const [sucesso, setSucesso]               = useState('')
  const [produtos, setProdutos]             = useState([''])
  const [regras, setRegras]                 = useState([''])
  const [lojasDisponiveis, setLojasDisponiveis] = useState([])
  const [lojasPromo, setLojasPromo]         = useState([]) // IDs selecionados
  const [uploadSelo, setUploadSelo]         = useState(null)
  const [uploadImgProd, setUploadImgProd]   = useState(null)
  const [salvando, setSalvando]             = useState(false)
  const [linksAbertos, setLinksAbertos]     = useState(null) // id da promo com links expandidos
  const [copiado, setCopiado]               = useState(null) // slug da loja copiada

  function copiarLink(url, lojaSlug) {
    navigator.clipboard.writeText(url).then(() => {
      setCopiado(lojaSlug)
      setTimeout(() => setCopiado(null), 2000)
    })
  }

  async function toggleAtivo(promo) {
    try {
      await fetch(`${API_URL}/api/v2/promocoes/${promo.id}/ativo`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify({ ativo: !promo.ativo }),
      })
      carregarPromocoes()
    } catch {}
  }

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({ resolver: yupResolver(promocaoSchema) })
  const tituloWatch = watch('titulo', '')

  const carregarPromocoes = useCallback(async () => {
    setCarregando(true)
    try {
      const r = await fetch(`${API_URL}/api/v2/promocoes`, { credentials: 'include' })
      const data = await r.json()
      setPromocoes(Array.isArray(data) ? data : [])
    } catch {}
    setCarregando(false)
  }, [])

  useEffect(() => { carregarPromocoes() }, [carregarPromocoes])

  useEffect(() => {
    fetch(`${API_URL}/api/lojas`, { credentials: 'include' }).then(r => r.json()).then(setLojasDisponiveis).catch(() => {})
  }, [])

  useEffect(() => {
    if (vista === 'form' && !editando) {
      setValue('slug', slugify(tituloWatch))
    }
  }, [tituloWatch, vista, editando, setValue])

  function toggleLoja(id) {
    setLojasPromo(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function abrirNovaPromocao() {
    setEditando(null); reset(); setProdutos(['']); setRegras(['']); setLojasPromo([]); setUploadSelo(null); setUploadImgProd(null); setErroGeral(''); setSucesso(''); setVista('form')
  }

  function abrirEditar(promo) {
    setEditando(promo)
    reset({
      titulo:          promo.titulo,
      slug:            promo.slug,
      vigencia_inicio: promo.vigencia_inicio?.split('T')[0] ?? promo.vigencia_inicio,
      vigencia_fim:    promo.vigencia_fim?.split('T')[0] ?? promo.vigencia_fim,
      tipo_fundo:      promo.tipo_fundo  ?? 'gradiente',
      cor_fundo_1:     promo.cor_fundo_1 ?? '#000D26',
      cor_fundo_2:     promo.cor_fundo_2 ?? '#003D90',
    })
    setErroGeral(''); setSucesso(''); setVista('form')
    fetch(`${API_URL}/api/v2/promocoes/${promo.slug}`)
      .then(r => r.json())
      .then(data => {
        setProdutos(data.produtos?.length ? data.produtos : [''])
        setRegras(data.regras?.length ? data.regras : [''])
        setLojasPromo(Array.isArray(data.lojas) ? data.lojas.map(l => l.id) : [])
      }).catch(() => { setProdutos(['']); setRegras(['']); setLojasPromo([]) })
  }

  async function onSalvar(values) {
    setErroGeral(''); setSalvando(true)
    const body = {
      titulo: values.titulo, slug: values.slug,
      vigencia_inicio: values.vigencia_inicio, vigencia_fim: values.vigencia_fim,
      ativo: true,
      tipo_fundo:  values.tipo_fundo  || 'gradiente',
      cor_fundo_1: values.cor_fundo_1 || '#000D26',
      cor_fundo_2: values.cor_fundo_2 || '#003D90',
      produtos: produtos.filter(p => p.trim()),
      regras:   regras.filter(r => r.trim()),
      lojas:    lojasPromo,
    }
    try {
      const url    = editando ? `${API_URL}/api/v2/promocoes/${editando.id}` : `${API_URL}/api/v2/promocoes`
      const method = editando ? 'PUT' : 'POST'
      const resp   = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body) })
      const data   = await resp.json()
      if (!resp.ok) { setErroGeral(data.erro || 'Erro ao salvar'); setSalvando(false); return }

      const promoId = editando?.id ?? data.id

      // Upload imagens se selecionadas
      if (uploadSelo) {
        const fd = new FormData(); fd.append('imagem', uploadSelo)
        const r = await fetch(`${API_URL}/api/v2/promocoes/${promoId}/selo`, { method: 'POST', credentials: 'include', body: fd })
        if (!r.ok) {
          const d = await r.json().catch(() => ({}))
          setErroGeral(d.erro || 'Erro ao enviar o selo. Verifique o formato do arquivo.')
          setSalvando(false); return
        }
      }
      if (uploadImgProd) {
        const fd = new FormData(); fd.append('imagem', uploadImgProd)
        const r = await fetch(`${API_URL}/api/v2/promocoes/${promoId}/imagem-produtos`, { method: 'POST', credentials: 'include', body: fd })
        if (!r.ok) {
          const d = await r.json().catch(() => ({}))
          setErroGeral(d.erro || 'Erro ao enviar a imagem de produtos. Verifique o formato do arquivo.')
          setSalvando(false); return
        }
      }

      setSucesso(editando ? 'Promoção atualizada.' : 'Promoção criada com sucesso.')
      carregarPromocoes(); setVista('lista')
    } catch { setErroGeral('Erro de conexão.') }
    setSalvando(false)
  }

  // ── Lista de promoções
  if (vista === 'lista') return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={tabelaTituloStyle}>PROMOÇÕES</span>
        <button onClick={abrirNovaPromocao} style={{ ...btnAcaoStyle, background: 'rgba(250,194,30,0.12)', border: '1px solid rgba(250,194,30,0.3)', color: '#FAC21E', fontSize: 12 }}>+ Nova promoção</button>
      </div>
      {sucesso && <div style={msgSucessoStyle}>{sucesso}</div>}
      {carregando ? <div style={loadingStyle}>Carregando...</div> : (
        <div style={tabelaBoxStyle}>
          {promocoes.length === 0 ? (
            <div style={loadingStyle}>Nenhuma promoção cadastrada.</div>
          ) : (
            <table style={tableStyle}>
              <thead><tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                {['Título', 'Slug', 'Vigência', 'Status', 'Ações'].map(h => <th key={h} style={thStyle}>{h}</th>)}
              </tr></thead>
              <tbody>
                {promocoes.map((p, i) => {
                  const hoje   = new Date().toISOString().split('T')[0]
                  const ativa  = p.ativo && p.vigencia_fim >= hoje
                  const lojas  = Array.isArray(p.lojas) ? p.lojas : []
                  const aberto = linksAbertos === p.id
                  return (
                    <>
                      <tr key={p.id} style={trStyle(i)}>
                        <td style={{ ...tdStyle, fontWeight: 600, color: '#fff' }}>{p.titulo}</td>
                        <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>{p.slug}</td>
                        <td style={{ ...tdStyle, whiteSpace: 'nowrap', fontSize: 12 }}>{formatarData(p.vigencia_inicio)} → {formatarData(p.vigencia_fim)}</td>
                        <td style={tdStyle}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: ativa ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: ativa ? '#4ade80' : '#f87171' }}>
                            {ativa ? 'Ativa' : 'Inativa'}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button onClick={() => abrirEditar(p)} style={{ ...btnAcaoStyle, fontSize: 11, padding: '5px 12px' }}>Editar</button>
                          <button onClick={() => toggleAtivo(p)} style={{ ...btnAcaoStyle, fontSize: 11, padding: '5px 12px', background: p.ativo ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', border: `1px solid ${p.ativo ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.25)'}`, color: p.ativo ? '#f87171' : '#4ade80' }}>
                            {p.ativo ? 'Inativar' : 'Ativar'}
                          </button>
                          <button onClick={() => { setPromoSelecionada(p); setVista('inscricoes') }} style={{ ...btnAcaoStyle, fontSize: 11, padding: '5px 12px', background: 'rgba(250,194,30,0.08)', border: '1px solid rgba(250,194,30,0.2)', color: '#FAC21E' }}>Inscrições</button>
                          <button onClick={() => setLinksAbertos(aberto ? null : p.id)} style={{ ...btnAcaoStyle, fontSize: 11, padding: '5px 12px', background: aberto ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
                            {aberto ? 'Fechar' : '🔗 Links'}
                          </button>
                        </td>
                      </tr>
                      {aberto && (
                        <tr key={`${p.id}-links`} style={{ background: 'rgba(99,102,241,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td colSpan={5} style={{ padding: '12px 16px' }}>
                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Links para compartilhar</p>
                            {lojas.length === 0 ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <code style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.05)', padding: '5px 10px', borderRadius: 6, flex: 1 }}>
                                  {window.location.origin}/promo/{p.slug}
                                </code>
                                <button onClick={() => copiarLink(`${window.location.origin}/promo/${p.slug}`, p.slug)} style={{ ...btnAcaoStyle, fontSize: 11, padding: '5px 14px', background: copiado === p.slug ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.07)', color: copiado === p.slug ? '#4ade80' : '#fff', border: copiado === p.slug ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(255,255,255,0.15)', minWidth: 90 }}>
                                  {copiado === p.slug ? '✓ Copiado' : 'Copiar'}
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {lojas.map(l => {
                                  const url = `${window.location.origin}/promo/${p.slug}/loja/${l.slug}`
                                  const key = `${p.id}-${l.slug}`
                                  return (
                                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                      <span style={{ fontSize: 11, fontWeight: 700, color: '#FAC21E', minWidth: 90 }}>{l.nome}</span>
                                      <code style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.05)', padding: '5px 10px', borderRadius: 6, flex: 1 }}>
                                        {url}
                                      </code>
                                      <button onClick={() => copiarLink(url, key)} style={{ ...btnAcaoStyle, fontSize: 11, padding: '5px 14px', background: copiado === key ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.07)', color: copiado === key ? '#4ade80' : '#fff', border: copiado === key ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(255,255,255,0.15)', minWidth: 90 }}>
                                        {copiado === key ? '✓ Copiado' : 'Copiar'}
                                      </button>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )

  // ── Inscrições de uma promoção
  if (vista === 'inscricoes') return <SecaoInscricoesPromo promo={promoSelecionada} onVoltar={() => setVista('lista')} />

  // ── Formulário criar/editar
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => setVista('lista')} style={{ ...btnAcaoStyle, fontSize: 12, padding: '6px 12px' }}>← Voltar</button>
        <span style={tabelaTituloStyle}>{editando ? 'EDITAR PROMOÇÃO' : 'NOVA PROMOÇÃO'}</span>
      </div>

      <form onSubmit={handleSubmit(onSalvar)} noValidate>
        <div style={{ ...tabelaBoxStyle, padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelFiltroStyle}>Título (interno) *</label>
              <input style={inputFiltroStyle} className={errors.titulo ? 'invalido' : ''} {...register('titulo')} placeholder="Ex: Festival de Prêmios 2027" />
              {errors.titulo && <span style={erroInlineStyle}>{errors.titulo.message}</span>}
            </div>
            <div>
              <label style={labelFiltroStyle}>Slug (URL) *</label>
              <input style={inputFiltroStyle} className={errors.slug ? 'invalido' : ''} {...register('slug')} placeholder="ex: festival-premios-2027" />
              {errors.slug && <span style={erroInlineStyle}>{errors.slug.message}</span>}
              <span style={{ ...erroInlineStyle, color: 'rgba(255,255,255,0.35)' }}>/promo/{watch('slug') || '...'}</span>
            </div>
            <div />
            <div>
              <label style={labelFiltroStyle}>Início da vigência *</label>
              <input type="date" style={inputFiltroStyle} className={errors.vigencia_inicio ? 'invalido' : ''} {...register('vigencia_inicio')} />
              {errors.vigencia_inicio && <span style={erroInlineStyle}>{errors.vigencia_inicio.message}</span>}
            </div>
            <div>
              <label style={labelFiltroStyle}>Fim da vigência *</label>
              <input type="date" style={inputFiltroStyle} className={errors.vigencia_fim ? 'invalido' : ''} {...register('vigencia_fim')} />
              {errors.vigencia_fim && <span style={erroInlineStyle}>{errors.vigencia_fim.message}</span>}
            </div>
          </div>
        </div>

        {/* Imagens */}
        <div style={{ ...tabelaBoxStyle, padding: 20, marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#FAC21E', marginBottom: 14, letterSpacing: '0.5px' }}>IMAGENS</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelFiltroStyle}>Imagem do selo</label>
              <input type="file" accept="image/*" onChange={e => setUploadSelo(e.target.files[0])} style={{ ...inputFiltroStyle, padding: '8px 12px', cursor: 'pointer' }} />
              {editando?.selo_url && !uploadSelo && <img src={`${API_URL}${editando.selo_url}`} alt="Selo atual" style={{ marginTop: 8, height: 60, borderRadius: 6, objectFit: 'contain' }} />}
            </div>
            <div>
              <label style={labelFiltroStyle}>Imagem dos produtos</label>
              <input type="file" accept="image/*" onChange={e => setUploadImgProd(e.target.files[0])} style={{ ...inputFiltroStyle, padding: '8px 12px', cursor: 'pointer' }} />
              {editando?.imagem_produtos_url && !uploadImgProd && <img src={`${API_URL}${editando.imagem_produtos_url}`} alt="Produtos atual" style={{ marginTop: 8, height: 60, borderRadius: 6, objectFit: 'contain' }} />}
            </div>
          </div>
        </div>

        {/* Fundo */}
        <div style={{ ...tabelaBoxStyle, padding: 20, marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#FAC21E', marginBottom: 14, letterSpacing: '0.5px' }}>FUNDO DA PÁGINA</p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div>
              <label style={labelFiltroStyle}>Tipo</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                {[{ val: 'gradiente', label: 'Degradê' }, { val: 'solido', label: 'Cor sólida' }].map(op => (
                  <label key={op.val} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.75)', cursor: 'pointer' }}>
                    <input type="radio" value={op.val} {...register('tipo_fundo')} style={{ accentColor: '#FAC21E' }} />
                    {op.label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label style={labelFiltroStyle}>{watch('tipo_fundo') === 'solido' ? 'Cor' : 'Cor inicial'}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <input type="color" value={watch('cor_fundo_1') || '#000D26'} onChange={e => setValue('cor_fundo_1', e.target.value)} style={{ width: 40, height: 36, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, cursor: 'pointer', background: 'none', padding: 2 }} />
                <input type="text" {...register('cor_fundo_1')} style={{ ...inputFiltroStyle, width: 100 }} placeholder="#000D26" maxLength={7} />
              </div>
            </div>
            {watch('tipo_fundo') !== 'solido' && (
              <div>
                <label style={labelFiltroStyle}>Cor final</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <input type="color" value={watch('cor_fundo_2') || '#003D90'} onChange={e => setValue('cor_fundo_2', e.target.value)} style={{ width: 40, height: 36, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, cursor: 'pointer', background: 'none', padding: 2 }} />
                  <input type="text" {...register('cor_fundo_2')} style={{ ...inputFiltroStyle, width: 100 }} placeholder="#003D90" maxLength={7} />
                </div>
              </div>
            )}
            {/* Preview do fundo */}
            <div>
              <label style={labelFiltroStyle}>Preview</label>
              <div style={{
                marginTop: 4, width: 80, height: 36, borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.15)',
                background: watch('tipo_fundo') === 'solido'
                  ? (watch('cor_fundo_1') || '#000D26')
                  : `linear-gradient(135deg, ${watch('cor_fundo_1') || '#000D26'}, ${watch('cor_fundo_2') || '#003D90'})`,
              }} />
            </div>
          </div>
        </div>

        {/* Lojas */}
        <div style={{ ...tabelaBoxStyle, padding: 20, marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#FAC21E', marginBottom: 6, letterSpacing: '0.5px' }}>LOJAS PARTICIPANTES</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 14 }}>Sem seleção = promoção sem vínculo de loja (campo não aparece no formulário)</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {lojasDisponiveis.map(l => (
              <label key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: lojasPromo.includes(l.id) ? '#FAC21E' : 'rgba(255,255,255,0.6)', cursor: 'pointer', background: lojasPromo.includes(l.id) ? 'rgba(250,194,30,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${lojasPromo.includes(l.id) ? 'rgba(250,194,30,0.35)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 8, padding: '8px 14px', transition: 'all 0.15s' }}>
                <input type="checkbox" checked={lojasPromo.includes(l.id)} onChange={() => toggleLoja(l.id)} style={{ accentColor: '#FAC21E' }} />
                {l.nome}
              </label>
            ))}
          </div>
        </div>

        {/* Produtos */}
        <div style={{ ...tabelaBoxStyle, padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#FAC21E', letterSpacing: '0.5px' }}>LISTA DE PRODUTOS</p>
            <button type="button" onClick={() => setProdutos(p => [...p, ''])} style={{ ...btnAcaoStyle, fontSize: 11, padding: '4px 10px' }}>+ Adicionar</button>
          </div>
          {produtos.map((prod, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input value={prod} onChange={e => setProdutos(p => p.map((x, j) => j === i ? e.target.value : x))} style={{ ...inputFiltroStyle, flex: 1 }} placeholder={`Produto ${i + 1}`} />
              {produtos.length > 1 && <button type="button" onClick={() => setProdutos(p => p.filter((_, j) => j !== i))} style={{ ...btnAcaoStyle, padding: '0 12px', color: '#f87171', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>×</button>}
            </div>
          ))}
        </div>

        {/* Regras */}
        <div style={{ ...tabelaBoxStyle, padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#FAC21E', letterSpacing: '0.5px' }}>REGULAMENTO</p>
            <button type="button" onClick={() => setRegras(r => [...r, ''])} style={{ ...btnAcaoStyle, fontSize: 11, padding: '4px 10px' }}>+ Adicionar</button>
          </div>
          {regras.map((regra, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input value={regra} onChange={e => setRegras(r => r.map((x, j) => j === i ? e.target.value : x))} style={{ ...inputFiltroStyle, flex: 1 }} placeholder={`Regra ${i + 1}`} />
              {regras.length > 1 && <button type="button" onClick={() => setRegras(r => r.filter((_, j) => j !== i))} style={{ ...btnAcaoStyle, padding: '0 12px', color: '#f87171', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>×</button>}
            </div>
          ))}
        </div>

        {erroGeral && <div className="msg-erro" style={{ marginBottom: 16 }}>{erroGeral}</div>}
        <button type="submit" disabled={salvando} style={{ ...btnAcaoStyle, background: '#FAC21E', color: '#0a1628', fontWeight: 700, border: 'none', padding: '12px 24px', fontSize: 14 }}>
          {salvando ? 'Salvando...' : (editando ? 'Salvar alterações' : 'Criar promoção')}
        </button>
      </form>
    </div>
  )
}

// ── Inscrições de uma promoção específica (v2) ────────────────────────────────

function SecaoInscricoesPromo({ promo, onVoltar }) {
  const lojas = Array.isArray(promo.lojas) ? promo.lojas : []
  const [inscricoes, setInscricoes] = useState([])
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(1)
  const [lojaFiltro, setLojaFiltro] = useState('')
  const [busca, setBusca]           = useState('')
  const [buscaInput, setBuscaInput] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim]       = useState('')
  const [carregando, setCarregando] = useState(false)
  const LIMIT = 50

  const carregar = useCallback(async () => {
    setCarregando(true)
    const params = new URLSearchParams({ page, limit: LIMIT })
    if (lojaFiltro) params.set('loja_id', lojaFiltro)
    if (busca)      params.set('busca', busca)
    if (dataInicio) params.set('data_inicio', dataInicio)
    if (dataFim)    params.set('data_fim', dataFim)
    try {
      const r = await fetch(`${API_URL}/api/v2/promocoes/${promo.id}/inscricoes?${params}`, { credentials: 'include' })
      const d = await r.json()
      setInscricoes(d.data || [])
      setTotal(d.total || 0)
    } catch {}
    setCarregando(false)
  }, [page, lojaFiltro, busca, dataInicio, dataFim, promo.id])

  useEffect(() => { carregar() }, [carregar])

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={onVoltar} style={{ ...btnAcaoStyle, fontSize: 12, padding: '6px 12px' }}>← Voltar</button>
        <span style={tabelaTituloStyle}>INSCRIÇÕES — {promo.titulo.toUpperCase()}</span>
      </div>

      <div style={filtrosStyle}>
        <div style={{ flex: '0 0 160px' }}>
          <label style={labelFiltroStyle}>Loja</label>
          <select value={lojaFiltro} onChange={e => { setLojaFiltro(e.target.value); setPage(1) }} style={selectStyle}>
            <option value="">Todas</option>
            {lojas.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
          </select>
        </div>
        <div style={{ flex: '0 0 150px' }}>
          <label style={labelFiltroStyle}>De</label>
          <input type="date" value={dataInicio} onChange={e => { setDataInicio(e.target.value); setPage(1) }} style={inputFiltroStyle} />
        </div>
        <div style={{ flex: '0 0 150px' }}>
          <label style={labelFiltroStyle}>Até</label>
          <input type="date" value={dataFim} onChange={e => { setDataFim(e.target.value); setPage(1) }} style={inputFiltroStyle} />
        </div>
        <form onSubmit={e => { e.preventDefault(); setBusca(buscaInput); setPage(1) }} style={{ flex: 1, display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={labelFiltroStyle}>Buscar</label>
            <input type="text" placeholder="Nome, telefone ou cupom..." value={buscaInput} onChange={e => setBuscaInput(e.target.value)} style={inputFiltroStyle} />
          </div>
          <button type="submit" style={{ ...btnAcaoStyle, alignSelf: 'flex-end' }}>Buscar</button>
        </form>
      </div>

      <div style={tabelaBoxStyle}>
        <div style={tabelaHeaderStyle}>
          <span style={tabelaTituloStyle}>INSCRIÇÕES</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{total} registro{total !== 1 ? 's' : ''}</span>
        </div>
        {carregando ? <div style={loadingStyle}>Carregando...</div> : inscricoes.length === 0 ? (
          <div style={loadingStyle}>Nenhuma inscrição encontrada.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead><tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                {['#', 'Loja', 'Nome', 'Telefone', 'Cupom', 'Data', 'Influencer', 'Cadastrado em'].map(h => <th key={h} style={thStyle}>{h}</th>)}
              </tr></thead>
              <tbody>
                {inscricoes.map((r, i) => (
                  <tr key={r.id} style={trStyle(i)}>
                    <td style={tdStyle}>{r.id}</td>
                    <td style={tdStyle}><span style={badgeLojaStyle}>{r.loja}</span></td>
                    <td style={{ ...tdStyle, fontWeight: 600, color: '#fff' }}>{r.nome}</td>
                    <td style={tdStyle}>{r.telefone}</td>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{r.numero_cupom}</td>
                    <td style={tdStyle}>{formatarData(r.data_cupom)}</td>
                    <td style={tdStyle}>{r.comprou_influencer ? (r.influencer_nome || 'Sim') : <span style={{ color: 'rgba(255,255,255,0.3)' }}>—</span>}</td>
                    <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>{formatarDataHora(r.criado_em)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div style={paginacaoStyle}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={pgBtnStyle(page === 1)}>← Anterior</button>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', padding: '0 8px' }}>Página {page} de {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={pgBtnStyle(page === totalPages)}>Próxima →</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Dashboard com menu lateral ────────────────────────────────────────────────

const MENU = [
  { id: 'inscricoes', label: 'Inscrições'      },
  { id: 'admins',     label: 'Administradores' },
  { id: 'promocoes',  label: 'Promoções'       },
]

function Dashboard({ adminAtual, onLogout }) {
  const [secao, setSecao]           = useState('inscricoes')
  const [stats, setStats]           = useState([])
  const [menuAberto, setMenuAberto] = useState(false)

  useEffect(() => {
    fetch(`${API_URL}/api/admin/stats`, { credentials: 'include' }).then(r => r.json()).then(setStats).catch(() => {})
  }, [])

  async function handleLogout() {
    await fetch(`${API_URL}/api/admin/logout`, { method: 'POST', credentials: 'include' })
    onLogout()
  }

  const totalGeral = stats.reduce((s, l) => s + l.total, 0)

  return (
    <div style={{ minHeight: '100vh', background: '#0a1628', color: '#fff', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: 'rgba(0,0,0,0.45)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setMenuAberto(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', padding: 4, display: 'none' }} className="menu-toggle">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <img src="/LOGO POPULAR - COM SOMBRA (3).png" alt="Supermercados Popular" style={{ height: 32 }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: '#FAC21E' }}>Painel Admin</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Olá, <strong style={{ color: 'rgba(255,255,255,0.85)' }}>{adminAtual.nome}</strong></span>
          <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.65)', fontSize: 13, padding: '6px 14px', borderRadius: 8, cursor: 'pointer' }}>Sair</button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1 }}>

        {/* Menu lateral */}
        <aside style={{ width: 220, background: 'rgba(0,0,0,0.3)', borderRight: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', padding: '24px 0', flexShrink: 0 }}>
          <div style={{ padding: '0 16px', marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Menu</span>
          </div>
          {MENU.map(item => (
            <button key={item.id} onClick={() => setSecao(item.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 20px', background: 'none', border: 'none', borderLeft: secao === item.id ? '3px solid #FAC21E' : '3px solid transparent', cursor: 'pointer', fontSize: 14, fontWeight: secao === item.id ? 700 : 400, color: secao === item.id ? '#FAC21E' : 'rgba(255,255,255,0.5)', textAlign: 'left', width: '100%', transition: 'all 0.15s' }}>
              {item.label}
            </button>
          ))}

          {/* Stats rápidos */}
          {stats.length > 0 && (
            <div style={{ marginTop: 'auto', padding: '20px 16px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, display: 'block', marginBottom: 10 }}>Inscrições v1</span>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#FAC21E' }}>{totalGeral}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>total geral</div>
              {stats.map(s => (
                <div key={s.slug} style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{s.total}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{s.nome}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ padding: '16px 20px 0', marginTop: stats.length ? 16 : 'auto' }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>v2.0.0</span>
          </div>
        </aside>

        {/* Conteúdo */}
        <main style={{ flex: 1, padding: '28px 28px 48px', overflowX: 'hidden' }}>
          {secao === 'inscricoes' && <SecaoInscricoes />}
          {secao === 'admins'     && <SecaoAdmins adminAtual={adminAtual} />}
          {secao === 'promocoes'  && <SecaoPromocoes />}
        </main>
      </div>
    </div>
  )
}

// ── Estilos compartilhados ────────────────────────────────────────────────────

const filtrosStyle    = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 16px', marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }
const tabelaBoxStyle  = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }
const tabelaHeaderStyle = { padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
const tabelaTituloStyle = { fontSize: 12, fontWeight: 700, color: '#FAC21E', letterSpacing: '0.5px' }
const tableStyle      = { width: '100%', borderCollapse: 'collapse', fontSize: 13 }
const thStyle         = { padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }
const tdStyle         = { padding: '10px 14px', color: 'rgba(255,255,255,0.72)', verticalAlign: 'middle' }
const trStyle         = (i) => ({ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' })
const loadingStyle    = { padding: 36, textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 13 }
const paginacaoStyle  = { padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }
const selectStyle     = { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', borderRadius: 8, padding: '9px 12px', fontSize: 13 }
const inputFiltroStyle = { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', borderRadius: 8, padding: '9px 12px', fontSize: 13, boxSizing: 'border-box' }
const btnAcaoStyle    = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: 8, padding: '9px 14px', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }
const labelFiltroStyle = { fontSize: 10, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }
const erroInlineStyle  = { fontSize: 11, color: '#f87171', marginTop: 4, display: 'block' }
const msgSucessoStyle  = { background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 14 }
const badgeLojaStyle   = { fontSize: 10, fontWeight: 700, color: '#FAC21E', background: 'rgba(250,194,30,0.1)', border: '1px solid rgba(250,194,30,0.2)', padding: '2px 8px', borderRadius: 20 }
const pgBtnStyle       = (disabled) => ({ ...btnAcaoStyle, opacity: disabled ? 0.3 : 1, cursor: disabled ? 'default' : 'pointer' })

// ── Componente principal ──────────────────────────────────────────────────────

export default function Admin() {
  const [adminAtual, setAdminAtual] = useState(undefined)

  useEffect(() => {
    fetch(`${API_URL}/api/admin/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(setAdminAtual)
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
      fetch(`${API_URL}/api/admin/me`, { credentials: 'include' }).then(r => r.json()).then(setAdminAtual).catch(() => setAdminAtual(null))
    }} />
  }

  return <Dashboard adminAtual={adminAtual} onLogout={() => setAdminAtual(null)} />
}
