import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Excalidraw, MainMenu, CaptureUpdateAction } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import './ExcalidrawBoard.css';

// Wait 100ms to group rapid local edits together before sending over WebSocket.
// This keeps network traffic under ~10 messages/second even while dragging shapes fast.
const SCENE_FLUSH_MS = 100;

// If a message fails to reach the server (network hiccup), wait 3 seconds and retry.
const RETRY_BACKOFF_MS = 3000;

// Socket.IO disconnects clients if one message exceeds 1 MB.
// Splitting large updates into 200-element / 400 KB chunks prevents disconnects.
const MAX_CHUNK_ELEMENTS = 200;
const MAX_CHUNK_BYTES = 400 * 1024;

// Only retry temporary network/server errors — never retry invalid payloads forever.
const RETRYABLE_REASONS = new Set([
  'rate_limited',
  'timeout',
  'no_socket',
  'no_ack',
  'not_in_room',
  'server_error',
]);

/**
 * WHAT IT DOES: Splits a large list of changed drawing elements into smaller chunks.
 * WHY WE NEED IT: If someone pastes 1,000 shapes at once, sending them in one huge
 * WebSocket packet could exceed Socket.IO's 1 MB limit and drop the connection.
 */
const chunkElements = (elements) => {
  const chunks = [];
  let current = [];
  let bytes = 0;

  for (const el of elements) {
    const size = JSON.stringify(el).length;
    // Start a new chunk if adding this element would exceed count or byte limits
    if (
      current.length > 0 &&
      (current.length >= MAX_CHUNK_ELEMENTS || bytes + size > MAX_CHUNK_BYTES)
    ) {
      chunks.push(current);
      current = [];
      bytes = 0;
    }
    current.push(el);
    bytes += size;
  }

  if (current.length > 0) chunks.push(current);
  return chunks;
};

/**
 * WHAT IT DOES: Merges your local shapes with shapes coming from teammates without conflicts.
 * HOW IT WORKS (CRDT Last-Write-Wins):
 *   1. Each Excalidraw shape has a `version` number that goes up on every edit.
 *   2. Higher `version` always wins (newer edit beats older edit).
 *   3. If two users edit the exact same shape at the exact same version, the lower
 *      `versionNonce` wins — so every user's screen ends up 100% identical.
 */
const mergeSceneElements = (localElements = [], remoteElements = []) => {
  const byId = new Map();

  // Put all local shapes into a fast lookup map by ID
  for (const el of localElements) {
    byId.set(el.id, el);
  }

  // Compare each incoming remote shape against our local copy
  for (const remote of remoteElements) {
    const local = byId.get(remote.id);
    if (
      !local ||
      remote.version > local.version ||
      (remote.version === local.version && remote.versionNonce < local.versionNonce)
    ) {
      byId.set(remote.id, remote);
    }
  }

  return Array.from(byId.values());
};

/**
 * WHAT IT DOES: Renders the infinite Excalidraw whiteboard and connects it to
 * our real-time Socket.IO sync layer.
 * KEY PERFORMANCE TRICKS (great for interviews!):
 *   1. 100ms delta batching — only sends changed shapes, never the whole board.
 *   2. 60fps requestAnimationFrame cursor coalescing — prevents lag when 20+ users move cursors.
 *   3. Ack + Retry queue — guarantees drawings aren't lost during brief Wi-Fi drops.
 */
