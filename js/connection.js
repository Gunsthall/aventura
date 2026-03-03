/* =============================================
   CONNECTION - PeerJS WebRTC Manager
   Wake-up, keep-alive, and reconnect engine
   ============================================= */

// Self-hosted PeerJS signaling server (Render free tier)
const PEER_SERVER = {
  host: 'aventura-peer-server.onrender.com',
  port: 443,
  path: '/peer',
  secure: true,
};

const HEALTH_URL = 'https://aventura-peer-server.onrender.com/health';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // Free TURN servers for NAT traversal
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  }
];

const JOIN_TIMEOUT_MS = 20000;
const KEEPALIVE_INTERVAL_MS = 4 * 60 * 1000; // 4 minutes
const RECONNECT_MAX_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY_MS = 2000;

class ConnectionManager {
  constructor() {
    this.peer = null;
    this.mediaConnection = null;
    this.dataConnection = null;
    this.localStream = null;
    this.isHost = false;
    this.roomCode = null;
    this.connected = false;
    this._keepAliveTimer = null;
    this._reconnecting = false;

    // Callbacks
    this.onRemoteStream = null;
    this.onDataReceived = null;
    this.onConnectionReady = null;
    this.onConnectionLost = null;
    this.onError = null;
    // Reconnect callbacks
    this.onReconnectAttempt = null;  // (attempt, maxAttempts)
    this.onReconnected = null;
    this.onReconnectFailed = null;
  }

  _peerOptions() {
    return {
      host: PEER_SERVER.host,
      port: PEER_SERVER.port,
      path: PEER_SERVER.path,
      secure: PEER_SERVER.secure,
      config: { iceServers: ICE_SERVERS },
      debug: 1,
    };
  }

