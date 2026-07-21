// src/utils/drawHelpers.js

export const STICKY_WIDTH = 300;
export const STICKY_HEIGHT = 225;
export const INITIAL_CANVAS_WIDTH = 4000;
export const INITIAL_CANVAS_HEIGHT = 2500;
export const CANVAS_GROW_AMOUNT = 2000;      // More aggressive
export const CANVAS_EDGE_BUFFER = 500;       // Larger buffer

export const FONT_FAMILIES = [
  { id: 'Inter', label: 'Inter (Sans)', css: "'Inter', system-ui, sans-serif" },
  { id: 'Georgia', label: 'Georgia (Serif)', css: "Georgia, 'Times New Roman', serif" },
  { id: 'Courier New', label: 'Courier (Mono)', css: "'Courier New', monospace" },
  { id: 'Comic Sans MS', label: 'Comic (Casual)', css: "'Comic Sans MS', cursive" },
  { id: 'Impact', label: 'Impact (Bold)', css: "Impact, 'Arial Black', sans-serif" },
  { id: 'Brush Script MT', label: 'Brush (Script)', css: "'Brush Script MT', cursive" },
];

export const getFontCss = (fontFamilyId) => {
  const f = FONT_FAMILIES.find((x) => x.id === fontFamilyId);
  return f ? f.css : FONT_FAMILIES[0].css;
};

// ═══════════════════════════════════════════════
// DRAWING
// ═══════════════════════════════════════════════
export const drawStroke = (ctx, stroke) => {
  if (!stroke || !stroke.points || stroke.points.length === 0) return;

  ctx.strokeStyle = stroke.color || '#000000';
  ctx.fillStyle = stroke.color || '#000000';
  ctx.lineWidth = stroke.size || 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = 1;

  const points = stroke.points;

  switch (stroke.type) {
    case 'pen': drawPen(ctx, points); break;
    case 'line': drawLine(ctx, points); break;
    case 'rectangle': drawRectangle(ctx, points, stroke.filled); break;
    case 'circle': drawCircle(ctx, points, stroke.filled); break;
    case 'triangle': drawTriangle(ctx, points, stroke.filled); break;
    case 'diamond': drawDiamond(ctx, points, stroke.filled); break;
    case 'star': drawStar(ctx, points, stroke.filled); break;
    case 'arrow': drawArrow(ctx, points); break;
    case 'text':
      drawText(ctx, points, stroke.text, stroke.fontSize, stroke.color, stroke.fontFamily);
      break;
    case 'stickyNote':
      drawStickyNote(ctx, points, stroke.text, stroke.fontSize, stroke.fontFamily);
      break;
    default: break;
  }
};

