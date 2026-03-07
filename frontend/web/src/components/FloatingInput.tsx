/**
 * FloatingInput — Floating label input with smooth animation.
 * Drop-in replacement for <input className="field" />.
 */
import { useState } from 'react';

interface Props {
  type?: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
  className?: string;
}

export default function FloatingInput({
  type = 'text',
  label,
  value,
  onChange,
  autoComplete,
  required,
  className = '',
}: Props) {
  const [focused, setFocused] = useState(false);
  const id = label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="field-wrap">
      <input
        id={id}
        type={type}
        className={`field-float ${className}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder=" "
        autoComplete={autoComplete}
        required={required}
      />
      <label
        htmlFor={id}
        className="field-label"
        style={{
          top:           (focused || value.length > 0) ? 7    : 14,
          fontSize:      (focused || value.length > 0) ? 11   : 15,
          color:         focused ? 'var(--mind)' : 'var(--muted)',
          fontWeight:    (focused || value.length > 0) ? 700  : 400,
          letterSpacing: (focused || value.length > 0) ? '0.06em' : '0',
          textTransform: (focused || value.length > 0) ? 'uppercase' : 'none',
        }}
      >
        {label}
      </label>
    </div>
  );
}
