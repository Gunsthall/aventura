/* =============================================
   SYNC - Synchronization Protocol
   Dead-connection detection + state recovery
   ============================================= */

const PING_INTERVAL_MS = 5000;
const PONG_TIMEOUT_MS = 15000;
const HEALTH_CHECK_INTERVAL_MS = 15000;

class SyncManager {
  constructor(connectionManager, storyEngine) {
    this.conn = connectionManager;
    this.engine = storyEngine;
    this.isHost = connectionManager.isHost;
    this._pingInterval = null;
    this._healthCheckInterval = null;
    this._lastPong = Date.now();
    this._dead = false;

    // Wire up incoming data
    this.conn.onDataReceived = (msg) => this._handleMessage(msg);

    // Wire up engine events for broadcasting
    this.engine.onNavigate = (target, choiceIndex) => {
      this.broadcastNavigation(target, choiceIndex);
    };

    this.engine.onPuzzleAttempt = (pageId, answer, correct) => {
      this.broadcastPuzzleAttempt(pageId, answer, correct);
    };

    // Start keepalive pings + health checks
    this._startPing();
    this._startHealthCheck();

    // Callback for handling special navigation (menu, restart)
    this.onMenuRequested = null;
    this.onStorySelected = null;
  }

  _handleMessage(msg) {
    if (!msg || !msg.type) return;

    switch (msg.type) {
      case 'SYNC_STATE':
        // Full state sync - guest receives from host
        if (!this.isHost && msg.payload) {
          if (msg.payload.storyId && this.engine.story?.meta?.id !== msg.payload.storyId) {
            this.engine.loadStory(msg.payload.storyId).then(() => {
              this.engine.loadState(msg.payload);
            });
          } else {
            this.engine.loadState(msg.payload);
          }
        }
        break;

      case 'NAVIGATE':
        if (msg.payload) {
          const target = msg.payload.targetPage;
          if (target === '__menu__') {
            this.onMenuRequested?.();
          } else if (target === '__restart__') {
            this.engine.moralPoints = 0;
            this.engine.visitedPages = [];
            this.engine.pageHistory = [];
            this.engine.puzzleResults = {};
            this.engine.goToPage(this.engine.story.meta.startPage);
          } else if (target === '__back__') {
            if (this.engine.pageHistory.length > 0) {
              const previousPage = this.engine.pageHistory.pop();
              this.engine.goToPage(previousPage, { skipHistory: true });
            }
          } else {
            if (msg.payload.moralPoints !== undefined) {
              this.engine.moralPoints = msg.payload.moralPoints;
            }
            this.engine.goToPage(target);
          }
        }
        break;

      case 'PUZZLE_ATTEMPT':
        if (msg.payload) {
          const { pageId, answer, correct } = msg.payload;
          if (correct) {
            this.engine.puzzleResults[pageId] = true;
          }
          if (this.engine.currentPageId === pageId) {
            this.engine.goToPage(pageId);
          }
        }
        break;

      case 'STORY_SELECT':
        if (msg.payload?.storyId) {
          this.onStorySelected?.(msg.payload.storyId);
        }
        break;

      case 'PING':
        this.conn.sendData({ type: 'PONG', payload: { timestamp: Date.now() } });
        break;

      case 'PONG':
        this._lastPong = Date.now();
        this._dead = false;
        break;

      case 'REQUEST_STATE':
        // Guest reconnected and needs current state
        if (this.isHost) {
          console.log('[Sync] Guest requested state, sending full sync');
          this.sendFullState();
        }
        break;
    }
  }

  broadcastNavigation(targetPage, choiceIndex) {
    this.conn.sendData({
      type: 'NAVIGATE',
      payload: {
        targetPage,
        choiceIndex,
        moralPoints: this.engine.moralPoints
      }
    });
  }

  broadcastPuzzleAttempt(pageId, answer, correct) {
    this.conn.sendData({
      type: 'PUZZLE_ATTEMPT',
      payload: { pageId, answer, correct }
    });
  }

  broadcastStorySelect(storyId) {
    this.conn.sendData({
      type: 'STORY_SELECT',
      payload: { storyId }
    });
  }

  sendFullState() {
    if (this.engine.story) {
      this.conn.sendData({
        type: 'SYNC_STATE',
        payload: this.engine.getState()
      });
    }
  }

  // Request full state from host (called after guest reconnects)
  requestState() {
    this.conn.sendData({ type: 'REQUEST_STATE' });
  }

  // Re-wire the data handler after a reconnect (new data connection = new handler)
  rewire() {
    this.conn.onDataReceived = (msg) => this._handleMessage(msg);
    this._lastPong = Date.now();
    this._dead = false;
  }

  // ---- Ping: send every 5s ----
  _startPing() {
    this._pingInterval = setInterval(() => {
      if (this.conn.connected) {
        this.conn.sendData({ type: 'PING', payload: { timestamp: Date.now() } });
      }
    }, PING_INTERVAL_MS);
  }

  // ---- Health Check: detect dead connections via pong timeout ----
  _startHealthCheck() {
    this._healthCheckInterval = setInterval(() => {
      if (!this.conn.connected && !this.conn._reconnecting) {
        // Already disconnected, check if we should trigger reconnect
        this._handleDeadConnection();
        return;
      }

      const elapsed = Date.now() - this._lastPong;
      if (elapsed > PONG_TIMEOUT_MS && !this._dead) {
        console.log(`[Sync] No pong for ${Math.round(elapsed / 1000)}s — connection dead`);
        this._handleDeadConnection();
      }
    }, HEALTH_CHECK_INTERVAL_MS);
  }

  _handleDeadConnection() {
    if (this._dead) return;
    this._dead = true;
    this.conn.connected = false;

    if (!this.conn.isHost) {
      // Guest: trigger automatic reconnect
      console.log('[Sync] Guest detected dead connection, triggering reconnect');
      this.conn.reconnect();
    } else {
      // Host: show connection lost UI (can't reconnect — guest must come back)
      console.log('[Sync] Host detected dead connection, showing overlay');
      this.conn.onConnectionLost?.();
    }
  }

  destroy() {
    if (this._pingInterval) {
      clearInterval(this._pingInterval);
    }
    if (this._healthCheckInterval) {
      clearInterval(this._healthCheckInterval);
    }
  }
}

window.SyncManager = SyncManager;
