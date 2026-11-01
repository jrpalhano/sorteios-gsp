import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

// Regex: sequência de exatamente 44 dígitos não precedida nem seguida por outro dígito
const REGEX_CHAVE = /(?<!\d)(\d{44})(?!\d)/

// Algoritmo Módulo 11 da SEFAZ — valida o dígito verificador da chave de acesso
function validarChaveNF(chave) {
  if (!/^\d{44}$/.test(chave)) return false
  const d = chave.split('').map(Number)
  let peso = 2, soma = 0
  for (let i = 42; i >= 0; i--) {
    soma += d[i] * peso
    peso = peso === 9 ? 2 : peso + 1
  }
  const resto    = soma % 11
  const esperado = resto < 2 ? 0 : 11 - resto
  return d[43] === esperado
}

function extrairChave(conteudo) {
  const match = conteudo.match(REGEX_CHAVE)
  if (!match) return null
  const chave = match[1]
  return validarChaveNF(chave) ? chave : null
}

// Exibe apenas os últimos 12 dígitos com espaçamento para leitura
function formatarChaveTruncada(chave) {
  return `···· ···· ···· ${chave.slice(32, 36)} ${chave.slice(36, 40)} ${chave.slice(40)}`
}

const SCANNER_ID = 'qr-nf-scanner-viewport'

