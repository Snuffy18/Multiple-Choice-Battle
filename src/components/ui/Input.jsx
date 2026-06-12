export function Input({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label className="text-sm font-body text-muted">{label}</label>
      )}
      <input
        className={`w-full bg-slate-card border ${
          error ? 'border-crimson/60' : 'border-violet/20'
        } rounded-xl px-4 py-3 text-offwhite placeholder-muted font-body text-base
        focus:outline-none focus:border-violet transition-colors ${className}`}
        {...props}
      />
      {error && <p className="text-crimson text-xs mt-0.5">{error}</p>}
    </div>
  );
}
