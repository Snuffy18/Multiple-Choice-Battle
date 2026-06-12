export function Card({ children, className = '', ...props }) {
  return (
    <div
      className={`bg-slate-card border border-violet/10 rounded-2xl p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
