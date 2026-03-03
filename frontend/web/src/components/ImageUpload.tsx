/**
 * Reusable image upload component — drag & drop + click to upload
 */
import { useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface Props {
  value?:    string;       // current image URL
  onChange:  (file: File, dataUrl: string) => void;
  onRemove?: () => void;
  label?:    string;
  height?:   number;
  accept?:   string;
}

export default function ImageUpload({
  value,
  onChange,
  onRemove,
  label   = 'Upload Photo',
  height  = 160,
  accept  = 'image/*',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => onChange(file, e.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) handleFile(file);
  }

  if (value) {
    return (
      <div
        style={{
          position: 'relative',
          borderRadius: 'var(--r-lg)',
          overflow: 'hidden',
          height,
          border: '1px solid var(--border)',
        }}
      >
        <img
          src={value}
          alt="Upload"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        {onRemove && (
          <button
            onClick={onRemove}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.7)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
            }}
          >
            ✕
          </button>
        )}
        <button
          onClick={() => inputRef.current?.click()}
          style={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            padding: '6px 12px',
            borderRadius: 20,
            background: 'rgba(0,0,0,0.7)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Change
        </button>
        <input ref={inputRef} type="file" accept={accept} onChange={handleInputChange} style={{ display: 'none' }} />
      </div>
    );
  }

  return (
    <motion.div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      whileTap={{ scale: 0.98 }}
      style={{
        height,
        borderRadius: 'var(--r-lg)',
        border: `2px dashed ${dragging ? 'var(--mind)' : 'var(--border2)'}`,
        background: dragging ? 'rgba(123,111,218,0.08)' : 'var(--surface2)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        cursor: 'pointer',
        transition: 'border-color 0.2s, background 0.2s',
      }}
    >
      <span style={{ fontSize: 32 }}>📷</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)' }}>{label}</span>
      <span style={{ fontSize: 12, color: 'var(--muted)' }}>Tap or drag & drop</span>
      <input ref={inputRef} type="file" accept={accept} onChange={handleInputChange} style={{ display: 'none' }} />
    </motion.div>
  );
}