const drawPen = (ctx, points) => {
  if (points.length < 2) {
    ctx.beginPath();
    ctx.arc(points[0].x, points[0].y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
};

const drawLine = (ctx, points) => {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  ctx.lineTo(points[1].x, points[1].y);
  ctx.stroke();
};

const drawRectangle = (ctx, points, filled) => {
  if (points.length < 2) return;
  const [s, e] = points;
  ctx.beginPath();
  ctx.rect(s.x, s.y, e.x - s.x, e.y - s.y);
  if (filled) ctx.fill();
  else ctx.stroke();
};

const drawCircle = (ctx, points, filled) => {
  if (points.length < 2) return;
  const [c, e] = points;
  const r = Math.sqrt(Math.pow(e.x - c.x, 2) + Math.pow(e.y - c.y, 2));
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  if (filled) ctx.fill();
  else ctx.stroke();
};

const drawTriangle = (ctx, points, filled) => {
  if (points.length < 2) return;
  const [s, e] = points;
  ctx.beginPath();
  ctx.moveTo((s.x + e.x) / 2, s.y);
  ctx.lineTo(e.x, e.y);
  ctx.lineTo(s.x, e.y);
  ctx.closePath();
  if (filled) ctx.fill();
  else ctx.stroke();
};

const drawDiamond = (ctx, points, filled) => {
  if (points.length < 2) return;
  const [s, e] = points;
  const cx = (s.x + e.x) / 2;
  const cy = (s.y + e.y) / 2;
  const hw = Math.abs(e.x - s.x) / 2;
  const hh = Math.abs(e.y - s.y) / 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - hh);
  ctx.lineTo(cx + hw, cy);
  ctx.lineTo(cx, cy + hh);
  ctx.lineTo(cx - hw, cy);
  ctx.closePath();
  if (filled) ctx.fill();
  else ctx.stroke();
};

const drawStar = (ctx, points, filled) => {
  if (points.length < 2) return;
  const [s, e] = points;
  const cx = (s.x + e.x) / 2;
  const cy = (s.y + e.y) / 2;
  const outer = Math.min(Math.abs(e.x - s.x), Math.abs(e.y - s.y)) / 2;
  const inner = outer / 2.5;
  const spikes = 5;
  const step = Math.PI / spikes;
  ctx.beginPath();
  let rot = (Math.PI / 2) * 3;
  ctx.moveTo(cx, cy - outer);
  for (let i = 0; i < spikes; i++) {
    let x = cx + Math.cos(rot) * outer;
    let y = cy + Math.sin(rot) * outer;
    ctx.lineTo(x, y);
    rot += step;
    x = cx + Math.cos(rot) * inner;
    y = cy + Math.sin(rot) * inner;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.closePath();
  if (filled) ctx.fill();
  else ctx.stroke();
};

const drawArrow = (ctx, points) => {
  if (points.length < 2) return;
  const [s, e] = points;
  const head = 20;
  const ang = Math.atan2(e.y - s.y, e.x - s.x);
  ctx.beginPath();
  ctx.moveTo(s.x, s.y);
  ctx.lineTo(e.x, e.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(e.x, e.y);
  ctx.lineTo(
    e.x - head * Math.cos(ang - Math.PI / 6),
    e.y - head * Math.sin(ang - Math.PI / 6)
  );
  ctx.lineTo(
    e.x - head * Math.cos(ang + Math.PI / 6),
    e.y - head * Math.sin(ang + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
};

const drawText = (ctx, points, text, fontSize, color, fontFamily) => {
  if (!text || points.length === 0) return;
  const fs = fontSize || 24;
  ctx.fillStyle = color || '#000000';
  ctx.font = `${fs}px ${getFontCss(fontFamily)}`;
  ctx.textBaseline = 'top';
  ctx.fillText(text, points[0].x, points[0].y);
};

const drawStickyNote = (ctx, points, text, fontSize, fontFamily) => {
  if (points.length === 0) return;
  const [pos] = points;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.15)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(pos.x, pos.y, STICKY_WIDTH, STICKY_HEIGHT);
  ctx.restore();
  if (text) {
    ctx.fillStyle = '#111827';
    const fs = fontSize || 24;
    ctx.font = `${fs}px ${getFontCss(fontFamily)}`;
    ctx.textBaseline = 'top';
    const words = text.split(/\s+/);
    let line = '';
    let y = pos.y + 16;
    const maxW = STICKY_WIDTH - 32;
    const lh = fs + 6;
    for (const w of words) {
      const test = line + w + ' ';
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line.trim(), pos.x + 16, y);
        line = w + ' ';
        y += lh;
        if (y > pos.y + STICKY_HEIGHT - fs) break;
      } else {
        line = test;
      }
    }
    if (line && y <= pos.y + STICKY_HEIGHT - fs) {
      ctx.fillText(line.trim(), pos.x + 16, y);
    }
  }
};

// ═══════════════════════════════════════════════
// BOUNDS
// ═══════════════════════════════════════════════
export const getStrokeBounds = (stroke, ctx = null) => {
  const points = stroke.points;
  if (!points || points.length === 0) return null;

  if (stroke.type === 'stickyNote') {
    return { x: points[0].x, y: points[0].y, width: STICKY_WIDTH, height: STICKY_HEIGHT };
  }

  if (stroke.type === 'text') {
    const fs = stroke.fontSize || 24;
    let width = 100;
    if (ctx) {
      ctx.font = `${fs}px ${getFontCss(stroke.fontFamily)}`;
      width = Math.max(ctx.measureText(stroke.text || '').width, 20);
    } else {
      width = (stroke.text || '').length * fs * 0.55;
    }
    return { x: points[0].x, y: points[0].y, width, height: fs };
  }

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  if (stroke.type === 'circle' && points.length >= 2) {
    const [c, e] = points;
    const r = Math.sqrt(Math.pow(e.x - c.x, 2) + Math.pow(e.y - c.y, 2));
    return { x: c.x - r, y: c.y - r, width: r * 2, height: r * 2 };
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

export const drawSelectionHighlight = (ctx, stroke) => {
  const b = getStrokeBounds(stroke, ctx);
  if (!b) return;
  const pad = 8;
  ctx.save();
  ctx.strokeStyle = '#6366f1';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 5]);
  ctx.strokeRect(b.x - pad, b.y - pad, b.width + pad * 2, b.height + pad * 2);
  ctx.restore();
};

// ═══════════════════════════════════════════════
// HIT DETECTION
// ═══════════════════════════════════════════════
const distToSegment = (p, a, b) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) {
    return Math.sqrt(Math.pow(p.x - a.x, 2) + Math.pow(p.y - a.y, 2));
  }
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.sqrt(
    Math.pow(p.x - (a.x + t * dx), 2) + Math.pow(p.y - (a.y + t * dy), 2)
  );
};

