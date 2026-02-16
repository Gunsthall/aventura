/* =============================================
   APP - Main Application Controller
   ============================================= */

(function () {
  'use strict';

  // State
  let connectionManager = null;
  let storyEngine = null;
  let syncManager = null;
  let currentScreen = 'connect';
  let storyCatalog = null;

  // DOM refs
  const screens = {
    connect: document.getElementById('screen-connect'),
    menu: document.getElementById('screen-menu'),
    game: document.getElementById('screen-game'),
  };

  const els = {
    // Connect screen
    localPreview: document.getElementById('local-preview'),
    cameraPlaceholder: document.getElementById('camera-placeholder'),
    connectChoice: document.getElementById('connect-choice'),
    btnCreateRoom: document.getElementById('btn-create-room'),
    btnJoinRoom: document.getElementById('btn-join-room'),
    panelCreate: document.getElementById('panel-create'),
    panelJoin: document.getElementById('panel-join'),
    roomCodeText: document.getElementById('room-code-text'),
    btnCopyCode: document.getElementById('btn-copy-code'),
    createWaiting: document.getElementById('create-waiting'),
    inputRoomCode: document.getElementById('input-room-code'),
    btnConnect: document.getElementById('btn-connect'),
    joinStatus: document.getElementById('join-status'),
    btnBackCreate: document.getElementById('btn-back-create'),
    btnBackJoin: document.getElementById('btn-back-join'),
    connectError: document.getElementById('connect-error'),
    errorMessage: document.getElementById('error-message'),
    btnRetry: document.getElementById('btn-retry'),

    // Menu screen
    menuRoomCode: document.getElementById('menu-room-code'),
    storyGrid: document.getElementById('story-grid'),

    // Game screen
    gameRoomBadge: document.getElementById('game-room-badge'),
    remoteVideo: document.getElementById('remote-video'),
    remotePlaceholder: document.getElementById('remote-placeholder'),
    localVideo: document.getElementById('local-video'),
    connectionStatus: document.getElementById('connection-status'),
    btnBackMenu: document.getElementById('btn-back-menu'),
    btnToggleMic: document.getElementById('btn-toggle-mic'),
    btnToggleCam: document.getElementById('btn-toggle-cam'),
    btnToggleSound: document.getElementById('btn-toggle-sound'),

    // Overlays
    overlayReconnecting: document.getElementById('overlay-reconnecting'),
    overlayLoading: document.getElementById('overlay-loading'),
  };

  // ---- Screen Management ----
  function showScreen(name) {
    Object.keys(screens).forEach(key => {
      screens[key].classList.toggle('active', key === name);
    });
    currentScreen = name;
  }

  // ---- Init ----
  async function init() {
    connectionManager = new ConnectionManager();

    // Init camera preview
    try {
      const stream = await connectionManager.initMedia();
      if (stream && stream.getVideoTracks().length > 0) {
        els.localPreview.srcObject = stream;
        els.cameraPlaceholder.classList.add('hidden');
      }
    } catch (e) {
      console.warn('Camera init failed:', e);
    }

    // Setup event listeners
    setupConnectEvents();
    setupGameEvents();

    // Load story catalog
    await loadStoryCatalog();
  }

  // ---- Story Catalog ----
  async function loadStoryCatalog() {
    try {
      const resp = await fetch('stories/index.json');
      storyCatalog = await resp.json();
    } catch (e) {
      console.error('Failed to load story catalog:', e);
      storyCatalog = { stories: [] };
    }
  }

  function renderStoryMenu() {
    els.storyGrid.innerHTML = '';
    els.menuRoomCode.textContent = connectionManager.roomCode || '';

    if (!storyCatalog || storyCatalog.stories.length === 0) {
      els.storyGrid.innerHTML = '<p style="color:var(--color-text-muted);text-align:center">No hay aventuras disponibles todavía.</p>';
      return;
    }

    storyCatalog.stories.forEach(story => {
      const card = document.createElement('div');
      card.className = 'story-card';
      card.innerHTML = `
        <div class="story-card-cover">${story.coverEmoji || '📖'}</div>
        <div class="story-card-title">${story.title}</div>
        <div class="story-card-description">${story.description}</div>
        <div class="story-card-tags">
          ${(story.tags || []).map(t => `<span class="story-tag">${t}</span>`).join('')}
        </div>
      `;

      card.addEventListener('click', () => selectStory(story.id));
      els.storyGrid.appendChild(card);
    });
  }

  let _selectingStory = false; // guard against re-entrant calls

  async function selectStory(storyId, fromRemote = false) {
    // Prevent infinite loop: if already selecting, bail out
    if (_selectingStory) return;
    _selectingStory = true;

    try {
      showScreen('game');
      els.overlayLoading.classList.remove('hidden');

      storyEngine = new StoryEngine();
      const loaded = await storyEngine.loadStory(storyId);

      if (!loaded) {
        alert('Error al cargar la historia');
        showScreen('menu');
        els.overlayLoading.classList.add('hidden');
        return;
      }

      // Setup sync
      if (syncManager) syncManager.destroy();
      syncManager = new SyncManager(connectionManager, storyEngine);
      syncManager.onMenuRequested = () => {
        goToMenu();
      };
      syncManager.onStorySelected = (id) => selectStory(id, true);

      // Only broadcast to remote if WE initiated the selection (not if remote told us)
      if (!fromRemote) {
        syncManager.broadcastStorySelect(storyId);
        setTimeout(() => syncManager.sendFullState(), 500);
      }

      // Setup video in game
      if (connectionManager.localStream) {
        els.localVideo.srcObject = connectionManager.localStream;
      }

      els.gameRoomBadge.textContent = connectionManager.roomCode || '';
      els.overlayLoading.classList.add('hidden');
    } finally {
      _selectingStory = false;
    }
  }

  // ---- Connection Events ----
  function setupConnectEvents() {
    // Create Room
    els.btnCreateRoom.addEventListener('click', async () => {
      els.connectChoice.classList.add('hidden');
      els.panelCreate.classList.remove('hidden');

      try {
        const code = await connectionManager.createRoom();
        els.roomCodeText.textContent = code;

        // When remote player connects
        connectionManager.onConnectionReady = () => {
          window.audioManager?.connected();
          goToMenu();
        };

        connectionManager.onRemoteStream = (stream) => {
          els.remoteVideo.srcObject = stream;
          els.remotePlaceholder.classList.add('hidden');
        };

        connectionManager.onConnectionLost = () => {
          els.overlayReconnecting.classList.remove('hidden');
          els.connectionStatus.classList.add('disconnected');
        };

        connectionManager.onError = (err) => {
          showConnectError(err.message || 'Error de conexión');
        };
      } catch (err) {
        showConnectError(err.message || 'Error al crear la sala');
      }
    });

    // Copy code
    els.btnCopyCode.addEventListener('click', () => {
      const code = els.roomCodeText.textContent;
      navigator.clipboard?.writeText(code).then(() => {
        els.btnCopyCode.textContent = '✅';
        setTimeout(() => els.btnCopyCode.textContent = '📋', 2000);
      });
    });

    // Join Room
    els.btnJoinRoom.addEventListener('click', () => {
      els.connectChoice.classList.add('hidden');
      els.panelJoin.classList.remove('hidden');
      els.inputRoomCode.focus();
    });

    // Connect button
    els.btnConnect.addEventListener('click', () => doJoinRoom());
    els.inputRoomCode.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doJoinRoom();
    });

    // Auto-uppercase input
    els.inputRoomCode.addEventListener('input', () => {
      els.inputRoomCode.value = els.inputRoomCode.value.toUpperCase();
    });

    async function doJoinRoom() {
      const code = els.inputRoomCode.value.trim();
      if (code.length < 4) {
        showJoinStatus('Introduce un código de sala válido', 'error');
        return;
      }

      showJoinStatus('Conectando...', 'success');
      els.btnConnect.disabled = true;

      connectionManager.onRemoteStream = (stream) => {
        els.remoteVideo.srcObject = stream;
        els.remotePlaceholder.classList.add('hidden');
      };

      connectionManager.onConnectionReady = () => {
        window.audioManager?.connected();
        goToMenu();
      };

      connectionManager.onConnectionLost = () => {
        els.overlayReconnecting.classList.remove('hidden');
        els.connectionStatus.classList.add('disconnected');
      };

      connectionManager.onError = (err) => {
        showJoinStatus(err.message || 'Error de conexión', 'error');
        els.btnConnect.disabled = false;
      };

      try {
        await connectionManager.joinRoom(code);
        showJoinStatus('¡Conectado! Estableciendo canal de datos...', 'success');
      } catch (err) {
        showJoinStatus(err.message || 'Error al conectar', 'error');
        els.btnConnect.disabled = false;
      }
    }

    // Back buttons
    els.btnBackCreate.addEventListener('click', () => {
      els.panelCreate.classList.add('hidden');
      els.connectChoice.classList.remove('hidden');
      connectionManager.destroy();
      connectionManager = new ConnectionManager();
      connectionManager.initMedia().then(stream => {
        if (stream.getVideoTracks().length > 0) {
          els.localPreview.srcObject = stream;
        }
      });
    });

    els.btnBackJoin.addEventListener('click', () => {
      els.panelJoin.classList.add('hidden');
      els.connectChoice.classList.remove('hidden');
      els.inputRoomCode.value = '';
      els.joinStatus.classList.add('hidden');
      els.btnConnect.disabled = false;
    });

    // Retry
    els.btnRetry.addEventListener('click', () => {
      els.connectError.classList.add('hidden');
      els.connectChoice.classList.remove('hidden');
      els.panelCreate.classList.add('hidden');
      els.panelJoin.classList.add('hidden');
    });
  }

  function showJoinStatus(text, type) {
    els.joinStatus.textContent = text;
    els.joinStatus.className = 'join-status ' + type;
    els.joinStatus.classList.remove('hidden');
  }

  function showConnectError(msg) {
    els.errorMessage.textContent = msg;
    els.connectError.classList.remove('hidden');
    els.panelCreate.classList.add('hidden');
    els.panelJoin.classList.add('hidden');
  }

  function goToMenu() {
    els.overlayReconnecting.classList.add('hidden');
    showScreen('menu');
    renderStoryMenu();

    // Listen for STORY_SELECT from remote while on the menu screen
    // (syncManager doesn't exist yet at this point)
    connectionManager.onDataReceived = (msg) => {
      if (msg?.type === 'STORY_SELECT' && msg.payload?.storyId) {
        selectStory(msg.payload.storyId, true);
      }
    };
  }

  // ---- Game Events ----
  function setupGameEvents() {
    // Back to menu
    els.btnBackMenu.addEventListener('click', () => {
      goToMenu();
    });

    // Toggle mic
    els.btnToggleMic.addEventListener('click', () => {
      const enabled = connectionManager.toggleMic();
      els.btnToggleMic.classList.toggle('muted', !enabled);
      els.btnToggleMic.textContent = enabled ? '🎤' : '🔇';
    });

    // Toggle camera
    els.btnToggleCam.addEventListener('click', () => {
      const enabled = connectionManager.toggleCamera();
      els.btnToggleCam.classList.toggle('muted', !enabled);
      els.btnToggleCam.textContent = enabled ? '📷' : '📷';
      els.btnToggleCam.style.opacity = enabled ? '1' : '0.5';
    });

    // Toggle sound
    els.btnToggleSound.addEventListener('click', () => {
      const enabled = window.audioManager.toggle();
      els.btnToggleSound.textContent = enabled ? '🔊' : '🔈';
      els.btnToggleSound.classList.toggle('muted', !enabled);
    });
  }

  // ---- Solo Mode (for testing without connection) ----
  // Allow playing without a peer connection - just skip to menu
  window.addEventListener('keydown', (e) => {
    // Ctrl+Shift+S = Solo mode (skip connection)
    if (e.ctrlKey && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      connectionManager = new ConnectionManager();
      connectionManager.connected = false;
      connectionManager.sendData = () => {}; // no-op
      goToMenu();
    }
  });

  // ---- Start ----
  document.addEventListener('DOMContentLoaded', init);
})();
