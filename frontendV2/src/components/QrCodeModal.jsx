import { useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'

export default function QrCodeModal({ url, nomeLoja, slugPromo, slugLoja, onFechar }) {
  const canvasRef = useRef()

  function baixarPng() {
    if (!canvasRef.current) return
    const link = document.createElement('a')
    link.download = `qr-${slugPromo}${slugLoja ? `-${slugLoja}` : ''}.png`
    link.href = canvasRef.current.toDataURL('image/png')
    link.click()
  }

  return (
    <div
      onClick={onFechar}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0a1628',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 16,
          padding: 32,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
          maxWidth: 340, width: '90%',
        }}
      >
        {/* Cabeçalho */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#FAC21E', letterSpacing: '0.3px' }}>
            {nomeLoja || 'QR Code'}
          </span>
          <button
            onClick={onFechar}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontSize: 22, lineHeight: 1, padding: '0 2px' }}
          >
            ×
          </button>
        </div>

        {/* QR Code */}
        <div style={{ background: '#fff', padding: 16, borderRadius: 12 }}>
          <QRCodeCanvas
            ref={canvasRef}
            value={url}
            size={220}
            level="H"
            fgColor="#003D90"
            bgColor="#ffffff"
            imageSettings={{
              src: '/Group 249.png',
              height: 30,
              width: 30,
              excavate: true,
            }}
          />
        </div>

        {/* URL */}
        <code style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center', wordBreak: 'break-all', lineHeight: 1.5 }}>
          {url}
        </code>

        {/* Ações */}
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <button
            onClick={baixarPng}
            style={{
              flex: 1, background: '#003D90', border: 'none',
              color: '#fff', borderRadius: 8, padding: '11px 0',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            ⬇ Baixar PNG
          </button>
          <button
            onClick={onFechar}
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.65)',
              borderRadius: 8, padding: '11px 16px',
              fontSize: 13, cursor: 'pointer',
            }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
