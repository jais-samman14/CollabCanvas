// src/components/canvas/ColorPicker.jsx
const PRESET_COLORS = [
  '#000000', // Black
  '#ffffff', // White
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#78716c', // Gray
];

const ColorPicker = ({ color, onChange }) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-6 gap-1.5">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            className={`w-7 h-7 rounded-md border-2 transition ${
              color === c
                ? 'border-white scale-110 shadow-lg'
                : 'border-canvas-border hover:scale-105'
            }`}
            style={{ backgroundColor: c }}
            title={c}
          />
        ))}
      </div>

      {/* Custom color picker */}
      <div className="flex items-center gap-2 mt-1">
        <input
          type="color"
          value={color}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer bg-transparent border border-canvas-border"
        />
        <span className="text-xs text-slate-400 font-mono">{color.toUpperCase()}</span>
      </div>
    </div>
  );
};

export default ColorPicker;