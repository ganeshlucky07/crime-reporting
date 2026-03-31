export default function FormField({
  label,
  error,
  as = "input",
  className = "",
  ...props
}) {
  const Component = as;

  return (
    <label className="block">
      <span className="label-text">{label}</span>
      <Component
        className={`input-field ${className}`}
        {...props}
      />
      {error ? <span className="mt-1 block text-xs text-rose-600">{error}</span> : null}
    </label>
  );
}