export const isPointInStroke = (stroke, point, ctx = null) => {
  const t = 15;

  switch (stroke.type) {
    case 'pen': {
      for (const p of stroke.points) {
        const d = Math.sqrt(
          Math.pow(p.x - point.x, 2) + Math.pow(p.y - point.y, 2)
        );
        if (d <= t + (stroke.size || 3)) return true;
      }
      return false;
    }
    case 'line':
    case 'arrow': {
      if (stroke.points.length < 2) return false;
      return distToSegment(point, stroke.points[0], stroke.points[1]) <= t;
    }
    case 'rectangle': {
      if (stroke.points.length < 2) return false;
      const [s, e] = stroke.points;
      const minX = Math.min(s.x, e.x);
      const maxX = Math.max(s.x, e.x);
      const minY = Math.min(s.y, e.y);
      const maxY = Math.max(s.y, e.y);
      if (stroke.filled) {
        return (
          point.x >= minX - t && point.x <= maxX + t &&
          point.y >= minY - t && point.y <= maxY + t
        );
      }
      const inOuter =
        point.x >= minX - t && point.x <= maxX + t &&
        point.y >= minY - t && point.y <= maxY + t;
      const inInner =
        point.x >= minX + t && point.x <= maxX - t &&
        point.y >= minY + t && point.y <= maxY - t;
      return inOuter && !inInner;
    }
    case 'circle': {
      if (stroke.points.length < 2) return false;
      const [c, e] = stroke.points;
      const r = Math.sqrt(Math.pow(e.x - c.x, 2) + Math.pow(e.y - c.y, 2));
      const d = Math.sqrt(
        Math.pow(point.x - c.x, 2) + Math.pow(point.y - c.y, 2)
      );
      if (stroke.filled) return d <= r + t;
      return Math.abs(d - r) <= t;
    }
    case 'triangle':
    case 'diamond':
    case 'star': {
      const b = getStrokeBounds(stroke);
      if (!b) return false;
      return (
        point.x >= b.x - t && point.x <= b.x + b.width + t &&
        point.y >= b.y - t && point.y <= b.y + b.height + t
      );
    }
    case 'text': {
      const b = getStrokeBounds(stroke, ctx);
      if (!b) return false;
      return (
        point.x >= b.x - t && point.x <= b.x + b.width + t &&
        point.y >= b.y - t && point.y <= b.y + b.height + t
      );
    }
    case 'stickyNote': {
      const p = stroke.points[0];
      return (
        point.x >= p.x && point.x <= p.x + STICKY_WIDTH &&
        point.y >= p.y && point.y <= p.y + STICKY_HEIGHT
      );
    }
    default: return false;
  }
};

export const findStrokeIndexAtPoint = (strokes, point, ctx = null) => {
  for (let i = strokes.length - 1; i >= 0; i--) {
    if (isPointInStroke(strokes[i], point, ctx)) return i;
  }
  return -1;
};

// ═══════════════════════════════════════════════
// CANVAS UTILS
// ═══════════════════════════════════════════════
export const clearCanvas = (ctx, width, height, bgColor = '#ffffff') => {
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);
};

export const redrawCanvas = (ctx, canvas, strokes, bgColor, selectedIndex = null) => {
  clearCanvas(ctx, canvas.width, canvas.height, bgColor);
  strokes.forEach((stroke, i) => {
    drawStroke(ctx, stroke);
    if (i === selectedIndex) {
      drawSelectionHighlight(ctx, stroke);
    }
  });
};

export const getCanvasPoint = (canvas, e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
};

// Compute required dimensions — INCLUDES CURRENT STROKE for live extension
export const computeRequiredDimensions = (strokes, currentW, currentH) => {
  let maxX = 0;
  let maxY = 0;

  strokes.forEach((s) => {
    if (!s || !s.points) return;
    if (s.type === 'stickyNote' && s.points[0]) {
      maxX = Math.max(maxX, s.points[0].x + STICKY_WIDTH);
      maxY = Math.max(maxY, s.points[0].y + STICKY_HEIGHT);
    } else if (s.type === 'circle' && s.points.length >= 2) {
      const [c, e] = s.points;
      const r = Math.sqrt(Math.pow(e.x - c.x, 2) + Math.pow(e.y - c.y, 2));
      maxX = Math.max(maxX, c.x + r);
      maxY = Math.max(maxY, c.y + r);
    } else if (s.type === 'text' && s.points[0]) {
      const fs = s.fontSize || 24;
      maxX = Math.max(maxX, s.points[0].x + (s.text || '').length * fs * 0.55 + 100);
      maxY = Math.max(maxY, s.points[0].y + fs);
    } else {
      s.points.forEach((p) => {
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      });
    }
  });

  let newW = currentW;
  let newH = currentH;

  if (maxX + CANVAS_EDGE_BUFFER > currentW) {
    newW = Math.max(currentW, maxX + CANVAS_EDGE_BUFFER + CANVAS_GROW_AMOUNT);
  }
  if (maxY + CANVAS_EDGE_BUFFER > currentH) {
    newH = Math.max(currentH, maxY + CANVAS_EDGE_BUFFER + CANVAS_GROW_AMOUNT);
  }

  return { width: newW, height: newH, changed: newW !== currentW || newH !== currentH };
};