const ExcalidrawBoard = forwardRef(
  (
    {
      initialElements = [],
      initialAppState = {},
      initialBgColor = '#ffffff',
      onEmitSceneUpdate,
      onEmitCursorMove,
      onSceneDirty,
      isOwner = false,
      onClearBoard,
    },
    ref
  ) => {
    // Holds Excalidraw's imperative API once the canvas finishes mounting
    const apiRef = useRef(null);
    // Flag to avoid re-broadcasting shapes that we just received from a teammate
    const isApplyingRemoteRef = useRef(false);
    // Remembers the latest version number we have already seen for each shape ID
    const lastVersionsRef = useRef(new Map());
    // Queue of locally modified shapes waiting for the 100ms batch timer to send
    const pendingDeltaRef = useRef(new Map());
    const flushTimerRef = useRef(null);
    // Stores every teammate's latest mouse cursor position keyed by userId
    const collaboratorsRef = useRef(new Map());
    // Tracks the scheduled requestAnimationFrame ID for cursor repaints
    const cursorRafRef = useRef(null);
    const lastBgColorRef = useRef(initialAppState?.viewBackgroundColor || initialBgColor);
    // Buffers remote updates that arrive before Excalidraw finishes loading
    const pendingRemoteRef = useRef([]);
    const emitRef = useRef(onEmitSceneUpdate);

    // Always keep the latest emit callback accessible inside setTimeout timers
    useEffect(() => {
      emitRef.current = onEmitSceneUpdate;
    }, [onEmitSceneUpdate]);

    /**
     * WHAT IT DOES: Schedules a single cursor repaint on the next browser animation frame.
     * WHY IT STOPS LAG: If 20 teammates move their mice at once, we might get 400 cursor
     * events per second. Instead of repainting Excalidraw 400 times/sec, this groups all
     * cursor positions and repaints at most 60 times/sec (once per screen refresh).
     */
    const scheduleCollaboratorsPaint = useCallback(() => {
      if (cursorRafRef.current !== null) return;
      cursorRafRef.current = requestAnimationFrame(() => {
        cursorRafRef.current = null;
        const api = apiRef.current;
        if (!api) return;
        api.updateScene({
          collaborators: new Map(collaboratorsRef.current),
        });
      });
    }, []);

    /**
     * WHAT IT DOES: Sends all queued local shape edits to the server in safe chunks.
     * HOW RETRY WORKS: If the server doesn't acknowledge a chunk (e.g. Wi-Fi blip),
     * the failed shapes are placed back into the queue and retried after 3 seconds.
     */
    const flushPending = useCallback(async () => {
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      if (pendingDeltaRef.current.size === 0) return;

      const delta = Array.from(pendingDeltaRef.current.values());
      pendingDeltaRef.current.clear();

      const chunks = chunkElements(delta);
      let failedFrom = -1;

      for (let i = 0; i < chunks.length; i++) {
        const result = await emitRef.current?.(chunks[i]);
        if (result && result.ok === false) {
          if (RETRYABLE_REASONS.has(result.reason)) {
            failedFrom = i;
            break;
          }
          console.warn('Scene update rejected by server:', result.reason);
        }
      }

      // Put any unsent chunks back into the queue without overwriting newer edits
      if (failedFrom !== -1) {
        for (const el of chunks.slice(failedFrom).flat()) {
          const queued = pendingDeltaRef.current.get(el.id);
          if (!queued || (el.version ?? 0) > (queued.version ?? 0)) {
            pendingDeltaRef.current.set(el.id, el);
          }
        }
        if (!flushTimerRef.current) {
          flushTimerRef.current = setTimeout(flushPending, RETRY_BACKOFF_MS);
        }
      }
    }, []);

    /**
     * WHAT IT DOES: Applies shapes received from teammates onto your local Excalidraw canvas.
     * WHY `CaptureUpdateAction.NEVER`: Teammates' edits shouldn't go into YOUR Undo (Ctrl+Z) history.
     */
    const applyRemoteElementsImpl = useCallback(
      (remoteElements) => {
        if (!Array.isArray(remoteElements) || remoteElements.length === 0) return;
        const api = apiRef.current;
        if (!api) {
          pendingRemoteRef.current.push(remoteElements);
          return;
        }

        const current = api.getSceneElementsIncludingDeleted();
        const merged = mergeSceneElements(current, remoteElements);

        // Update our known version map so we don't echo these shapes back to the server
        for (const el of merged) {
          const prev = lastVersionsRef.current.get(el.id) ?? -1;
          if ((el.version ?? 0) > prev) {
            lastVersionsRef.current.set(el.id, el.version ?? 0);
          }
        }

        isApplyingRemoteRef.current = true;
        api.updateScene({
          elements: merged,
          captureUpdate: CaptureUpdateAction.NEVER,
        });
        isApplyingRemoteRef.current = false;
        onSceneDirty?.();
      },
      [onSceneDirty]
    );

    /**
     * WHAT IT DOES: Runs once Excalidraw is ready, saves the API reference,
     * and replays any teammate edits that arrived while Excalidraw was still loading.
     */
    const handleApiReady = useCallback(
      (api) => {
        apiRef.current = api;
        if (api && pendingRemoteRef.current.length > 0) {
          const queued = pendingRemoteRef.current.flat();
          pendingRemoteRef.current = [];
          applyRemoteElementsImpl(queued);
        }
      },
      [applyRemoteElementsImpl]
    );

    // Record initial shape versions on mount so opening a board doesn't re-broadcast old shapes
    useEffect(() => {
      const map = new Map();
      for (const el of initialElements) {
        map.set(el.id, el.version ?? 0);
      }
      lastVersionsRef.current = map;

      return () => {
        if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
        if (cursorRafRef.current !== null) cancelAnimationFrame(cursorRafRef.current);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Expose helper methods to parent BoardPage via `boardRef.current.*`
    useImperativeHandle(
      ref,
      () => ({
        // Returns raw Excalidraw API (used for PNG/PDF export)
        getAPI: () => apiRef.current,
        // Forces any queued edits to send immediately (used right before ending a session)
        flushNow: () => flushPending(),
        // Collects elements (including deleted tombstones) + background color for DB save
        getPersistableState: () => {
          const api = apiRef.current;
          if (!api) return null;
          const elements = api.getSceneElementsIncludingDeleted();
          const appState = api.getAppState();
          return {
            elements,
            appState: {
              viewBackgroundColor: appState.viewBackgroundColor || '#ffffff',
              gridSize: appState.gridSize ?? null,
            },
            backgroundColor: appState.viewBackgroundColor || '#ffffff',
          };
        },
        // Merges incoming remote shapes from teammates
        applyRemoteElements: (remoteElements) => applyRemoteElementsImpl(remoteElements),
        // Clears the local canvas when the board owner triggers "Clear Board"
        applyRemoteClear: () => {
          const api = apiRef.current;
          if (!api) return;
          lastVersionsRef.current.clear();
          pendingDeltaRef.current.clear();
          isApplyingRemoteRef.current = true;
          api.updateScene({
            elements: [],
            captureUpdate: CaptureUpdateAction.NEVER,
          });
          isApplyingRemoteRef.current = false;
          onSceneDirty?.();
        },
        // Clears the canvas locally when the owner clicks Clear
        clearLocalAndBroadcast: () => {
          const api = apiRef.current;
          if (!api) return;
          lastVersionsRef.current.clear();
          pendingDeltaRef.current.clear();
          api.updateScene({
            elements: [],
            captureUpdate: CaptureUpdateAction.IMMEDIATELY,
          });
          onSceneDirty?.();
        },
        // Stores a teammate's latest cursor position and schedules a 60fps repaint
        updateRemoteCursor: ({ userId, name, color, x, y, button }) => {
          if (!userId) return;
          collaboratorsRef.current.set(userId, {
            username: name || 'Collaborator',
            color: {
              background: color || '#6366f1',
              stroke: color || '#6366f1',
            },
            pointer: { x, y, tool: 'pointer' },
            button: button || 'up',
          });
          scheduleCollaboratorsPaint();
        },
        // Removes a teammate's cursor when they leave the board
        removeRemoteCursor: (userId) => {
          if (!collaboratorsRef.current.has(userId)) return;
          collaboratorsRef.current.delete(userId);
          scheduleCollaboratorsPaint();
        },
      }),
      [onSceneDirty, applyRemoteElementsImpl, flushPending, scheduleCollaboratorsPaint]
    );

    /**
     * WHAT IT DOES: Runs whenever you draw, move, edit, or erase anything on Excalidraw.
     * HOW IT SAVES BANDWIDTH: Compares each shape's `version` against `lastVersionsRef`,
     * puts ONLY modified shapes into `pendingDeltaRef`, and sends them after 100ms.
     */
    const handleChange = useCallback(
      (elements, appState) => {
        if (isApplyingRemoteRef.current) return;

        let changed = false;
        for (const el of elements) {
          const lastVer = lastVersionsRef.current.get(el.id) ?? -1;
          if ((el.version ?? 0) > lastVer) {
            lastVersionsRef.current.set(el.id, el.version ?? 0);
            pendingDeltaRef.current.set(el.id, el);
            changed = true;
          }
        }

        const bg = appState?.viewBackgroundColor;
        if (bg && bg !== lastBgColorRef.current) {
          lastBgColorRef.current = bg;
          onSceneDirty?.();
        }

        if (!changed) return;

        onSceneDirty?.();
        if (!flushTimerRef.current) {
          flushTimerRef.current = setTimeout(flushPending, SCENE_FLUSH_MS);
        }
      },
      [flushPending, onSceneDirty]
    );

    /**
     * WHAT IT DOES: Sends your current mouse/pen coordinates to teammates (throttled in BoardPage).
     */
    const handlePointerUpdate = useCallback(
      (payload) => {
        if (!payload?.pointer) return;
        onEmitCursorMove?.(payload.pointer.x, payload.pointer.y, payload.button);
      },
      [onEmitCursorMove]
    );

    return (
      <div className="excalidraw-board">
        <Excalidraw
          excalidrawAPI={handleApiReady}
          initialData={{
            elements: initialElements,
            appState: {
              viewBackgroundColor: initialAppState?.viewBackgroundColor || initialBgColor,
              gridSize: initialAppState?.gridSize ?? null,
              collaborators: new Map(),
            },
          }}
          onChange={handleChange}
          onPointerUpdate={handlePointerUpdate}
          isCollaborating={true}
          UIOptions={{
            canvasActions: {
              clearCanvas: false,
              saveToActiveFile: false,
              loadScene: false,
              export: { saveFileToDisk: true },
            },
            tools: { image: false },
          }}
        >
          <MainMenu>
            <MainMenu.DefaultItems.Export />
            <MainMenu.DefaultItems.SaveAsImage />
            {isOwner && onClearBoard && (
              <MainMenu.Item onSelect={onClearBoard}>
                🗑️ Clear board (Owner)
              </MainMenu.Item>
            )}
            <MainMenu.Separator />
            <MainMenu.DefaultItems.ToggleTheme />
            <MainMenu.DefaultItems.ChangeCanvasBackground />
          </MainMenu>
        </Excalidraw>
      </div>
    );
  }
);

ExcalidrawBoard.displayName = 'ExcalidrawBoard';

export default ExcalidrawBoard;
