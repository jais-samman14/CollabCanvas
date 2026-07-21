import { useState, useEffect, useRef } from 'react';
import { getFontCss } from '../../utils/drawHelpers';

const TextInput = ({
  textInput,
  onSubmit,
  onCancel,
  color,
  fontSize,
  fontFamily,
  bgColor,
}) => {
  const [value, setValue] = useState('');
  const [inputWidth, setInputWidth] = useState(20);
  const inputRef = useRef(null);
  const measureRef = useRef(null);

  // Focus on mount
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, []);

  // Auto-grow width based on measured text
  useEffect(() => {
    if (measureRef.current) {
      const w = measureRef.current.offsetWidth;
      setInputWidth(Math.max(20, w + 4)); // small buffer for cursor
    }
  }, [value, fontSize, fontFamily]);

  const handleSubmit = () => {
    if (value.trim()) onSubmit(value);
    else onCancel();
  };

  // STICKY NOTE — textarea inside yellow box
 
  if (textInput.isStickyNote) {
    return (
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          left: `${textInput.canvasX}px`,
          top: `${textInput.canvasY}px`,
          width: '300px',
          height: '225px',
          background: '#fef08a',
          padding: '16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          zIndex: 100,
          boxSizing: 'border-box',
        }}
      >
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onCancel();
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          onBlur={handleSubmit}
          placeholder="Type note...&#10;⌘+Enter to save"
          style={{
            width: '100%',
            height: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            color: '#111827',
            fontSize: `${fontSize || 24}px`,
            fontFamily: getFontCss(fontFamily),
            lineHeight: '1.25',
            padding: 0,
            margin: 0,
          }}
        />
      </div>
    );
  }

  // REGULAR TEXT — auto-grow width, WYSIWYG bg
 
  const fs = fontSize || 24;
  const font = getFontCss(fontFamily);

  return (
    <>
      {/* Hidden measurement span — measures actual text width */}
      <span
        ref={measureRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          visibility: 'hidden',
          whiteSpace: 'pre',
          fontSize: `${fs}px`,
          fontFamily: font,
          lineHeight: 1,
          padding: 0,
          margin: 0,
          top: 0,
          left: 0,
          pointerEvents: 'none',
        }}
      >
        {value || ' '}
      </span>

      {/* The actual input — grows with content, matches canvas bg (WYSIWYG) */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onMouseDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
          }
          if (e.key === 'Escape') onCancel();
        }}
        onBlur={handleSubmit}
        style={{
          position: 'absolute',
          left: `${textInput.canvasX}px`,
          top: `${textInput.canvasY}px`,
          width: `${inputWidth}px`,
          fontSize: `${fs}px`,
          fontFamily: font,
          color: color || '#000000',
          background: bgColor || '#ffffff', // WYSIWYG — matches canvas bg
          border: 'none',
          outline: 'none',
          padding: 0,
          margin: 0,
          lineHeight: 1,
          caretColor: color || '#000000',
          zIndex: 100,
          boxSizing: 'content-box',
        }}
      />
    </>
  );
};

export default TextInput;