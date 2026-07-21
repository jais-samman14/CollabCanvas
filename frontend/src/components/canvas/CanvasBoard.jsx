// src/components/canvas/CanvasBoard.jsx
import { useEffect } from 'react';
import TextInput from './TextInput';

const CanvasBoard = ({
  canvasRef,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  tool,
  isDragging,
  textInput,
  submitText,
  cancelText,
  color,
  fontSize,
  fontFamily,
  bgColor,
  dimensions,
}) => {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const preventCtx = (e) => e.preventDefault();
    canvas.addEventListener('contextmenu', preventCtx);
    return () => canvas.removeEventListener('contextmenu', preventCtx);
  }, [canvasRef]);

  const getCursor = () => {
    if (tool === 'select') return isDragging ? 'grabbing' : 'grab';
    if (tool === 'text' || tool === 'stickyNote') return 'text';
    if (tool === 'eraser') return 'cell';
    return 'crosshair';
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          cursor: getCursor(),
          display: 'block',
          touchAction: 'none',
        }}
      />
      {textInput && (
        <TextInput
          textInput={textInput}
          onSubmit={submitText}
          onCancel={cancelText}
          color={color}
          fontSize={fontSize}
          fontFamily={fontFamily}
          bgColor={bgColor}
        />
      )}
    </>
  );
};

export default CanvasBoard;