  // ---- Server Wake-up ----
  // Render free tier spins down after 15min inactivity.
  // Fetch /health to wake it before any Peer() connection.
  static async wakeServer(timeoutMs = 35000) {
    const start = Date.now();
    const retryDelay = 2000;
    while (Date.now() - start < timeoutMs) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        const resp = await fetch(HEALTH_URL, { signal: controller.signal });
        clearTimeout(timer);
        if (resp.ok) {
          console.log('[Wake] Server is ready');
          return true;
        }
      } catch (_) {
        // Server still waking up
      }
      console.log('[Wake] Server not ready, retrying...');
      await new Promise(r => setTimeout(r, retryDelay));
    }
    console.warn('[Wake] Server did not respond within timeout');
    return false;
  }

  // ---- Keep-alive ----
  // Ping /health every 4 minutes to prevent Render spin-down
  _startKeepAlive() {
    this._stopKeepAlive();
    this._keepAliveTimer = setInterval(async () => {
      try {
        await fetch(HEALTH_URL, { method: 'GET' });
      } catch (_) {
        // Ignore - just a keep-alive
      }
    }, KEEPALIVE_INTERVAL_MS);
  }

  _stopKeepAlive() {
    if (this._keepAliveTimer) {
      clearInterval(this._keepAliveTimer);
      this._keepAliveTimer = null;
    }
  }

  // ---- Media ----
  async initMedia() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: true
      });
      return this.localStream;
    } catch (err) {
      console.warn('Camera/mic access denied:', err.message);
      this.localStream = new MediaStream();
      return this.localStream;
    }
  }

  // ---- Room Code ----
  _generateCode() {
    const chars = 'ABCDFGHJKLMNPQRSTVWXYZ';
    const nums = '23456789';
    let code = '';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    for (let i = 0; i < 2; i++) code += nums[Math.floor(Math.random() * nums.length)];
    return code;
  }

  // ---- Create Room (Host) ----
  async createRoom() {
    // Wake server first
    await ConnectionManager.wakeServer();

    return new Promise((resolve, reject) => {
      this.roomCode = this._generateCode();
      const peerId = 'AVENTURA-' + this.roomCode;
      this.isHost = true;

      this.peer = new Peer(peerId, this._peerOptions());

      this.peer.on('open', () => {
        console.log('[Host] Connected to signaling server, room:', this.roomCode);
        this._startKeepAlive();
        resolve(this.roomCode);
      });

      this.peer.on('call', (call) => {
        console.log('[Host] Incoming media call');
        // Close old media connection if guest is reconnecting
        if (this.mediaConnection) {
          try { this.mediaConnection.close(); } catch (_) {}
        }
        call.answer(this.localStream);
        call.on('stream', (remoteStream) => {
          this.onRemoteStream?.(remoteStream);
        });
        call.on('error', (err) => console.error('Media call error:', err));
        this.mediaConnection = call;
      });

      this.peer.on('connection', (conn) => {
        console.log('[Host] Incoming data connection');
        // Close old data connection if guest is reconnecting
        if (this.dataConnection && this.dataConnection.open) {
          try { this.dataConnection.close(); } catch (_) {}
        }
        this.dataConnection = conn;
        this._setupDataConnection(conn);
      });

      this.peer.on('error', (err) => {
        console.error('PeerJS error:', err);
        if (err.type === 'unavailable-id') {
          this.peer.destroy();
          this.roomCode = this._generateCode();
          this.createRoom().then(resolve).catch(reject);
        } else {
          this.onError?.(err);
          reject(err);
        }
      });

      this.peer.on('disconnected', () => {
        console.log('[Host] Disconnected from signaling server');
        // Try to reconnect to signaling server (not the same as data reconnect)
        if (this.peer && !this.peer.destroyed) {
          setTimeout(() => {
            try { this.peer.reconnect(); } catch (_) {}
          }, 2000);
        }
      });
    });
  }

  // ---- Join Room (Guest) ----
  async joinRoom(code) {
    // Wake server first
    await ConnectionManager.wakeServer();

    return this._connectToHost(code);
  }

  _connectToHost(code) {
    return new Promise((resolve, reject) => {
      this.roomCode = code.toUpperCase().trim();
      const targetId = 'AVENTURA-' + this.roomCode;
      this.isHost = false;
      let settled = false;

      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          const err = new Error('No se pudo conectar a la sala. Verifica el codigo e intenta de nuevo.');
          this.onError?.(err);
          reject(err);
          if (this.peer && !this.peer.destroyed) {
            this.peer.destroy();
          }
        }
      }, JOIN_TIMEOUT_MS);

      this.peer = new Peer(undefined, this._peerOptions());

      this.peer.on('open', (id) => {
        console.log('[Guest] Connected to signaling server as:', id);
        console.log('[Guest] Connecting to room:', targetId);

        // Media call
        if (this.localStream) {
          const call = this.peer.call(targetId, this.localStream);
          if (call) {
            call.on('stream', (remoteStream) => {
              this.onRemoteStream?.(remoteStream);
            });
            call.on('error', (err) => console.error('Media call error:', err));
            this.mediaConnection = call;
          }
        }

        // Data channel
        const conn = this.peer.connect(targetId, { reliable: true });
        if (conn) {
          this.dataConnection = conn;
          this._setupDataConnection(conn, () => {
            if (!settled) {
              settled = true;
              clearTimeout(timeout);
              console.log('[Guest] Data channel open!');
              this._startKeepAlive();
              resolve(this.roomCode);
            }
          });
        } else {
          if (!settled) {
            settled = true;
            clearTimeout(timeout);
            reject(new Error('Error al establecer conexion de datos'));
          }
        }
      });

      this.peer.on('error', (err) => {
        console.error('PeerJS error:', err);
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          let message = err.message || 'Error de conexion';
          if (err.type === 'peer-unavailable') {
            message = 'Sala no encontrada. Verifica que el codigo sea correcto y que el otro jugador este esperando.';
          } else if (err.type === 'network') {
            message = 'Error de red. Verifica tu conexion a internet.';
          } else if (err.type === 'server-error') {
            message = 'Error del servidor. Intenta de nuevo en unos segundos.';
          }
          const userErr = new Error(message);
          this.onError?.(userErr);
          reject(userErr);
        }
      });

      this.peer.on('disconnected', () => {
        // Don't trigger overlay here — let SyncManager's pong timeout
        // confirm the connection is truly dead before acting
        console.log('[Guest] Disconnected from signaling server');
      });
    });
  }

  // ---- Data Connection Setup ----
  _setupDataConnection(conn, onOpen) {
    conn.on('open', () => {
      this.connected = true;
      this._reconnecting = false;
      onOpen?.();
      this.onConnectionReady?.();
    });

    conn.on('data', (data) => {
      this.onDataReceived?.(data);
    });

    conn.on('close', () => {
      console.log('[Connection] Data channel closed');
      this.connected = false;
      // Don't call onConnectionLost immediately — let SyncManager's
      // pong timeout (15s) confirm the connection is truly dead.
      // SyncManager will call triggerReconnect() or show UI as needed.
    });

    conn.on('error', (err) => {
      console.error('Data connection error:', err);
    });
  }

  // ---- Guest Reconnect Engine ----
  // Called by SyncManager when pong timeout confirms dead connection.
  async reconnect() {
    if (this.isHost || this._reconnecting) return;
    if (!this.roomCode) return;

    this._reconnecting = true;
    const code = this.roomCode;

    for (let attempt = 1; attempt <= RECONNECT_MAX_ATTEMPTS; attempt++) {
      this.onReconnectAttempt?.(attempt, RECONNECT_MAX_ATTEMPTS);
      console.log(`[Reconnect] Attempt ${attempt}/${RECONNECT_MAX_ATTEMPTS}`);

      // Cleanup old peer
      this._cleanupPeer();

      // Wait with exponential backoff: 2s, 3s, 4.5s, 6.75s, 10s
      const delay = Math.min(RECONNECT_BASE_DELAY_MS * Math.pow(1.5, attempt - 1), 10000);
      await new Promise(r => setTimeout(r, delay));

      // Wake server (Render may have spun down)
      const awake = await ConnectionManager.wakeServer(15000);
      if (!awake) {
        console.log('[Reconnect] Server not reachable, will retry');
        continue;
      }

      // Try to connect
      try {
        await this._connectToHost(code);
        console.log('[Reconnect] Success!');
        this._reconnecting = false;
        this.onReconnected?.();
        return;
      } catch (err) {
        console.log(`[Reconnect] Attempt ${attempt} failed:`, err.message);
      }
    }

    // All attempts failed
    this._reconnecting = false;
    this.onReconnectFailed?.();
  }

  _cleanupPeer() {
    try {
      if (this.mediaConnection) this.mediaConnection.close();
    } catch (_) {}
    try {
      if (this.dataConnection) this.dataConnection.close();
    } catch (_) {}
    try {
      if (this.peer && !this.peer.destroyed) this.peer.destroy();
    } catch (_) {}
    this.mediaConnection = null;
    this.dataConnection = null;
    this.peer = null;
    this.connected = false;
  }

  // ---- Send Data ----
  sendData(message) {
    if (this.dataConnection && this.dataConnection.open) {
      this.dataConnection.send(message);
    }
  }

  // ---- Media Controls ----
  toggleMic() {
    if (!this.localStream) return false;
    const audioTracks = this.localStream.getAudioTracks();
    if (audioTracks.length === 0) return false;
    const enabled = !audioTracks[0].enabled;
    audioTracks.forEach(t => t.enabled = enabled);
    return enabled;
  }

  toggleCamera() {
    if (!this.localStream) return false;
    const videoTracks = this.localStream.getVideoTracks();
    if (videoTracks.length === 0) return false;
    const enabled = !videoTracks[0].enabled;
    videoTracks.forEach(t => t.enabled = enabled);
    return enabled;
  }

  // ---- Destroy ----
  destroy() {
    this._stopKeepAlive();
    this._reconnecting = false;
    this._cleanupPeer();
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
    }
  }
}

window.ConnectionManager = ConnectionManager;
