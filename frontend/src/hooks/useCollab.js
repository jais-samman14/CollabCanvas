// src/hooks/useCollab.js
import { useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';

/**
 * Collab hook — subscribes to real-time board events and provides emit helpers.
 * @param {string} boardId - The board ID
 * @param {Object} handlers - Callback handlers for received events
 *   - onStrokeAdded({ stroke, by })
 *   - onStrokeUpdated({ strokeIndex, stroke, by })
 *   - onStrokeDeleted({ strokeIndex, by })
 *   - onBoardCleared({ by })
 *   - onCursorMoved({ userId, name, color, x, y })
 * @returns {Object} emit helpers
 */
export const useCollab = (boardId, handlers = {}) => {
  const { socket, isConnected } = useSocket();
  const handlersRef = useRef(handlers);

  // Keep handlers ref updated (avoid re-subscribing on every render)
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  // JOIN / LEAVE BOARD ROOM
  useEffect(() => {
    if (!socket || !isConnected || !boardId) return;

    console.log(`📡 Joining board room: ${boardId}`);
    socket.emit('board:join', { boardId });

    return () => {
      console.log(`👋 Leaving board room: ${boardId}`);
      socket.emit('board:leave', { boardId });
    };
  }, [socket, isConnected, boardId]);


  // SUBSCRIBE TO INCOMING EVENTS
  useEffect(() => {
    if (!socket || !isConnected) return;

    const onStrokeAdded = (data) => handlersRef.current.onStrokeAdded?.(data);
    const onStrokeUpdated = (data) => handlersRef.current.onStrokeUpdated?.(data);
    const onStrokeDeleted = (data) => handlersRef.current.onStrokeDeleted?.(data);
    const onBoardCleared = (data) => handlersRef.current.onBoardCleared?.(data);
    const onCursorMoved = (data) => handlersRef.current.onCursorMoved?.(data);

    socket.on('stroke:added', onStrokeAdded);
    socket.on('stroke:updated', onStrokeUpdated);
    socket.on('stroke:deleted', onStrokeDeleted);
    socket.on('board:cleared', onBoardCleared);
    socket.on('cursor:moved', onCursorMoved);

    return () => {
      socket.off('stroke:added', onStrokeAdded);
      socket.off('stroke:updated', onStrokeUpdated);
      socket.off('stroke:deleted', onStrokeDeleted);
      socket.off('board:cleared', onBoardCleared);
      socket.off('cursor:moved', onCursorMoved);
    };
  }, [socket, isConnected]);


  // EMIT HELPERS — memoized
  const emitStrokeAdd = useCallback(
    (stroke) => {
      if (!socket || !boardId) return;
      socket.emit('stroke:add', { boardId, stroke });
    },
    [socket, boardId]
  );

  const emitStrokeUpdate = useCallback(
    (strokeIndex, stroke) => {
      if (!socket || !boardId) return;
      socket.emit('stroke:update', { boardId, strokeIndex, stroke });
    },
    [socket, boardId]
  );

  const emitStrokeDelete = useCallback(
    (strokeIndex) => {
      if (!socket || !boardId) return;
      socket.emit('stroke:delete', { boardId, strokeIndex });
    },
    [socket, boardId]
  );

  const emitBoardClear = useCallback(() => {
    if (!socket || !boardId) return;
    socket.emit('board:clear', { boardId });
  }, [socket, boardId]);

  const emitCursorMove = useCallback(
    (x, y) => {
      if (!socket || !boardId) return;
      socket.emit('cursor:move', { boardId, x, y });
    },
    [socket, boardId]
  );

  return {
    isConnected,
    emitStrokeAdd,
    emitStrokeUpdate,
    emitStrokeDelete,
    emitBoardClear,
    emitCursorMove,
  };
};