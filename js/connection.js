/* =============================================
   CONNECTION - PeerJS WebRTC Manager
   ============================================= */

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

      this.peer = new Peer(peerId, {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });

      this.peer.on('open', () => {
        resolve(this.roomCode);
      });

      this.peer.on('call', (call) => {
        call.answer(this.localStream);
        call.on('stream', (remoteStream) => {
          this.onRemoteStream?.(remoteStream);
        });
        call.on('error', (err) => console.error('Media call error:', err));
        this.mediaConnection = call;
      });

      this.peer.on('connection', (conn) => {
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

      this.peer = new Peer(undefined, {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });

      this.peer.on('open', () => {
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
          this._setupDataConnection(conn);
          resolve(this.roomCode);
        } else {
          reject(new Error('Error al establecer conexión de datos'));
        }
      });

      this.peer.on('error', (err) => {
        console.error('PeerJS error:', err);
        this.onError?.(err);
        reject(err);
      });

      this.peer.on('disconnected', () => {
        if (this.connected) {
          this.connected = false;
          this.onConnectionLost?.();
        }
      });
    });
  }

  _setupDataConnection(conn) {
    conn.on('open', () => {
      this.connected = true;
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
