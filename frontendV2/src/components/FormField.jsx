export default function FormField({ label, required, error, hint, children }) {
  return (
    <div className="field">
      {label && (
        <label>
          {label}
          {required && <span className="obrigatorio"> *</span>}
        </label>
      )}
      {children}
      {hint && <p className="hint">{hint}</p>}
      {error && (
        <span className="erro-campo" style={{ display: 'block' }}>
          {error}
        </span>
      )}
    </div>
  )
}
