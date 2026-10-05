import { PlayerProgress, SudokuPuzzle, MistakeRule } from '../types';
import { SignalingService } from './signaling';
import { SudokuGenerator } from '../sudoku/engine';

export const PLAYER_COLORS = [
  '#4361EE', // Blue (Host)
  '#F72585', // Magenta
  '#4CC9F0', // Cyan
  '#7209B7', // Purple
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Violet
];

interface PeerSession {
  peerId: string;
  playerName: string;
  colorIndex: number;
  pc: RTCPeerConnection;
  dc?: RTCDataChannel;
  isConnected: boolean;
  latencyMs: number;
}

export type MessageListener = (data: Record<string, unknown>) => void;
export type PlayersChangeListener = (players: PlayerProgress[]) => void;

export class P2PRoomService {
  private static readonly RTC_CONFIG: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ],
  };

  isHost = false;
  roomCode = '';
  localPlayerId = 'host';
  localPlayerName = 'Host';
  puzzle: SudokuPuzzle | null = null;
  mistakeRule: MistakeRule = 'standard';
  isGameStarted = false;

  private _signaling: SignalingService | null = null;
  private _peerSessions = new Map<string, PeerSession>();
  private _players = new Map<string, PlayerProgress>();
  private _guestPc: RTCPeerConnection | null = null;
  private _guestDc: RTCDataChannel | null = null;
  private _pingTimer: NodeJS.Timeout | null = null;

  private _msgListeners: MessageListener[] = [];
  private _playersListeners: PlayersChangeListener[] = [];
  private _stateListeners: (() => void)[] = [];

  // Public callback hooks
  onPlayersChanged?: (players: PlayerProgress[]) => void;
  onGameStarted?: (puzzle: SudokuPuzzle, rule: MistakeRule) => void;
  onEmojiReceived?: (emoji: string, senderName: string) => void;
  onLatencyUpdated?: (ping: number) => void;

  static generate6DigitCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  get playersList(): PlayerProgress[] {
    return Array.from(this._players.values());
  }

  get connectedCount(): number {
    return this.isHost
      ? Array.from(this._peerSessions.values()).filter((p) => p.isConnected).length + 1
      : this._players.size;
  }

  onMessage(cb: MessageListener) {
    this._msgListeners.push(cb);
    return () => {
      this._msgListeners = this._msgListeners.filter((l) => l !== cb);
    };
  }

  onPlayersChange(cb: PlayersChangeListener) {
    this._playersListeners.push(cb);
    return () => {
      this._playersListeners = this._playersListeners.filter((l) => l !== cb);
    };
  }

  onStateChange(cb: () => void) {
    this._stateListeners.push(cb);
    return () => {
      this._stateListeners = this._stateListeners.filter((l) => l !== cb);
    };
  }

  private _notify() {
    for (const cb of this._stateListeners) cb();
    const list = this.playersList;
    for (const cb of this._playersListeners) cb(list);
    this.onPlayersChanged?.(list);
  }

  // ---------------------------------------------------------------------------
  // HOST INITIALIZATION
  // ---------------------------------------------------------------------------

  initializeHost(params: {
    hostName: string;
    puzzle: SudokuPuzzle;
    mistakeRule?: MistakeRule;
    roomCode?: string;
  }) {
    this.isHost = true;
    this.localPlayerId = 'host';
    this.localPlayerName = params.hostName;
    this.puzzle = params.puzzle;
    this.mistakeRule = params.mistakeRule ?? 'standard';
    this.roomCode = params.roomCode ?? P2PRoomService.generate6DigitCode();
    this.isGameStarted = false;

    this._peerSessions.clear();
    this._players.clear();

    const givensCount = params.puzzle.givens.filter((v) => v !== 0).length;
    this._players.set(this.localPlayerId, {
      id: this.localPlayerId,
      name: params.hostName,
      colorIndex: 0,
      isHost: true,
      targetToFill: 81 - givensCount,
      filledCount: 0,
      progressPercent: 0,
      score: 0,
      lives: this.mistakeRule === 'hardcore' ? 1 : this.mistakeRule === 'casual' ? 999 : 3,
      mistakes: 0,
      isCompleted: false,
      isDefeated: false,
      latencyMs: 0,
      rank: 1,
    });

    this._setupHostSignaling();
    this._notify();
  }

  private _setupHostSignaling() {
    this._signaling?.dispose();
    this._signaling = new SignalingService(this.roomCode, 'host');
    this._signaling.connect();

    this._signaling.onMessage(async (msg) => {
      const type = msg.type as string;
      if (type === 'join_request') {
        const guestId = msg.guestId as string;
        const guestName = msg.guestName as string;
        try {
          const offerCode = await this._createHostInviteForGuest(guestId, guestName);
          this._signaling?.send({
            type: 'offer',
            targetGuestId: guestId,
            offer: offerCode,
          });
        } catch (e) {
          console.error('[Host] Offer creation failed:', e);
        }
      } else if (type === 'answer') {
        const guestId = msg.guestId as string;
        const answerJson = msg.answer as string;
        if (guestId && answerJson) {
          const session = this._peerSessions.get(guestId);
          if (session && session.pc.signalingState !== 'stable') {
            try {
              const answer = JSON.parse(answerJson) as RTCSessionDescriptionInit;
              await session.pc.setRemoteDescription(new RTCSessionDescription(answer));
            } catch (e) {
              console.error('[Host] Failed to set answer:', e);
            }
          }
        }
      }
    });
  }

  private async _createHostInviteForGuest(guestId: string, guestName: string): Promise<string> {
    const pc = new RTCPeerConnection(P2PRoomService.RTC_CONFIG);
    const dc = pc.createDataChannel(`sudoku_${guestId}`, { ordered: true });

    const colorIndex = (this._peerSessions.size + 1) % PLAYER_COLORS.length;
    const session: PeerSession = {
      peerId: guestId,
      playerName: guestName || `Player ${this._peerSessions.size + 1}`,
      colorIndex,
      pc,
      dc,
      isConnected: false,
      latencyMs: 0,
    };
    this._peerSessions.set(guestId, session);

    const candidates: RTCIceCandidateInit[] = [];
    pc.onicecandidate = (e) => {
      if (e.candidate) candidates.push(e.candidate.toJSON());
    };

    this._setupHostDataChannel(session);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Wait for ICE gathering
    await new Promise<void>((resolve) => {
      if (pc.iceGatheringState === 'complete') resolve();
      const check = () => {
        if (pc.iceGatheringState === 'complete') {
          pc.removeEventListener('icegatheringstatechange', check);
          resolve();
        }
      };
      pc.addEventListener('icegatheringstatechange', check);
      setTimeout(resolve, 2000);
    });

    return JSON.stringify({
      sdp: pc.localDescription?.sdp,
      type: pc.localDescription?.type,
      candidates,
      puzzle: this.puzzle,
      hostName: this.localPlayerName,
      mistakeRule: this.mistakeRule,
    });
  }

  private _setupHostDataChannel(session: PeerSession) {
    const { dc, peerId } = session;
    if (!dc) return;

    dc.onopen = () => {
      session.isConnected = true;
      const givens = this.puzzle?.givens.filter((v) => v !== 0).length ?? 0;

      this._players.set(peerId, {
        id: peerId,
        name: session.playerName,
        colorIndex: session.colorIndex,
        targetToFill: 81 - givens,
        filledCount: 0,
        progressPercent: 0,
        score: 0,
        lives: this.mistakeRule === 'hardcore' ? 1 : this.mistakeRule === 'casual' ? 999 : 3,
        mistakes: 0,
        isCompleted: false,
        isDefeated: false,
        latencyMs: 0,
        rank: this._players.size + 1,
      });

      this._notify();

      // Welcome packet
      dc.send(
        JSON.stringify({
          type: 'welcome',
          assignedId: peerId,
          assignedColorIndex: session.colorIndex,
          players: Array.from(this._players.values()),
          isGameStarted: this.isGameStarted,
          mistakeRule: this.mistakeRule,
          puzzle: this.puzzle,
        })
      );

      // Tell other peers
      this._broadcastToGuests(
        {
          type: 'player_joined',
          player: this._players.get(peerId),
        },
        peerId
      );

      this._startPingTicker();
    };

    dc.onclose = () => {
      session.isConnected = false;
      this._peerSessions.delete(peerId);
      this._players.delete(peerId);
      this._notify();
      this._broadcastToGuests({ type: 'player_left', playerId: peerId });
    };

    dc.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as Record<string, unknown>;
        this._handleIncomingMessage(data, peerId);
      } catch {}
    };
  }

  // ---------------------------------------------------------------------------
  // GUEST INITIALIZATION
  // ---------------------------------------------------------------------------

  async joinWith6DigitCode(roomCode: string, guestName: string): Promise<void> {
    this.isHost = false;
    this.roomCode = roomCode.trim();
    this.localPlayerId = `guest_${Date.now()}_${Math.floor(Math.random() * 999)}`;
    this.localPlayerName = guestName;
    this.isGameStarted = false;

    this._signaling?.dispose();
    this._signaling = new SignalingService(this.roomCode, this.localPlayerId);
    const connected = await this._signaling.connect();
    if (!connected) throw new Error('Could not connect to signaling network.');

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Room not found or host not in lobby.'));
      }, 10000);

      this._signaling?.onMessage(async (msg) => {
        if (msg.type === 'offer' && msg.targetGuestId === this.localPlayerId) {
          clearTimeout(timeout);
          try {
            await this._handleHostOffer(msg.offer as string);
            resolve();
          } catch (err) {
            reject(err);
          }
        }
      });

      // Request to join
      this._signaling?.send({
        type: 'join_request',
        guestId: this.localPlayerId,
        guestName,
      });
    });
  }

  private async _handleHostOffer(offerPayloadStr: string) {
    const payload = JSON.parse(offerPayloadStr);
    this.puzzle = payload.puzzle;
    this.mistakeRule = payload.mistakeRule ?? 'standard';

    const pc = new RTCPeerConnection(P2PRoomService.RTC_CONFIG);
    this._guestPc = pc;

    pc.ondatachannel = (e) => {
      this._guestDc = e.channel;
      this._setupGuestDataChannel(e.channel);
    };

    await pc.setRemoteDescription(
      new RTCSessionDescription({ type: payload.type, sdp: payload.sdp })
    );

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    // Wait for ICE gathering
    await new Promise<void>((resolve) => {
      if (pc.iceGatheringState === 'complete') resolve();
      const check = () => {
        if (pc.iceGatheringState === 'complete') {
          pc.removeEventListener('icegatheringstatechange', check);
          resolve();
        }
      };
      pc.addEventListener('icegatheringstatechange', check);
      setTimeout(resolve, 2000);
    });

    this._signaling?.send({
      type: 'answer',
      guestId: this.localPlayerId,
      answer: JSON.stringify(pc.localDescription),
    });
  }

  private _setupGuestDataChannel(dc: RTCDataChannel) {
    dc.onopen = () => {
      dc.send(
        JSON.stringify({
          type: 'set_name',
          playerId: this.localPlayerId,
          name: this.localPlayerName,
        })
      );
      this._startPingTicker();
      this._notify();
    };

    dc.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as Record<string, unknown>;
        this._handleIncomingMessage(data, 'host');
      } catch {}
    };
  }

  // ---------------------------------------------------------------------------
  // MESSAGE HANDLING & BROADCASTING
  // ---------------------------------------------------------------------------

  private _handleIncomingMessage(data: Record<string, unknown>, fromPeerId: string) {
    const type = data.type as string;
    const senderId = (data.playerId as string) || fromPeerId;

    if (type === 'welcome') {
      this.localPlayerId = (data.assignedId as string) || this.localPlayerId;
      if (data.mistakeRule) this.mistakeRule = data.mistakeRule as MistakeRule;
      if (data.puzzle) this.puzzle = data.puzzle as SudokuPuzzle;

      const incoming = (data.players as PlayerProgress[]) || [];
      for (const p of incoming) {
        this._players.set(p.id, p);
      }
      if (data.isGameStarted) this.isGameStarted = true;
      this._notify();
    } else if (type === 'start_game') {
      this.isGameStarted = true;
      if (data.mistakeRule) this.mistakeRule = data.mistakeRule as MistakeRule;
      if (data.puzzle) this.puzzle = data.puzzle as SudokuPuzzle;
      this._notify();
      if (this.puzzle) {
        this.onGameStarted?.(this.puzzle, this.mistakeRule);
      }
    } else if (type === 'progress') {
      if (this._players.has(senderId)) {
        const current = this._players.get(senderId)!;
        this._players.set(senderId, {
          ...current,
          filledCount: (data.filledCount as number) ?? current.filledCount,
          progressPercent: (data.progressPercent as number) ?? current.progressPercent,
          score: (data.score as number) ?? current.score,
          lives: (data.lives as number) ?? current.lives,
          mistakes: (data.mistakes as number) ?? current.mistakes,
          isCompleted: (data.isCompleted as boolean) ?? current.isCompleted,
          isDefeated: (data.isDefeated as boolean) ?? current.isDefeated,
        });
        this._updateRanks();
        this._notify();
      }
      if (this.isHost) {
        this._broadcastToGuests(data, senderId);
      }
    } else if (type === 'emoji') {
      const senderObj = this._players.get(senderId);
      const senderName = senderObj?.name || 'Player';
      if (senderObj) {
        this._players.set(senderId, {
          ...senderObj,
          recentEmoji: data.emoji as string,
        });
        this._notify();
      }
      this.onEmojiReceived?.(data.emoji as string, senderName);
      if (this.isHost) {
        this._broadcastToGuests(data, senderId);
      }
    } else if (type === 'player_joined') {
      const p = data.player as PlayerProgress;
      if (p) {
        this._players.set(p.id, p);
        this._notify();
      }
    } else if (type === 'player_left') {
      const pid = data.playerId as string;
      if (pid) {
        this._players.delete(pid);
        this._notify();
      }
    } else if (type === 'ping') {
      const targetDc = this.isHost
        ? this._peerSessions.get(senderId)?.dc
        : this._guestDc;
      targetDc?.send(JSON.stringify({ type: 'pong', time: data.time }));
      return;
    } else if (type === 'pong') {
      const sentTime = data.time as number;
      if (sentTime > 0) {
        const latency = Date.now() - sentTime;
        this.onLatencyUpdated?.(latency);
        if (this._players.has(senderId)) {
          const current = this._players.get(senderId)!;
          this._players.set(senderId, { ...current, latencyMs: latency });
          this._notify();
        }
      }
      return;
    }

    for (const listener of this._msgListeners) {
      listener(data);
    }
  }

  private _broadcastToGuests(data: Record<string, unknown>, excludePeerId?: string) {
    const raw = JSON.stringify(data);
    for (const [id, session] of this._peerSessions) {
      if (id !== excludePeerId && session.isConnected && session.dc?.readyState === 'open') {
        session.dc.send(raw);
      }
    }
  }

  startMatch() {
    if (!this.isHost) return;
    this.isGameStarted = true;
    this._broadcastToGuests({
      type: 'start_game',
      mistakeRule: this.mistakeRule,
    });
    this._notify();
  }

  sendProgressUpdate(update: {
    filledCount: number;
    progressPercent: number;
    score: number;
    lives: number;
    mistakes: number;
    isCompleted: boolean;
    isDefeated: boolean;
  }) {
    if (this._players.has(this.localPlayerId)) {
      const current = this._players.get(this.localPlayerId)!;
      this._players.set(this.localPlayerId, {
        ...current,
        ...update,
      });
      this._updateRanks();
      this._notify();
    }

    const payload = {
      type: 'progress',
      playerId: this.localPlayerId,
      ...update,
    };

    if (this.isHost) {
      this._broadcastToGuests(payload);
    } else if (this._guestDc?.readyState === 'open') {
      this._guestDc.send(JSON.stringify(payload));
    }
  }

  sendEmojiReaction(emoji: string) {
    if (this._players.has(this.localPlayerId)) {
      const current = this._players.get(this.localPlayerId)!;
      this._players.set(this.localPlayerId, { ...current, recentEmoji: emoji });
      this._notify();
    }

    const payload = {
      type: 'emoji',
      playerId: this.localPlayerId,
      emoji,
    };

    if (this.isHost) {
      this._broadcastToGuests(payload);
    } else if (this._guestDc?.readyState === 'open') {
      this._guestDc.send(JSON.stringify(payload));
    }
  }

  private _updateRanks() {
    const list = Array.from(this._players.values());
    list.sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) return a.isCompleted ? -1 : 1;
      if (b.progressPercent !== a.progressPercent) return b.progressPercent - a.progressPercent;
      return b.score - a.score;
    });

    list.forEach((p, idx) => {
      const updated = { ...p, rank: idx + 1 };
      this._players.set(p.id, updated);
    });
  }

  private _startPingTicker() {
    if (this._pingTimer) return;
    this._pingTimer = setInterval(() => {
      const now = Date.now();
      const pingMsg = JSON.stringify({
        type: 'ping',
        playerId: this.localPlayerId,
        time: now,
      });

      if (this.isHost) {
        for (const session of this._peerSessions.values()) {
          if (session.isConnected && session.dc?.readyState === 'open') {
            session.dc.send(pingMsg);
          }
        }
      } else if (this._guestDc?.readyState === 'open') {
        this._guestDc.send(pingMsg);
      }
    }, 4000);
  }

  dispose() {
    if (this._pingTimer) {
      clearInterval(this._pingTimer);
      this._pingTimer = null;
    }
    this._signaling?.dispose();
    this._signaling = null;

    for (const session of this._peerSessions.values()) {
      try { session.dc?.close(); } catch {}
      try { session.pc.close(); } catch {}
    }
    this._peerSessions.clear();

    try { this._guestDc?.close(); } catch {}
    try { this._guestPc?.close(); } catch {}
    this._guestDc = null;
    this._guestPc = null;

    this._msgListeners = [];
    this._playersListeners = [];
    this._stateListeners = [];
  }

  // ---------------------------------------------------------------------------
  // CONVENIENCE ADAPTERS FOR UI
  // ---------------------------------------------------------------------------

  getMyPeerId(): string {
    return this.localPlayerId;
  }

  async initializeRoom(code: string, nickname: string, isHostRole: boolean): Promise<void> {
    if (isHostRole) {
      const p = this.puzzle ?? SudokuGenerator.generate('medium');
      this.initializeHost({
        hostName: nickname,
        puzzle: p,
        mistakeRule: this.mistakeRule || 'standard',
        roomCode: code,
      });
    } else {
      await this.joinWith6DigitCode(code, nickname);
    }
  }

  startGame(puzzle: SudokuPuzzle, mistakeRule: MistakeRule) {
    this.puzzle = puzzle;
    this.mistakeRule = mistakeRule;
    if (this.isHost) {
      this.isGameStarted = true;
      this._broadcastToGuests({
        type: 'start_game',
        puzzle,
        mistakeRule,
      });
      this._notify();
    }
  }

  broadcastProgress(progress: number, mistakes: number, isKnockedOut: boolean, isFinished: boolean) {
    this.sendProgressUpdate({
      filledCount: Math.round(progress * 81),
      progressPercent: progress,
      score: Math.round(progress * 1000),
      lives: Math.max(0, 3 - mistakes),
      mistakes,
      isCompleted: isFinished,
      isDefeated: isKnockedOut,
    });
  }

  broadcastEmoji(emoji: string) {
    this.sendEmojiReaction(emoji);
  }

  disconnect() {
    this.dispose();
  }
}

export const roomService = new P2PRoomService();


