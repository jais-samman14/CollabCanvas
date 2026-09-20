// src/components/canvas/Toolbar.jsx
import ColorPicker from './ColorPicker';
import { FONT_FAMILIES } from '../../utils/drawHelpers';

const TOOLS = [
  { id: 'select', icon: '◈', label: 'Select (V)' },
  { id: 'pen', icon: '✏️', label: 'Pen' },
  { id: 'line', icon: '📏', label: 'Line' },
  { id: 'arrow', icon: '➡️', label: 'Arrow' },
  { id: 'rectangle', icon: '▭', label: 'Rectangle' },
  { id: 'circle', icon: '○', label: 'Circle' },
  { id: 'triangle', icon: '△', label: 'Triangle' },
  { id: 'diamond', icon: '◇', label: 'Diamond' },
  { id: 'star', icon: '☆', label: 'Star' },
  { id: 'text', icon: 'T', label: 'Text' },
  { id: 'stickyNote', icon: '🗒️', label: 'Sticky Note' },
  { id: 'eraser', icon: '🧽', label: 'Eraser' },
];

const SHAPE_TOOLS = ['rectangle', 'circle', 'triangle', 'diamond', 'star'];
const TEXT_TOOLS = ['text', 'stickyNote'];

const Toolbar = ({
  tool,
  setTool,
  color,
  setColor,
  size,
  setSize,
  fontSize,
  setFontSize,
  fontFamily,
  setFontFamily,
  bgColor,
  setBgColor,
  filled,
  setFilled,
  selectedIndex,
  hasClipboard,
  copySelected,
  paste,
  deleteSelected,
  undo,
  redo,
  clearAll,
  canClear = true,
  canUndo,
  canRedo,
}) => {
  const isShapeTool = SHAPE_TOOLS.includes(tool);
  const isTextTool = TEXT_TOOLS.includes(tool);
  const hasSelection = selectedIndex !== null;

  return (
    <aside className="w-64 bg-canvas-surface border-r border-canvas-border p-4 overflow-y-auto flex-shrink-0">
      {/* Tools */}
      <section className="mb-6">
        <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-3">
          Tools
        </h3>
        <div className="grid grid-cols-4 gap-2">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              className={`aspect-square rounded-lg border transition flex items-center justify-center text-lg font-bold ${
                tool === t.id
                  ? 'bg-primary/20 border-primary text-white'
                  : 'bg-canvas-bg border-canvas-border text-slate-300 hover:border-slate-500'
              }`}
              title={t.label}
            >
              {t.icon}
            </button>
          ))}
        </div>
      </section>

      {/* Selection actions */}
      {tool === 'select' && (
        <section className="mb-6">
          <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-3">
            {hasSelection ? '✓ Selected' : 'Selection'}
          </h3>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={copySelected}
                disabled={!hasSelection}
                className="py-2 px-3 bg-canvas-bg border border-canvas-border rounded-lg text-xs hover:border-slate-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                📋 Copy
              </button>
              <button
                onClick={paste}
                disabled={!hasClipboard}
                className="py-2 px-3 bg-canvas-bg border border-canvas-border rounded-lg text-xs hover:border-slate-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                📥 Paste
              </button>
            </div>
            <button
              onClick={deleteSelected}
              disabled={!hasSelection}
              className="w-full py-2 px-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-xs hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              🗑️ Delete Selected
            </button>
            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
              💡 Double-click any item to select it. Then drag to move, ⌘C/V to copy/paste.
            </p>
          </div>
        </section>
      )}

      {/* Fill toggle */}
      {isShapeTool && (
        <section className="mb-6">
          <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-3">
            Fill
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setFilled(false)}
              className={`flex-1 py-2 text-sm rounded-lg border transition ${
                !filled
                  ? 'bg-primary/20 border-primary text-white'
                  : 'bg-canvas-bg border-canvas-border text-slate-300'
              }`}
            >
              ▢ Outline
            </button>
            <button
              onClick={() => setFilled(true)}
              className={`flex-1 py-2 text-sm rounded-lg border transition ${
                filled
                  ? 'bg-primary/20 border-primary text-white'
                  : 'bg-canvas-bg border-canvas-border text-slate-300'
              }`}
            >
              ■ Filled
            </button>
          </div>
        </section>
      )}

      {/* Color */}
      <section className="mb-6">
        <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-3">
          Stroke Color
        </h3>
        <ColorPicker color={color} onChange={setColor} />
      </section>

      {/* Font controls (for text tools) */}
      {isTextTool && (
        <>
          <section className="mb-6">
            <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-3">
              Font Family
            </h3>
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="w-full bg-canvas-bg border border-canvas-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
            >
              {FONT_FAMILIES.map((f) => (
                <option key={f.id} value={f.id} style={{ fontFamily: f.css }}>
                  {f.label}
                </option>
              ))}
            </select>
          </section>

          <section className="mb-6">
            <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-3">
              Font Size: <span className="text-primary">{fontSize}px</span>
            </h3>
            <input
              type="range"
              min="12"
              max="72"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
          </section>
        </>
      )}

      {/* Brush size (for drawing tools) */}
      {!isTextTool && tool !== 'select' && tool !== 'eraser' && (
        <section className="mb-6">
          <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-3">
            Brush Size: <span className="text-primary">{size}px</span>
          </h3>
          <input
            type="range"
            min="1"
            max="30"
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="w-full accent-primary cursor-pointer"
          />
          <div className="flex items-center justify-center mt-3 h-10">
            <div
              className="rounded-full"
              style={{
                width: `${size}px`,
                height: `${size}px`,
                backgroundColor: color,
              }}
            />
          </div>
        </section>
      )}

      {/* Background */}
      <section className="mb-6">
        <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-3">
          Background
        </h3>
        <div className="flex gap-2 flex-wrap">
          {['#ffffff', '#f8fafc', '#fef3c7', '#dbeafe', '#dcfce7', '#fce7f3', '#0f172a'].map(
            (c) => (
              <button
                key={c}
                onClick={() => setBgColor(c)}
                className={`w-8 h-8 rounded-md border-2 transition ${
                  bgColor === c ? 'border-primary scale-110' : 'border-canvas-border'
                }`}
                style={{ backgroundColor: c }}
              />
            )
          )}
        </div>
      </section>

      {/* Actions */}
      <section>
        <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-3">
          Actions
        </h3>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="py-2 px-3 bg-canvas-bg border border-canvas-border rounded-lg text-sm hover:border-slate-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              ↶ Undo
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="py-2 px-3 bg-canvas-bg border border-canvas-border rounded-lg text-sm hover:border-slate-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              ↷ Redo
            </button>
          </div>
          <button
            onClick={clearAll}
            disabled={!canClear}
            title={canClear ? 'Clear the whole canvas' : 'Only the board owner can clear the board'}
            className="w-full py-2 px-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-500/10 transition"
          >
            🗑️ Clear Canvas
          </button>
        </div>
      </section>
    </aside>
  );
};

export default Toolbar;