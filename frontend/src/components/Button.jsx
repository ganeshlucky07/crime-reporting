export default function Button({
  children,
  className = "",
  variant = "primary",
  ...props
}) {
  const variants = {
    primary:
      "bg-ember text-white shadow-lg shadow-orange-500/20 hover:bg-orange-500",
    secondary:
      "bg-white/10 text-slate-100 ring-1 ring-white/15 hover:bg-white/15",
    ghost:
      "bg-transparent text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
  };

  return (
    <button
      className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
