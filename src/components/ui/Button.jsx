export function Button({ children, variant = 'primary', className = '', disabled, ...props }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl font-display font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-navy disabled:opacity-40 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-violet hover:bg-violet-dark text-navy px-6 py-3 text-base',
    secondary: 'bg-slate-card border border-violet/30 hover:border-violet text-offwhite px-6 py-3 text-base',
    danger: 'bg-crimson/20 border border-crimson/40 hover:bg-crimson/30 text-crimson px-6 py-3 text-base',
    ghost: 'text-muted hover:text-offwhite px-4 py-2 text-sm',
    sm: 'bg-violet hover:bg-violet-dark text-navy px-4 py-2 text-sm',
  };

  return (
    <button
      className={`${base} ${variants[variant] ?? variants.primary} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
