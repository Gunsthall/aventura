/* =============================================
   SYNC - Synchronization Protocol
   ============================================= */

class SyncManager {
  constructor(connectionManager, storyEngine) {
    this.conn = connectionManager;
    this.engine = storyEngine;
    this.isHost = connectionManager.isHost;
    this._pingInterval = null;

    // Wire up incoming data
    this.conn.onDataReceived = (msg) => this._handleMessage(msg);

    // Wire up engine events for broadcasting
    this.engine.onNavigate = (target, choiceIndex) => {
      this.broadcastNavigation(target, choiceIndex);
    };

    this.engine.onPuzzleAttempt = (pageId, answer, correct) => {
      this.broadcastPuzzleAttempt(pageId, answer, correct);
    };

    // Start keepalive pings
    this._startPing();

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
            // Need to load the story first, then apply state
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
            this.engine.goToPage(this.engine.story.meta.startPage);
            this.engine.moralPoints = 0;
            this.engine.visitedPages = [];
            this.engine.puzzleResults = {};
          } else {
            // Apply moral points if provided
            if (msg.payload.moralPoints !== undefined) {
              this.engine.moralPoints = msg.payload.moralPoints;
            }
            this.engine.goToPage(target);
          }
        }
        break;

      case 'PUZZLE_ATTEMPT':
        if (msg.payload) {
          // Show the puzzle result on the remote side
          const { pageId, answer, correct } = msg.payload;
          if (correct) {
            this.engine.puzzleResults[pageId] = true;
          }
          // If we're on the same puzzle page, refresh it
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
        // Respond with pong
        this.conn.sendData({ type: 'PONG', payload: { timestamp: Date.now() } });
        break;

      case 'PONG':
        // Connection alive
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

  _startPing() {
    this._pingInterval = setInterval(() => {
      if (this.conn.connected) {
        this.conn.sendData({ type: 'PING', payload: { timestamp: Date.now() } });
      }
    }, 10000);
  }

  destroy() {
    if (this._pingInterval) {
      clearInterval(this._pingInterval);
    }
  }
}

window.SyncManager = SyncManager;
