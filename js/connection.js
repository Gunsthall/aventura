/* =============================================
   CONNECTION - PeerJS WebRTC Manager
   ============================================= */

// Self-hosted PeerJS signaling server (Render free tier)
// Fallback: default PeerJS cloud (0.peerjs.com)
const PEER_SERVER = {
  host: 'aventura-peer-server.onrender.com',
  port: 443,
  path: '/',
  secure: true,
};

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

const JOIN_TIMEOUT_MS = 15000;

class ConnectionManager {
  constructor() {
    this.peer = null;
    this.mediaConnection = null;
    this.dataConnection = null;
    this.localStream = null;
    this.isHost = false;
    this.roomCode = null;
    this.connected = false;

    // Callbacks
    this.onRemoteStream = null;
    this.onDataReceived = null;
    this.onConnectionReady = null;
    this.onConnectionLost = null;
    this.onError = null;
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

  async initMedia() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: true
      });
      return this.localStream;
    } catch (err) {
      console.warn('Camera/mic access denied:', err.message);
      // Create a silent empty stream as fallback
      this.localStream = new MediaStream();
      return this.localStream;
    }
  }

  _generateCode() {
    const chars = 'ABCDFGHJKLMNPQRSTVWXYZ';
    const nums = '23456789';
    let code = '';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    for (let i = 0; i < 2; i++) code += nums[Math.floor(Math.random() * nums.length)];
    return code;
  }

  createRoom() {
    return new Promise((resolve, reject) => {
      this.roomCode = this._generateCode();
      const peerId = 'AVENTURA-' + this.roomCode;
      this.isHost = true;

      this.peer = new Peer(peerId, this._peerOptions());

      this.peer.on('open', () => {
        console.log('[Host] Connected to signaling server, room:', this.roomCode);
        resolve(this.roomCode);
      });

      this.peer.on('call', (call) => {
        console.log('[Host] Incoming media call');
        call.answer(this.localStream);
        call.on('stream', (remoteStream) => {
          this.onRemoteStream?.(remoteStream);
        });
        call.on('error', (err) => console.error('Media call error:', err));
        this.mediaConnection = call;
      });

      this.peer.on('connection', (conn) => {
        console.log('[Host] Incoming data connection');
        this.dataConnection = conn;
        this._setupDataConnection(conn);
      });

      this.peer.on('error', (err) => {
        console.error('PeerJS error:', err);
        if (err.type === 'unavailable-id') {
          // Code collision - try a new code
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
        if (this.connected) {
          this.connected = false;
          this.onConnectionLost?.();
          // Try to reconnect
          setTimeout(() => {
            if (this.peer && !this.peer.destroyed) {
              this.peer.reconnect();
            }
          }, 2000);
        }
      });
    });
  }

  joinRoom(code) {
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
            // Resolve only when data connection is actually open
            if (!settled) {
              settled = true;
              clearTimeout(timeout);
              console.log('[Guest] Data channel open!');
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
          // Translate common PeerJS errors to user-friendly messages
          let message = err.message || 'Error de conexion';
          if (err.type === 'peer-unavailable') {
            message = 'Sala no encontrada. Verifica que el codigo sea correcto y que el otro jugador este esperando.';
          } else if (err.type === 'network') {
            message = 'Error de red. Verifica tu conexion a internet.';
          } else if (err.type === 'server-error') {
            message = 'Error del servidor de señalizacion. Intenta de nuevo en unos segundos.';
          }
          const userErr = new Error(message);
          this.onError?.(userErr);
          reject(userErr);
        }
      });

      this.peer.on('disconnected', () => {
        if (this.connected) {
          this.connected = false;
          this.onConnectionLost?.();
        }
      });
    });
  }

  _setupDataConnection(conn, onOpen) {
    conn.on('open', () => {
      this.connected = true;
      onOpen?.();
      this.onConnectionReady?.();
    });

    conn.on('data', (data) => {
      this.onDataReceived?.(data);
    });

    conn.on('close', () => {
      this.connected = false;
      this.onConnectionLost?.();
    });

    conn.on('error', (err) => {
      console.error('Data connection error:', err);
    });
  }

  sendData(message) {
    if (this.dataConnection && this.dataConnection.open) {
      this.dataConnection.send(message);
    }
  }

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

  destroy() {
    if (this.mediaConnection) this.mediaConnection.close();
    if (this.dataConnection) this.dataConnection.close();
    if (this.peer) this.peer.destroy();
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
    }
    this.connected = false;
  }
}

window.ConnectionManager = ConnectionManager;