export default function QrNfScanner({ onScan, chaveAtual, onLimpar }) {
  const [aberto, setAberto]     = useState(false)
  const [erro, setErro]         = useState('')
  const [modo, setModo]         = useState('camera') // 'camera' | 'arquivo'
  const scannerRef              = useRef(null)
  const fileInputRef            = useRef(null)

  // Inicia câmera quando o modal abre no modo câmera
  useEffect(() => {
    if (!aberto || modo !== 'camera') return

    const scanner = new Html5Qrcode(SCANNER_ID)
    scannerRef.current = scanner

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 260, height: 260 } },
      (texto) => {
        const chave = extrairChave(texto)
        if (chave) {
          pararScanner()
          fechar()
          onScan(chave)
        } else {
          setErro('QR code lido, mas não é uma nota fiscal válida. Tente novamente.')
        }
      },
      () => {} // erros de frame são silenciosos — câmera ainda está buscando
    ).catch(() => {
      setErro('Não foi possível acessar a câmera. Verifique as permissões ou use a opção de arquivo.')
    })

    return () => { pararScanner() }
  }, [aberto, modo])

  function pararScanner() {
    if (scannerRef.current?.isScanning) {
      scannerRef.current.stop().catch(() => {})
    }
    scannerRef.current = null
  }

  function abrir() {
    setErro('')
    setModo('camera')
    setAberto(true)
  }

  function fechar() {
    pararScanner()
    setAberto(false)
    setErro('')
    setModo('camera')
  }

  function trocarParaArquivo() {
    pararScanner()
    setModo('arquivo')
    setErro('')
  }

  async function handleArquivo(e) {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    setErro('')

    try {
      const scanner = new Html5Qrcode('qr-nf-file-reader')
      const resultado = await scanner.scanFile(arquivo, false)
      const chave = extrairChave(resultado)
      if (chave) {
        fechar()
        onScan(chave)
      } else {
        setErro('Imagem lida, mas não contém uma chave de nota fiscal válida.')
      }
    } catch {
      setErro('Não foi possível ler o QR code da imagem. Verifique se a foto está nítida.')
    } finally {
      // Reseta o input para permitir selecionar o mesmo arquivo novamente
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <>
      {/* Botão de abertura / estado após scan */}
      {chaveAtual ? (
        <div style={styles.chaveCapturada}>
          <div style={styles.chaveInfo}>
            <span style={styles.chaveIcone}>✅</span>
            <div>
              <div style={styles.chaveTitulo}>Chave capturada</div>
              <div style={styles.chaveValor}>{formatarChaveTruncada(chaveAtual)}</div>
            </div>
          </div>
          <button type="button" onClick={onLimpar} style={styles.btnLimpar} title="Remover chave">
            ✕
          </button>
        </div>
      ) : (
        <button type="button" onClick={abrir} style={styles.btnScanear}>
          <span style={{ fontSize: 18 }}>📷</span>
          <span>Escanear QR da nota fiscal</span>
        </button>
      )}

      {/* Modal */}
      {aberto && (
        <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && fechar()}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <span style={styles.modalTitulo}>QR code da nota fiscal</span>
              <button type="button" onClick={fechar} style={styles.btnFechar}>✕</button>
            </div>

            {modo === 'camera' && (
              <>
                <div style={styles.viewfinderWrap}>
                  <div id={SCANNER_ID} style={styles.viewfinder} />
                </div>
                <p style={styles.instrucao}>
                  Aponte a câmera para o QR code impresso no cupom fiscal
                </p>
              </>
            )}

            {modo === 'arquivo' && (
              <div style={styles.arquivoArea}>
                {/* Elemento invisível usado pela lib para ler o arquivo */}
                <div id="qr-nf-file-reader" style={{ display: 'none' }} />
                <p style={styles.instrucao}>
                  Selecione uma foto do cupom fiscal com o QR code visível
                </p>
                <label style={styles.btnArquivoLabel}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleArquivo}
                    style={{ display: 'none' }}
                  />
                  📁 Selecionar imagem
                </label>
              </div>
            )}

            {erro && <div style={styles.erroBox}>{erro}</div>}

            <div style={styles.modalFooter}>
              {modo === 'camera' && (
                <button type="button" onClick={trocarParaArquivo} style={styles.btnAlternativo}>
                  Usar foto da galeria
                </button>
              )}
              {modo === 'arquivo' && (
                <button type="button" onClick={() => { setModo('camera'); setErro('') }} style={styles.btnAlternativo}>
                  Usar câmera
                </button>
              )}
              <button type="button" onClick={fechar} style={styles.btnManual}>
                Digitar manualmente
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const styles = {
  btnScanear: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            10,
    width:          '100%',
    padding:        '12px 16px',
    background:     'rgba(250,194,30,0.12)',
    color:          '#FAC21E',
    fontSize:       15,
    fontWeight:     700,
    border:         '1.5px solid rgba(250,194,30,0.4)',
    borderRadius:   10,
    cursor:         'pointer',
    transition:     'background 0.2s, border-color 0.2s',
  },
  chaveCapturada: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        '12px 14px',
    background:     'rgba(40,167,69,0.12)',
    border:         '1.5px solid rgba(40,167,69,0.35)',
    borderRadius:   10,
  },
  chaveInfo: {
    display:    'flex',
    alignItems: 'center',
    gap:        10,
  },
  chaveIcone: { fontSize: 18 },
  chaveTitulo: {
    fontSize:   12,
    color:      'rgba(255,255,255,0.5)',
    marginBottom: 2,
  },
  chaveValor: {
    fontSize:    13,
    fontWeight:  700,
    color:       '#6fcf97',
    letterSpacing: '0.5px',
    fontFamily:  'monospace',
  },
  btnLimpar: {
    background:  'transparent',
    border:      'none',
    color:       'rgba(255,255,255,0.4)',
    fontSize:    16,
    cursor:      'pointer',
    padding:     '4px 8px',
    lineHeight:  1,
  },
  overlay: {
    position:        'fixed',
    inset:           0,
    background:      'rgba(0,0,0,0.75)',
    display:         'flex',
    alignItems:      'flex-end',
    justifyContent:  'center',
    zIndex:          1000,
    padding:         '0 0 0 0',
  },
  modal: {
    background:   '#001A4D',
    borderRadius: '20px 20px 0 0',
    padding:      '24px 20px 36px',
    width:        '100%',
    maxWidth:     480,
    maxHeight:    '90vh',
    overflowY:    'auto',
    boxShadow:    '0 -4px 32px rgba(0,0,0,0.5)',
  },
  modalHeader: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   20,
  },
  modalTitulo: {
    fontSize:   16,
    fontWeight: 700,
    color:      '#FAC21E',
  },
  btnFechar: {
    background:  'transparent',
    border:      'none',
    color:       'rgba(255,255,255,0.5)',
    fontSize:    20,
    cursor:      'pointer',
    lineHeight:  1,
    padding:     '0 4px',
  },
  viewfinderWrap: {
    borderRadius: 12,
    overflow:     'hidden',
    marginBottom: 16,
    background:   '#000',
  },
  viewfinder: {
    width:  '100%',
    aspectRatio: '1 / 1',
  },
  arquivoArea: {
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    gap:            16,
    padding:        '24px 0',
  },
  instrucao: {
    fontSize:   13,
    color:      'rgba(255,255,255,0.55)',
    textAlign:  'center',
    lineHeight: 1.6,
    margin:     '0 0 8px',
  },
  btnArquivoLabel: {
    display:        'flex',
    alignItems:     'center',
    gap:            8,
    padding:        '12px 24px',
    background:     'rgba(250,194,30,0.12)',
    color:          '#FAC21E',
    fontSize:       15,
    fontWeight:     700,
    border:         '1.5px solid rgba(250,194,30,0.4)',
    borderRadius:   10,
    cursor:         'pointer',
  },
  erroBox: {
    background:   'rgba(220,53,69,0.15)',
    border:       '1px solid rgba(220,53,69,0.4)',
    color:        '#ff8080',
    fontSize:     13,
    padding:      '10px 14px',
    borderRadius: 8,
    margin:       '12px 0 0',
    lineHeight:   1.5,
  },
  modalFooter: {
    display:       'flex',
    flexDirection: 'column',
    gap:           10,
    marginTop:     20,
  },
  btnAlternativo: {
    background:   'transparent',
    border:       '1.5px solid rgba(255,255,255,0.2)',
    color:        'rgba(255,255,255,0.7)',
    fontSize:     14,
    fontWeight:   600,
    padding:      '11px',
    borderRadius: 10,
    cursor:       'pointer',
    width:        '100%',
    transition:   'border-color 0.2s, color 0.2s',
  },
  btnManual: {
    background:   'transparent',
    border:       'none',
    color:        'rgba(255,255,255,0.35)',
    fontSize:     13,
    cursor:       'pointer',
    padding:      '8px',
    textAlign:    'center',
    width:        '100%',
  },
}
