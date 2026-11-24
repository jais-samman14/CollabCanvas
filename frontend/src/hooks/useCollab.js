import { useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';

/**
 * Subscribes to real-time Excalidraw collaboration events for a board room and
 * returns memoized emit helpers with acknowledgment support for reliable delta sync.
 * @param {string} boardId - Active board ID.
 * @param {{ onSceneUpdated?: Function, onSceneSynced?: Function, onBoardCleared?: Function, onCursorMoved?: Function }} [handlers={}]
 * @returns {{ isConnected: boolean, emitSceneUpdate: Function, emitBoardClear: Function, emitCursorMove: Function }}
 */
export const useCollab = (boardId, handlers = {}) => {
  const { socket, isConnected } = useSocket();
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  // Join the board room upon mount / reconnect and leave cleanly on unmount
  useEffect(() => {
    if (!socket || !isConnected || !boardId) return;

    socket.emit('board:join', { boardId });
    return () => {
      socket.emit('board:leave', { boardId });
    };
  }, [socket, isConnected, boardId]);

  // Subscribe to incoming scene deltas, initial sync, clear, and cursor broadcasts
  useEffect(() => {
    if (!socket || !isConnected) return;

    const onSceneUpdated = (data) => handlersRef.current.onSceneUpdated?.(data);
    const onSceneSynced = (data) => handlersRef.current.onSceneSynced?.(data);
    const onBoardCleared = (data) => handlersRef.current.onBoardCleared?.(data);
    const onCursorMoved = (data) => handlersRef.current.onCursorMoved?.(data);

    socket.on('scene:updated', onSceneUpdated);
    socket.on('scene:sync', onSceneSynced);
    socket.on('board:cleared', onBoardCleared);
    socket.on('cursor:moved', onCursorMoved);

    return () => {
      socket.off('scene:updated', onSceneUpdated);
      socket.off('scene:sync', onSceneSynced);
      socket.off('board:cleared', onBoardCleared);
      socket.off('cursor:moved', onCursorMoved);
    };
  }, [socket, isConnected]);

  /**
   * Emits a chunk of modified Excalidraw elements with a 5s acknowledgment timeout.
   * Resolves to `{ ok: true }` on server acceptance or `{ ok: false, reason }` for retry.
   */
  const emitSceneUpdate = useCallback(
    (elements) =>
      new Promise((resolve) => {
        if (!elements?.length) return resolve({ ok: true });
        if (!socket || !boardId) return resolve({ ok: false, reason: 'no_socket' });
        socket
          .timeout(5000)
          .emit('scene:update', { boardId, elements }, (err, ack) => {
            if (err) return resolve({ ok: false, reason: 'timeout' });
            resolve(
              ack && typeof ack.ok === 'boolean' ? ack : { ok: false, reason: 'no_ack' }
            );
          });
      }),
    [socket, boardId]
  );

  /** Emits an owner-only request to clear the board for all connected users. */
  const emitBoardClear = useCallback(() => {
    if (!socket || !boardId) return;
    socket.emit('board:clear', { boardId });
  }, [socket, boardId]);

  /** Emits the local pointer's canvas coordinates and mouse button state. */
  const emitCursorMove = useCallback(
    (x, y, button = 'up') => {
      if (!socket || !boardId) return;
      socket.emit('cursor:move', { boardId, x, y, button });
    },
    [socket, boardId]
  );

  return {
    isConnected,
    emitSceneUpdate,
    emitBoardClear,
    emitCursorMove,
  };
};
