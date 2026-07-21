import { useRef, useState, useEffect, useCallback } from 'react';
import {
  drawStroke,
  redrawCanvas,
  getCanvasPoint,
  findStrokeIndexAtPoint,
  computeRequiredDimensions,
  INITIAL_CANVAS_WIDTH,
  INITIAL_CANVAS_HEIGHT,
} from '../utils/drawHelpers';

const DOUBLE_CLICK_MS = 350;
const DOUBLE_CLICK_TOLERANCE = 20;

const cloneStroke = (stroke) => {
  const clone = JSON.parse(JSON.stringify(stroke));
  delete clone._id;
  return clone;
};

const shiftStroke = (stroke, dx, dy) => ({
  ...stroke,
  points: stroke.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
});

export const useCanvas = (
  initialStrokes = [],
  initialBgColor = '#ffffff',
  initialWidth = INITIAL_CANVAS_WIDTH,
  initialHeight = INITIAL_CANVAS_HEIGHT,
  collab = null
) => {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const lastClickRef = useRef({ time: 0, x: 0, y: 0 });

 
  // State initialized DIRECTLY from props
  // Parent guarantees stable data at mount time
  const [strokes, setStrokes] = useState(initialStrokes);
  const [currentStroke, setCurrentStroke] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#6366f1');
  const [size, setSize] = useState(3);
  const [fontSize, setFontSize] = useState(24);
  const [fontFamily, setFontFamily] = useState('Inter');
  const [bgColor, setBgColor] = useState(initialBgColor);
  const [filled, setFilled] = useState(false);

  const [dimensions, setDimensions] = useState({
    width: initialWidth,
    height: initialHeight,
  });

  const [textInput, setTextInput] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [clipboard, setClipboard] = useState(null);

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef(null);

  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // Auto-extend canvas
  useEffect(() => {
    const all = currentStroke ? [...strokes, currentStroke] : strokes;
    const req = computeRequiredDimensions(all, dimensions.width, dimensions.height);
    if (req.changed) {
      setDimensions({ width: req.width, height: req.height });
    }
  }, [strokes, currentStroke, dimensions.width, dimensions.height]);

  useEffect(() => {
    if (tool !== 'select') {
      setSelectedIndex(null);
      setIsDragging(false);
    }
  }, [tool]);

  // Redraw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    ctxRef.current = canvas.getContext('2d');
    const ctx = ctxRef.current;
    redrawCanvas(ctx, canvas, strokes, bgColor, selectedIndex);
    if (currentStroke) drawStroke(ctx, currentStroke);
  }, [strokes, currentStroke, bgColor, selectedIndex, dimensions.width, dimensions.height]);


  // MOUSE HANDLERS
  const handleMouseDown = useCallback(
    (e) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const point = getCanvasPoint(canvas, e);
      const ctx = ctxRef.current;

      const now = Date.now();
      const isDouble =
        now - lastClickRef.current.time < DOUBLE_CLICK_MS &&
        Math.abs(point.x - lastClickRef.current.x) < DOUBLE_CLICK_TOLERANCE &&
        Math.abs(point.y - lastClickRef.current.y) < DOUBLE_CLICK_TOLERANCE;
      lastClickRef.current = { time: now, x: point.x, y: point.y };

      const hitIdx = findStrokeIndexAtPoint(strokes, point, ctx);

      if (isDouble && hitIdx !== -1) {
        setCurrentStroke(null);
        setIsDrawing(false);
        setTextInput(null);
        setTool('select');
        setSelectedIndex(hitIdx);
        setIsDragging(true);
        dragStartRef.current = {
          point,
          strokesSnapshot: strokes,
          originalStroke: strokes[hitIdx],
        };
        return;
      }

      if (tool === 'select') {
        if (hitIdx === -1) {
          setSelectedIndex(null);
          return;
        }
        setSelectedIndex(hitIdx);
        setIsDragging(true);
        dragStartRef.current = {
          point,
          strokesSnapshot: strokes,
          originalStroke: strokes[hitIdx],
        };
        return;
      }

      if (tool === 'text' || tool === 'stickyNote') {
        if (hitIdx !== -1) return;
        setTextInput({
          canvasX: point.x,
          canvasY: point.y,
          isStickyNote: tool === 'stickyNote',
        });
        return;
      }

      if (tool === 'eraser') {
        if (hitIdx !== -1) {
          setHistory((prev) => [...prev, strokes]);
          setRedoStack([]);
          const deletedStroke = strokes[hitIdx];
          setStrokes((prev) => prev.filter((_, i) => i !== hitIdx));
          if (selectedIndex === hitIdx) setSelectedIndex(null);
          collab?.emitStrokeDelete?.(deletedStroke._id || hitIdx);
        }
        return;
      }

      setIsDrawing(true);
      setCurrentStroke({
        type: tool,
        color,
        size,
        filled: ['rectangle', 'circle', 'triangle', 'diamond', 'star'].includes(tool)
          ? filled
          : false,
        points: [point],
      });
    },
    [tool, color, size, strokes, filled, selectedIndex, collab]
  );

  const handleMouseMove = useCallback(
    (e) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const point = getCanvasPoint(canvas, e);

      collab?.emitCursorMove?.(point.x, point.y);

      if (isDragging && dragStartRef.current && selectedIndex !== null) {
        const { point: startPoint, originalStroke } = dragStartRef.current;
        const dx = point.x - startPoint.x;
        const dy = point.y - startPoint.y;
        setStrokes((prev) => {
          const next = [...prev];
          next[selectedIndex] = shiftStroke(originalStroke, dx, dy);
          return next;
        });
        return;
      }

      if (!isDrawing || !currentStroke) return;
      if (tool === 'pen') {
        setCurrentStroke((prev) => ({
          ...prev,
          points: [...prev.points, point],
        }));
      } else {
        setCurrentStroke((prev) => ({
          ...prev,
          points: [prev.points[0], point],
        }));
      }
    },
    [isDrawing, currentStroke, tool, isDragging, selectedIndex, collab]
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging && dragStartRef.current) {
      const { strokesSnapshot, originalStroke } = dragStartRef.current;
      const currentAtIdx = strokes[selectedIndex];
      if (
        currentAtIdx &&
        JSON.stringify(currentAtIdx.points) !==
          JSON.stringify(originalStroke.points)
      ) {
        setHistory((prev) => [...prev, strokesSnapshot]);
        setRedoStack([]);
        collab?.emitStrokeUpdate?.(
          currentAtIdx._id || selectedIndex,
          currentAtIdx
        );
      }
      setIsDragging(false);
      dragStartRef.current = null;
      return;
    }

    if (!isDrawing || !currentStroke) return;
    setHistory((prev) => [...prev, strokes]);
    setRedoStack([]);
    const finalStroke = currentStroke;
    setStrokes((prev) => [...prev, finalStroke]);
    setCurrentStroke(null);
    setIsDrawing(false);
    collab?.emitStrokeAdd?.(finalStroke);
  }, [isDrawing, currentStroke, strokes, isDragging, selectedIndex, collab]);

  const submitText = useCallback(
    (text) => {
      if (!text || !text.trim() || !textInput) {
        setTextInput(null);
        return;
      }
      const newStroke = {
        type: textInput.isStickyNote ? 'stickyNote' : 'text',
        color: textInput.isStickyNote ? '#fef08a' : color,
        size,
        fontSize,
        fontFamily,
        points: [{ x: textInput.canvasX, y: textInput.canvasY }],
        text: text.trim(),
      };
      setHistory((prev) => [...prev, strokes]);
      setRedoStack([]);
      setStrokes((prev) => [...prev, newStroke]);
      setTextInput(null);
      collab?.emitStrokeAdd?.(newStroke);
    },
    [textInput, color, size, fontSize, fontFamily, strokes, collab]
  );

  const cancelText = useCallback(() => setTextInput(null), []);

  const copySelected = useCallback(() => {
    if (selectedIndex === null || !strokes[selectedIndex]) return;
    setClipboard(cloneStroke(strokes[selectedIndex]));
  }, [selectedIndex, strokes]);

  const paste = useCallback(() => {
    if (!clipboard) return;
    const OFFSET = 30;
    const cloned = cloneStroke(clipboard);
    cloned.points = cloned.points.map((p) => ({
      x: p.x + OFFSET,
      y: p.y + OFFSET,
    }));
    setHistory((prev) => [...prev, strokes]);
    setRedoStack([]);
    setStrokes((prev) => {
      const next = [...prev, cloned];
      setSelectedIndex(next.length - 1);
      return next;
    });
    setClipboard(cloned);
    collab?.emitStrokeAdd?.(cloned);
  }, [clipboard, strokes, collab]);

  const deleteSelected = useCallback(() => {
    if (selectedIndex === null) return;
    setHistory((prev) => [...prev, strokes]);
    setRedoStack([]);
    const deleted = strokes[selectedIndex];
    setStrokes((prev) => prev.filter((_, i) => i !== selectedIndex));
    setSelectedIndex(null);
    collab?.emitStrokeDelete?.(deleted._id || selectedIndex);
  }, [selectedIndex, strokes, collab]);

  const deselect = useCallback(() => setSelectedIndex(null), []);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setRedoStack((r) => [...r, strokes]);
    setStrokes(prev);
    setHistory((h) => h.slice(0, -1));
    setSelectedIndex(null);
  }, [history, strokes]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setHistory((h) => [...h, strokes]);
    setStrokes(next);
    setRedoStack((r) => r.slice(0, -1));
    setSelectedIndex(null);
  }, [redoStack, strokes]);

  const clearAll = useCallback(() => {
    if (strokes.length === 0) return;
    if (!window.confirm('Clear entire canvas?')) return;
    setHistory((prev) => [...prev, strokes]);
    setRedoStack([]);
    setStrokes([]);
    setSelectedIndex(null);
    collab?.emitBoardClear?.();
  }, [strokes, collab]);

  // Remote appliers
  const applyRemoteStrokeAdd = useCallback((stroke) => {
    setStrokes((prev) => [...prev, stroke]);
  }, []);

  const applyRemoteStrokeUpdate = useCallback((strokeIdOrIndex, updatedStroke) => {
    setStrokes((prev) => {
      let idx = prev.findIndex((s) => s._id && s._id === strokeIdOrIndex);
      if (idx === -1 && typeof strokeIdOrIndex === 'number') {
        idx = strokeIdOrIndex;
      }
      if (idx === -1 || idx >= prev.length) return prev;
      const next = [...prev];
      next[idx] = updatedStroke;
      return next;
    });
  }, []);

  const applyRemoteStrokeDelete = useCallback((strokeIdOrIndex) => {
    setStrokes((prev) => {
      let idx = prev.findIndex((s) => s._id && s._id === strokeIdOrIndex);
      if (idx === -1 && typeof strokeIdOrIndex === 'number') {
        idx = strokeIdOrIndex;
      }
      if (idx === -1) return prev;
      return prev.filter((_, i) => i !== idx);
    });
  }, []);

  const applyRemoteClear = useCallback(() => {
    setStrokes([]);
    setSelectedIndex(null);
  }, []);

  return {
    canvasRef,
    strokes,
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
    dimensions,
    textInput,
    submitText,
    cancelText,
    selectedIndex,
    isDragging,
    hasClipboard: !!clipboard,
    copySelected,
    paste,
    deleteSelected,
    deselect,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    undo,
    redo,
    clearAll,
    canUndo: history.length > 0,
    canRedo: redoStack.length > 0,
    applyRemoteStrokeAdd,
    applyRemoteStrokeUpdate,
    applyRemoteStrokeDelete,
    applyRemoteClear,
  };
};