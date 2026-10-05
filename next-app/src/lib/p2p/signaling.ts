export class SignalingService {
  private _socket: WebSocket | null = null;
  private _isConnected = false;
  private _isDisposed = false;
  private _packetId = 1;
  private _keepAliveTimer: NodeJS.Timeout | null = null;
  private _listeners: ((msg: Record<string, unknown>) => void)[] = [];

  readonly clientId: string;
  readonly roomCode: string;

  private readonly _brokers = [
    'wss://broker.hivemq.com:8884/mqtt',
    'wss://broker.emqx.io:8084/mqtt',
  ];

  constructor(roomCode: string, clientId?: string) {
    this.roomCode = roomCode;
    this.clientId = clientId ?? `next_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
  }

  private get _topic(): string {
    return `sudoku/room/${this.roomCode}`;
  }

  onMessage(callback: (msg: Record<string, unknown>) => void) {
    this._listeners.push(callback);
    return () => {
      this._listeners = this._listeners.filter((cb) => cb !== callback);
    };
  }

  async connect(): Promise<boolean> {
    for (const broker of this._brokers) {
      if (this._isDisposed) return false;
      try {
        const ok = await this._connectToBroker(broker);
        if (ok) return true;
      } catch (err) {
        console.warn(`[Signaling] Failed to connect to ${broker}:`, err);
      }
    }
    return false;
  }

  private _connectToBroker(brokerUrl: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const ws = new WebSocket(brokerUrl, 'mqtt');
        ws.binaryType = 'arraybuffer';
        this._socket = ws;

        const timeout = setTimeout(() => {
          if (!this._isConnected) {
            try { ws.close(); } catch {}
            resolve(false);
          }
        }, 8000);

        ws.onopen = () => {
          ws.send(this._buildConnectPacket(this.clientId));
        };

        ws.onmessage = (event) => {
          const bytes = new Uint8Array(event.data as ArrayBuffer);
          if (bytes.length === 0) return;
          const headerType = bytes[0] & 0xf0;

          // CONNACK (0x20)
          if (headerType === 0x20) {
            this._isConnected = true;
            clearTimeout(timeout);
            ws.send(this._buildSubscribePacket(this._packetId++, this._topic));
            this._startKeepAlive();
            resolve(true);
          } else if (headerType === 0x30) {
            // PUBLISH
            this._handleIncomingPublish(bytes);
          }
        };

        ws.onerror = () => {
          this._isConnected = false;
          resolve(false);
        };

        ws.onclose = () => {
          this._isConnected = false;
        };
      } catch {
        resolve(false);
      }
    });
  }

  send(message: Record<string, unknown>) {
    if (!this._isConnected || !this._socket || this._socket.readyState !== WebSocket.OPEN) {
      return;
    }
    try {
      const payload = JSON.stringify({
        ...message,
        _sender: this.clientId,
        _time: Date.now(),
      });
      const packet = this._buildPublishPacket(this._topic, payload);
      this._socket.send(packet);
    } catch (e) {
      console.error('[Signaling] Send error:', e);
    }
  }

  private _handleIncomingPublish(bytes: Uint8Array) {
    try {
      let offset = 1;
      let digit: number;
      do {
        if (offset >= bytes.length) return;
        digit = bytes[offset++];
      } while ((digit & 0x80) !== 0);

      if (offset + 2 > bytes.length) return;
      const topicLen = (bytes[offset] << 8) | bytes[offset + 1];
      offset += 2;

      // Skip topic string
      offset += topicLen;

      if (offset >= bytes.length) return;
      const payloadBytes = bytes.slice(offset);
      const text = new TextDecoder('utf-8').decode(payloadBytes);
      const data = JSON.parse(text) as Record<string, unknown>;

      // Ignore echoes from self
      if (data._sender === this.clientId) return;

      for (const listener of this._listeners) {
        listener(data);
      }
    } catch {}
  }

  private _startKeepAlive() {
    this._stopKeepAlive();
    this._keepAliveTimer = setInterval(() => {
      if (this._isConnected && this._socket?.readyState === WebSocket.OPEN) {
        this._socket.send(new Uint8Array([0xc0, 0x00])); // PINGREQ
      }
    }, 15000);
  }

  private _stopKeepAlive() {
    if (this._keepAliveTimer) {
      clearInterval(this._keepAliveTimer);
      this._keepAliveTimer = null;
    }
  }

  dispose() {
    this._isDisposed = true;
    this._stopKeepAlive();
    if (this._socket) {
      try {
        this._socket.close();
      } catch {}
      this._socket = null;
    }
    this._listeners = [];
  }

  // --- MQTT Packet Encoders ---

  private _buildConnectPacket(clientId: string): Uint8Array {
    const protocolName = [0x00, 0x04, 0x4d, 0x51, 0x54, 0x54]; // "MQTT"
    const protocolLevel = 0x04; // 3.1.1
    const connectFlags = 0x02; // Clean Session
    const keepAlive = [0x00, 0x3c]; // 60 seconds

    const idBytes = new TextEncoder().encode(clientId);
    const idLen = [idBytes.length >> 8, idBytes.length & 0xff];

    const varHeader = [...protocolName, protocolLevel, connectFlags, ...keepAlive];
    const payload = [...idLen, ...idBytes];
    const remaining = [...varHeader, ...payload];

    return new Uint8Array([0x10, ...this._encodeRemainingLength(remaining.length), ...remaining]);
  }

  private _buildSubscribePacket(packetId: number, topic: string): Uint8Array {
    const topicBytes = new TextEncoder().encode(topic);
    const remaining = [
      packetId >> 8,
      packetId & 0xff,
      topicBytes.length >> 8,
      topicBytes.length & 0xff,
      ...topicBytes,
      0x00, // QoS 0
    ];
    return new Uint8Array([0x82, ...this._encodeRemainingLength(remaining.length), ...remaining]);
  }

  private _buildPublishPacket(topic: string, message: string): Uint8Array {
    const topicBytes = new TextEncoder().encode(topic);
    const msgBytes = new TextEncoder().encode(message);
    const remaining = [
      topicBytes.length >> 8,
      topicBytes.length & 0xff,
      ...topicBytes,
      ...msgBytes,
    ];
    return new Uint8Array([0x30, ...this._encodeRemainingLength(remaining.length), ...remaining]);
  }

  private _encodeRemainingLength(length: number): number[] {
    const result: number[] = [];
    let x = length;
    do {
      let encodedByte = x % 128;
      x = Math.floor(x / 128);
      if (x > 0) {
        encodedByte |= 128;
      }
      result.push(encodedByte);
    } while (x > 0);
    return result;
  }
}
