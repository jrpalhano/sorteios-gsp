import { useRef } from 'react'
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react'

const SLUG_FILE = (slugPromo, slugLoja) => `qr-${slugPromo}${slugLoja ? `-${slugLoja}` : ''}`

export default function QrCodeModal({ url, nomeLoja, slugPromo, slugLoja, onFechar }) {
  const canvasPreviewRef = useRef()
  const canvasAltaResRef = useRef()
  const svgContainerRef  = useRef()

  function baixarPng() {
    if (!canvasAltaResRef.current) return
    const link = document.createElement('a')
    link.download = `${SLUG_FILE(slugPromo, slugLoja)}.png`
    link.href = canvasAltaResRef.current.toDataURL('image/png')
    link.click()
  }

  function baixarSvg() {
    const svgEl = svgContainerRef.current?.querySelector('svg')
    if (!svgEl) return
    const svgStr = new XMLSerializer().serializeToString(svgEl)
    const blob = new Blob([svgStr], { type: 'image/svg+xml' })
    const href = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = `${SLUG_FILE(slugPromo, slugLoja)}.svg`
    link.href = href
    link.click()
    URL.revokeObjectURL(href)
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

        {/* QR Code — preview */}
        <div style={{ background: '#fff', padding: 16, borderRadius: 12 }}>
          <QRCodeCanvas
            ref={canvasPreviewRef}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={baixarPng}
              style={{
                flex: 1, background: '#003D90', border: 'none',
                color: '#fff', borderRadius: 8, padding: '11px 0',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}
            >
              ⬇ PNG (alta res)
            </button>
            <button
              onClick={baixarSvg}
              style={{
                flex: 1,
                background: 'rgba(0,61,144,0.15)',
                border: '1px solid rgba(0,61,144,0.5)',
                color: '#60a5fa',
                borderRadius: 8, padding: '11px 0',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}
            >
              ⬇ SVG (vetor)
            </button>
          </div>
          <button
            onClick={onFechar}
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.65)',
              borderRadius: 8, padding: '10px 16px',
              fontSize: 13, cursor: 'pointer', width: '100%',
            }}
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Canvas oculto 2000px para PNG de alta resolução */}
      <div style={{ position: 'absolute', left: -9999, top: -9999, pointerEvents: 'none' }}>
        <QRCodeCanvas
          ref={canvasAltaResRef}
          value={url}
          size={2000}
          level="H"
          fgColor="#003D90"
          bgColor="#ffffff"
          imageSettings={{
            src: '/Group 249.png',
            height: 272,
            width: 272,
            excavate: true,
          }}
        />
      </div>

      {/* SVG oculto para download vetorial */}
      <div ref={svgContainerRef} style={{ position: 'absolute', left: -9999, top: -9999, pointerEvents: 'none' }}>
        <QRCodeSVG
          value={url}
          size={1000}
          level="H"
          fgColor="#003D90"
          bgColor="#ffffff"
          imageSettings={{
            src: '/Group 249.png',
            height: 136,
            width: 136,
            excavate: true,
          }}
        />
      </div>
    </div>
  )
}
