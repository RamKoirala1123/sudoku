import { PlayerProgress, SudokuPuzzle, MistakeRule, Difficulty } from '../types';
import { SignalingService } from './signaling';
import { SudokuGenerator } from '../sudoku/engine';

export const PLAYER_COLORS = [
  '#5B6CFF', // Indigo/Blue (Host)
  '#3DDC97', // Emerald Green
  '#FF9F43', // Coral Orange
  '#FF5D6C', // Rose Pink
  '#A358DF', // Purple
  '#00CFDE', // Teal
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
  isMatchOver = false;
  winner: PlayerProgress | null = null;
  allPlayersDefeated = false;

  private _signaling: SignalingService | null = null;
  private _peerSessions = new Map<string, PeerSession>();
  private _cachedOffers = new Map<string, string>();
  private _pendingOfferPromises = new Map<string, Promise<string>>();
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
  onSettingsChanged?: (difficulty: Difficulty, rule: MistakeRule) => void;
  onMatchEnded?: (winner: PlayerProgress | null, standings: PlayerProgress[], allDefeated: boolean) => void;
  onReturnToLobby?: () => void;
  onEmojiReceived?: (emoji: string, senderName: string) => void;
  onLatencyUpdated?: (ping: number) => void;

  static generate6DigitCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  get playersList(): PlayerProgress[] {
    return Array.from(this._players.values());
  }

  get connectedCount(): number {
    return this._players.size;
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

  async initializeHost(params: {
    hostName: string;
    puzzle: SudokuPuzzle;
    mistakeRule?: MistakeRule;
    roomCode?: string;
  }): Promise<void> {
    this.isHost = true;
    this.localPlayerId = 'host';
    this.localPlayerName = params.hostName;
    this.puzzle = params.puzzle;
    this.mistakeRule = params.mistakeRule ?? 'standard';
    this.roomCode = params.roomCode ?? P2PRoomService.generate6DigitCode();
    this.isGameStarted = false;
    this.isMatchOver = false;
    this.winner = null;
    this.allPlayersDefeated = false;

    this._peerSessions.clear();
    this._cachedOffers.clear();
    this._pendingOfferPromises.clear();
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

    const connected = await this._setupHostSignaling();
    if (!connected) {
      throw new Error('Could not connect to signaling network.');
    }
    this._notify();
  }

  private async _setupHostSignaling(): Promise<boolean> {
    this._signaling?.dispose();
    const hostClientId = `h_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    this._signaling = new SignalingService(this.roomCode, hostClientId);
    const connected = await this._signaling.connect();
    if (!connected) return false;

    this._signaling.onMessage(async (msg) => {
      const type = msg.type as string;

      if (type === 'join_request') {
        const guestId = msg.guestId as string;
        const guestName = msg.guestName as string;
        if (!guestId) return;

        // 1. Immediately register guest in Host's player list so the lobby displays them right away
        if (!this._players.has(guestId)) {
          const colorIndex = this._players.size % PLAYER_COLORS.length;
          const givens = this.puzzle?.givens.filter((v) => v !== 0).length ?? 0;
          this._players.set(guestId, {
            id: guestId,
            name: guestName || `Player ${this._players.size + 1}`,
            colorIndex,
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
        }

        // 2. Broadcast lobby sync so guest gets the current player roster immediately
        this._signaling?.send({
          type: 'lobby_sync',
          players: Array.from(this._players.values()),
          mistakeRule: this.mistakeRule,
          difficulty: this.puzzle?.difficulty,
        });

        // 3. Generate or retrieve existing offer
        try {
          let offerCode = this._cachedOffers.get(guestId);
          if (!offerCode) {
            if (this._pendingOfferPromises.has(guestId)) {
              offerCode = await this._pendingOfferPromises.get(guestId)!;
            } else {
              const promise = this._createHostInviteForGuest(guestId, guestName);
              this._pendingOfferPromises.set(guestId, promise);
              offerCode = await promise;
              this._cachedOffers.set(guestId, offerCode);
              this._pendingOfferPromises.delete(guestId);
            }
          }

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
              const answerObj = JSON.parse(answerJson) as {
                type: RTCSdpType;
                sdp: string;
                candidates?: RTCIceCandidateInit[];
              };
              await session.pc.setRemoteDescription(
                new RTCSessionDescription({
                  type: answerObj.type,
                  sdp: answerObj.sdp,
                })
              );

              // Add guest's ICE candidates
              if (Array.isArray(answerObj.candidates)) {
                for (const cand of answerObj.candidates) {
                  try {
                    await session.pc.addIceCandidate(new RTCIceCandidate(cand));
                  } catch (e) {
                    console.warn('[Host] Failed to add guest ICE candidate:', e);
                  }
                }
              }
            } catch (e) {
              console.error('[Host] Failed to set answer:', e);
            }
          }
        }
      } else if (type === 'ice_candidate') {
        const targetId = msg.targetId as string;
        const senderId = msg.senderId as string;
        const cand = msg.candidate as RTCIceCandidateInit;
        if (targetId === 'host' && senderId && cand) {
          const session = this._peerSessions.get(senderId);
          if (session && session.pc.remoteDescription) {
            try {
              await session.pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch (e) {
              console.warn('[Host] Failed to add trickle candidate:', e);
            }
          }
        }
      } else if (type === 'progress') {
        const senderId = msg.playerId as string;
        if (senderId && this._players.has(senderId)) {
          const current = this._players.get(senderId)!;
          this._players.set(senderId, {
            ...current,
            filledCount: (msg.filledCount as number) ?? current.filledCount,
            progressPercent: (msg.progressPercent as number) ?? current.progressPercent,
            score: (msg.score as number) ?? current.score,
            lives: (msg.lives as number) ?? current.lives,
            mistakes: (msg.mistakes as number) ?? current.mistakes,
            isCompleted: (msg.isCompleted as boolean) ?? current.isCompleted,
            isFinished: (msg.isCompleted as boolean) ?? current.isFinished,
            isDefeated: (msg.isDefeated as boolean) ?? current.isDefeated,
            timeFormatted: (msg.timeFormatted as string) ?? current.timeFormatted,
            accuracyPercent: (msg.accuracyPercent as number) ?? current.accuracyPercent,
            cellsPerMinute: (msg.cellsPerMinute as number) ?? current.cellsPerMinute,
          });
          this._updateRanks();
          this._notify();
          this._checkMatchOver();
        }
      } else if (type === 'emoji') {
        const senderId = msg.playerId as string;
        const emoji = msg.emoji as string;
        const senderName = (msg.senderName as string) || this._players.get(senderId)?.name || 'Player';
        if (senderId && this._players.has(senderId)) {
          const current = this._players.get(senderId)!;
          this._players.set(senderId, { ...current, recentEmoji: emoji });
          this._notify();
        }
        if (emoji && senderId !== this.localPlayerId) {
          this.onEmojiReceived?.(emoji, senderName);
        }
      } else if (type === 'player_left') {
        const pid = msg.playerId as string;
        if (pid) {
          this._peerSessions.delete(pid);
          this._cachedOffers.delete(pid);
          this._players.delete(pid);
          this._notify();
          this._checkMatchOver();
        }
      }
    });

    return true;
  }

  private async _createHostInviteForGuest(guestId: string, guestName: string): Promise<string> {
    const pc = new RTCPeerConnection(P2PRoomService.RTC_CONFIG);
    const dc = pc.createDataChannel(`sudoku_${guestId}`, { ordered: true });

    const colorIndex = this._players.size % PLAYER_COLORS.length;
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
      if (e.candidate) {
        candidates.push(e.candidate.toJSON());
        this._signaling?.send({
          type: 'ice_candidate',
          targetId: guestId,
          senderId: 'host',
          candidate: e.candidate.toJSON(),
        });
      }
    };

    this._setupHostDataChannel(session);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Wait for ICE gathering (up to 1500ms)
    await new Promise<void>((resolve) => {
      if (pc.iceGatheringState === 'complete') {
        resolve();
        return;
      }
      const check = () => {
        if (pc.iceGatheringState === 'complete') {
          pc.removeEventListener('icegatheringstatechange', check);
          resolve();
        }
      };
      pc.addEventListener('icegatheringstatechange', check);
      setTimeout(resolve, 1500);
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

      const existing = this._players.get(peerId);
      this._players.set(peerId, {
        id: peerId,
        name: session.playerName,
        colorIndex: session.colorIndex,
        targetToFill: 81 - givens,
        filledCount: existing?.filledCount ?? 0,
        progressPercent: existing?.progressPercent ?? 0,
        score: existing?.score ?? 0,
        lives: this.mistakeRule === 'hardcore' ? 1 : this.mistakeRule === 'casual' ? 999 : 3,
        mistakes: existing?.mistakes ?? 0,
        isCompleted: existing?.isCompleted ?? false,
        isDefeated: existing?.isDefeated ?? false,
        latencyMs: 0,
        rank: existing?.rank ?? (this._players.size + 1),
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

      // Sync lobby via signaling as well
      this._signaling?.send({
        type: 'lobby_sync',
        players: Array.from(this._players.values()),
        mistakeRule: this.mistakeRule,
        difficulty: this.puzzle?.difficulty,
      });

      this._startPingTicker();
    };

    dc.onclose = () => {
      session.isConnected = false;
      this._peerSessions.delete(peerId);
      this._cachedOffers.delete(peerId);
      this._players.delete(peerId);
      this._notify();
      this._broadcastToGuests({ type: 'player_left', playerId: peerId });
      this._signaling?.send({ type: 'player_left', playerId: peerId });
      this._checkMatchOver();
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
    this.localPlayerId = `guest_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    this.localPlayerName = guestName;
    this.isGameStarted = false;
    this.isMatchOver = false;
    this.winner = null;
    this.allPlayersDefeated = false;

    this._signaling?.dispose();
    const guestClientId = `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    this._signaling = new SignalingService(this.roomCode, guestClientId);
    const connected = await this._signaling.connect();
    if (!connected) throw new Error('Could not connect to signaling network.');

    return new Promise((resolve, reject) => {
      let retryTimer: NodeJS.Timeout | null = null;
      let isResolved = false;

      const cleanup = () => {
        clearTimeout(timeout);
        if (retryTimer) {
          clearInterval(retryTimer);
          retryTimer = null;
        }
      };

      const timeout = setTimeout(() => {
        cleanup();
        if (!isResolved) {
          if (this._players.size >= 1) {
            isResolved = true;
            resolve();
          } else {
            reject(new Error('Room not found or host not in lobby.'));
          }
        }
      }, 15000);

      this._signaling?.onMessage(async (msg) => {
        const type = msg.type as string;

        if (type === 'offer' && msg.targetGuestId === this.localPlayerId) {
          cleanup();
          try {
            await this._handleHostOffer(msg.offer as string);
            if (!isResolved) {
              isResolved = true;
              resolve();
            }
          } catch (err) {
            if (!isResolved) {
              isResolved = true;
              reject(err);
            }
          }
        } else if (type === 'ice_candidate') {
          const targetId = msg.targetId as string;
          const cand = msg.candidate as RTCIceCandidateInit;
          if (targetId === this.localPlayerId && cand && this._guestPc?.remoteDescription) {
            try {
              await this._guestPc.addIceCandidate(new RTCIceCandidate(cand));
            } catch (e) {
              console.warn('[Guest] Failed to add trickle candidate:', e);
            }
          }
        } else if (type === 'lobby_sync') {
          const incoming = (msg.players as PlayerProgress[]) || [];
          for (const p of incoming) {
            this._players.set(p.id, p);
          }
          if (msg.mistakeRule) this.mistakeRule = msg.mistakeRule as MistakeRule;
          this._notify();
        } else if (type === 'settings_changed') {
          if (msg.mistakeRule) this.mistakeRule = msg.mistakeRule as MistakeRule;
          if (msg.puzzle) {
            this.puzzle = msg.puzzle as SudokuPuzzle;
            this.onSettingsChanged?.(this.puzzle.difficulty, this.mistakeRule);
          }
          this._notify();
        } else if (type === 'start_game') {
          if (!this.isGameStarted) {
            this.isGameStarted = true;
            this.isMatchOver = false;
            this.winner = null;
            this.allPlayersDefeated = false;
            if (msg.puzzle) this.puzzle = msg.puzzle as SudokuPuzzle;
            if (msg.mistakeRule) this.mistakeRule = msg.mistakeRule as MistakeRule;
            this._notify();
            if (this.puzzle) {
              this.onGameStarted?.(this.puzzle, this.mistakeRule);
            }
          }
        } else if (type === 'rematch_start') {
          if (msg.puzzle) this.puzzle = msg.puzzle as SudokuPuzzle;
          if (msg.mistakeRule) this.mistakeRule = msg.mistakeRule as MistakeRule;
          this.resetMatchState();
          this.isGameStarted = true;
          this._notify();
          if (this.puzzle) {
            this.onGameStarted?.(this.puzzle, this.mistakeRule);
          }
        } else if (type === 'rematch_lobby') {
          if (msg.mistakeRule) this.mistakeRule = msg.mistakeRule as MistakeRule;
          this.resetMatchState();
          this._notify();
          this.onReturnToLobby?.();
        } else if (type === 'progress') {
          const senderId = msg.playerId as string;
          if (senderId && this._players.has(senderId)) {
            const current = this._players.get(senderId)!;
            this._players.set(senderId, {
              ...current,
              filledCount: (msg.filledCount as number) ?? current.filledCount,
              progressPercent: (msg.progressPercent as number) ?? current.progressPercent,
              score: (msg.score as number) ?? current.score,
              lives: (msg.lives as number) ?? current.lives,
              mistakes: (msg.mistakes as number) ?? current.mistakes,
              isCompleted: (msg.isCompleted as boolean) ?? current.isCompleted,
              isFinished: (msg.isCompleted as boolean) ?? current.isFinished,
              isDefeated: (msg.isDefeated as boolean) ?? current.isDefeated,
              timeFormatted: (msg.timeFormatted as string) ?? current.timeFormatted,
              accuracyPercent: (msg.accuracyPercent as number) ?? current.accuracyPercent,
              cellsPerMinute: (msg.cellsPerMinute as number) ?? current.cellsPerMinute,
            });
            this._updateRanks();
            this._notify();
            this._checkMatchOver();
          }
        } else if (type === 'emoji') {
          const senderId = msg.playerId as string;
          const emoji = msg.emoji as string;
          const senderName = (msg.senderName as string) || this._players.get(senderId)?.name || 'Player';
          if (senderId && this._players.has(senderId)) {
            const current = this._players.get(senderId)!;
            this._players.set(senderId, { ...current, recentEmoji: emoji });
            this._notify();
          }
          if (emoji && senderId !== this.localPlayerId) {
            this.onEmojiReceived?.(emoji, senderName);
          }
        } else if (type === 'player_left') {
          const pid = msg.playerId as string;
          if (pid) {
            this._players.delete(pid);
            this._notify();
            this._checkMatchOver();
          }
        }
      });

      // Request to join immediately, and retry every 1500ms
      const sendRequest = () => {
        this._signaling?.send({
          type: 'join_request',
          guestId: this.localPlayerId,
          guestName,
        });
      };

      sendRequest();
      retryTimer = setInterval(sendRequest, 1500);
    });
  }

  private async _handleHostOffer(offerPayloadStr: string) {
    const payload = JSON.parse(offerPayloadStr) as {
      type: RTCSdpType;
      sdp: string;
      candidates?: RTCIceCandidateInit[];
      puzzle: SudokuPuzzle;
      hostName?: string;
      mistakeRule?: MistakeRule;
    };

    this.puzzle = payload.puzzle;
    this.mistakeRule = payload.mistakeRule ?? 'standard';

    // Prepopulate players immediately so lobby NEVER displays 0 players
    const givens = this.puzzle?.givens.filter((v) => v !== 0).length ?? 0;
    this._players.clear();
    this._players.set('host', {
      id: 'host',
      name: payload.hostName || 'Host',
      colorIndex: 0,
      isHost: true,
      targetToFill: 81 - givens,
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
    this._players.set(this.localPlayerId, {
      id: this.localPlayerId,
      name: this.localPlayerName,
      colorIndex: 1,
      isHost: false,
      targetToFill: 81 - givens,
      filledCount: 0,
      progressPercent: 0,
      score: 0,
      lives: this.mistakeRule === 'hardcore' ? 1 : this.mistakeRule === 'casual' ? 999 : 3,
      mistakes: 0,
      isCompleted: false,
      isDefeated: false,
      latencyMs: 0,
      rank: 2,
    });
    this._notify();

    const pc = new RTCPeerConnection(P2PRoomService.RTC_CONFIG);
    this._guestPc = pc;

    const guestCandidates: RTCIceCandidateInit[] = [];
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        guestCandidates.push(e.candidate.toJSON());
        this._signaling?.send({
          type: 'ice_candidate',
          targetId: 'host',
          senderId: this.localPlayerId,
          candidate: e.candidate.toJSON(),
        });
      }
    };

    pc.ondatachannel = (e) => {
      this._guestDc = e.channel;
      this._setupGuestDataChannel(e.channel);
    };

    await pc.setRemoteDescription(
      new RTCSessionDescription({ type: payload.type, sdp: payload.sdp })
    );

    // Add host's ICE candidates
    if (Array.isArray(payload.candidates)) {
      for (const cand of payload.candidates) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch (e) {
          console.warn('[Guest] Failed to add host ICE candidate:', e);
        }
      }
    }

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    // Wait for ICE gathering (up to 1500ms)
    await new Promise<void>((resolve) => {
      if (pc.iceGatheringState === 'complete') {
        resolve();
        return;
      }
      const check = () => {
        if (pc.iceGatheringState === 'complete') {
          pc.removeEventListener('icegatheringstatechange', check);
          resolve();
        }
      };
      pc.addEventListener('icegatheringstatechange', check);
      setTimeout(resolve, 1500);
    });

    this._signaling?.send({
      type: 'answer',
      guestId: this.localPlayerId,
      answer: JSON.stringify({
        type: pc.localDescription?.type,
        sdp: pc.localDescription?.sdp,
        candidates: guestCandidates,
        playerName: this.localPlayerName,
      }),
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
      if (!this.isGameStarted) {
        this.isGameStarted = true;
        this.isMatchOver = false;
        this.winner = null;
        this.allPlayersDefeated = false;
        if (data.mistakeRule) this.mistakeRule = data.mistakeRule as MistakeRule;
        if (data.puzzle) this.puzzle = data.puzzle as SudokuPuzzle;
        this._notify();
        if (this.puzzle) {
          this.onGameStarted?.(this.puzzle, this.mistakeRule);
        }
      }
    } else if (type === 'rematch_start') {
      if (data.puzzle) this.puzzle = data.puzzle as SudokuPuzzle;
      if (data.mistakeRule) this.mistakeRule = data.mistakeRule as MistakeRule;
      this.resetMatchState();
      this.isGameStarted = true;
      this._notify();
      if (this.puzzle) {
        this.onGameStarted?.(this.puzzle, this.mistakeRule);
      }
    } else if (type === 'rematch_lobby') {
      if (data.mistakeRule) this.mistakeRule = data.mistakeRule as MistakeRule;
      this.resetMatchState();
      this._notify();
      this.onReturnToLobby?.();
    } else if (type === 'settings_changed') {
      if (data.mistakeRule) this.mistakeRule = data.mistakeRule as MistakeRule;
      if (data.puzzle) {
        this.puzzle = data.puzzle as SudokuPuzzle;
        this.onSettingsChanged?.(this.puzzle.difficulty, this.mistakeRule);
      }
      this._notify();
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
          isFinished: (data.isCompleted as boolean) ?? current.isFinished,
          isDefeated: (data.isDefeated as boolean) ?? current.isDefeated,
          timeFormatted: (data.timeFormatted as string) ?? current.timeFormatted,
          accuracyPercent: (data.accuracyPercent as number) ?? current.accuracyPercent,
          cellsPerMinute: (data.cellsPerMinute as number) ?? current.cellsPerMinute,
        });
        this._updateRanks();
        this._notify();
        this._checkMatchOver();
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
        this._checkMatchOver();
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

  private _checkMatchOver() {
    if (this.isMatchOver) return;

    const list = this.playersList;
    if (list.length === 0) return;

    // 1. Any player completed?
    const completed = list.filter((p) => p.isCompleted);
    if (completed.length > 0) {
      if (!this.winner) {
        this.winner = completed[0];
      }
      this.isMatchOver = true;
      this._notify();
      this.onMatchEnded?.(this.winner, this.playersList, false);
      return;
    }

    // 2. All players defeated / knocked out?
    const allDefeated = list.every((p) => p.isDefeated || (p.lives !== undefined && p.lives <= 0));
    if (allDefeated && !this.allPlayersDefeated) {
      this.allPlayersDefeated = true;
      this.isMatchOver = true;
      this._notify();
      this.onMatchEnded?.(null, this.playersList, true);
    }
  }

  resetMatchState() {
    this.isGameStarted = false;
    this.isMatchOver = false;
    this.winner = null;
    this.allPlayersDefeated = false;

    const givens = this.puzzle?.givens.filter((v) => v !== 0).length ?? 0;
    for (const [id, p] of this._players) {
      this._players.set(id, {
        ...p,
        targetToFill: 81 - givens,
        filledCount: 0,
        progressPercent: 0,
        score: 0,
        lives: this.mistakeRule === 'hardcore' ? 1 : this.mistakeRule === 'casual' ? 999 : 3,
        mistakes: 0,
        isCompleted: false,
        isFinished: false,
        isDefeated: false,
        isKnockedOut: false,
        recentEmoji: undefined,
        timeFormatted: undefined,
        accuracyPercent: undefined,
        cellsPerMinute: undefined,
      });
    }
    this._notify();
  }

  changeDifficulty(difficulty: Difficulty) {
    if (!this.isHost) return;
    this.puzzle = SudokuGenerator.generate(difficulty);
    const payload = {
      type: 'settings_changed',
      difficulty,
      mistakeRule: this.mistakeRule,
      puzzle: this.puzzle,
    };
    this._broadcastToGuests(payload);
    this._signaling?.send(payload);
    this._notify();
  }

  changeMistakeRule(mistakeRule: MistakeRule) {
    if (!this.isHost) return;
    this.mistakeRule = mistakeRule;
    const payload = {
      type: 'settings_changed',
      difficulty: this.puzzle?.difficulty,
      mistakeRule,
      puzzle: this.puzzle,
    };
    this._broadcastToGuests(payload);
    this._signaling?.send(payload);
    this._notify();
  }

  startMatch() {
    if (!this.isHost || !this.puzzle) return;
    this.startGame(this.puzzle, this.mistakeRule);
  }

  startGame(puzzle: SudokuPuzzle, mistakeRule: MistakeRule) {
    this.puzzle = puzzle;
    this.mistakeRule = mistakeRule;
    if (this.isHost) {
      this.isGameStarted = true;
      this.isMatchOver = false;
      this.winner = null;
      this.allPlayersDefeated = false;
      const startPayload = {
        type: 'start_game',
        puzzle,
        mistakeRule,
      };
      // Send over WebRTC DataChannels
      this._broadcastToGuests(startPayload);
      // Dual-transmit over Signaling MQTT
      this._signaling?.send(startPayload);
      this._notify();
    }
  }

  startRematch(newPuzzle: SudokuPuzzle) {
    if (!this.isHost) return;
    this.puzzle = newPuzzle;
    this.resetMatchState();
    this.isGameStarted = true;

    const payload = {
      type: 'rematch_start',
      puzzle: newPuzzle,
      mistakeRule: this.mistakeRule,
    };
    this._broadcastToGuests(payload);
    this._signaling?.send(payload);
    this._notify();
    this.onGameStarted?.(newPuzzle, this.mistakeRule);
  }

  returnToLobby() {
    if (!this.isHost) return;
    this.resetMatchState();

    const payload = {
      type: 'rematch_lobby',
      mistakeRule: this.mistakeRule,
      difficulty: this.puzzle?.difficulty,
    };
    this._broadcastToGuests(payload);
    this._signaling?.send(payload);
    this._notify();
    this.onReturnToLobby?.();
  }

  sendProgressUpdate(update: {
    filledCount: number;
    progressPercent: number;
    score: number;
    lives: number;
    mistakes: number;
    isCompleted: boolean;
    isDefeated: boolean;
    timeFormatted?: string;
    accuracyPercent?: number;
    cellsPerMinute?: number;
  }) {
    if (this._players.has(this.localPlayerId)) {
      const current = this._players.get(this.localPlayerId)!;
      this._players.set(this.localPlayerId, {
        ...current,
        ...update,
      });
      this._updateRanks();
      this._notify();
      this._checkMatchOver();
    }

    const payload = {
      type: 'progress',
      playerId: this.localPlayerId,
      ...update,
    };

    if (this.isHost) {
      this._broadcastToGuests(payload);
      this._signaling?.send(payload);
    } else if (this._guestDc?.readyState === 'open') {
      this._guestDc.send(JSON.stringify(payload));
    } else {
      this._signaling?.send(payload);
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
      senderName: this.localPlayerName,
      emoji,
    };

    if (this.isHost) {
      this._broadcastToGuests(payload);
      this._signaling?.send(payload);
    } else if (this._guestDc?.readyState === 'open') {
      this._guestDc.send(JSON.stringify(payload));
    } else {
      this._signaling?.send(payload);
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
    this._cachedOffers.clear();
    this._pendingOfferPromises.clear();

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

  getPlayers(): PlayerProgress[] {
    return this.playersList;
  }

  async initializeRoom(code: string, nickname: string, isHostRole: boolean): Promise<void> {
    if (isHostRole) {
      const p = this.puzzle ?? SudokuGenerator.generate('medium');
      await this.initializeHost({
        hostName: nickname,
        puzzle: p,
        mistakeRule: this.mistakeRule || 'standard',
        roomCode: code,
      });
    } else {
      await this.joinWith6DigitCode(code, nickname);
    }
  }

  broadcastProgress(
    progress: number,
    mistakes: number,
    isKnockedOut: boolean,
    isFinished: boolean,
    extraStats?: {
      timeFormatted?: string;
      accuracyPercent?: number;
      cellsPerMinute?: number;
    }
  ) {
    const totalGivens = this.puzzle?.givens.filter((v) => v !== 0).length ?? 0;
    const targetToFill = 81 - totalGivens;
    this.sendProgressUpdate({
      filledCount: Math.round(progress * (targetToFill > 0 ? targetToFill : 81)),
      progressPercent: progress,
      score: Math.round(progress * 1000),
      lives: Math.max(0, 3 - mistakes),
      mistakes,
      isCompleted: isFinished,
      isDefeated: isKnockedOut,
      ...extraStats,
    });
  }

  broadcastEmoji(emoji: string) {
    this.sendEmojiReaction(emoji);
  }

  disconnect() {
    if (this._signaling) {
      try {
        this._signaling.send({
          type: 'player_left',
          playerId: this.localPlayerId,
        });
      } catch {}
    }
    this.dispose();
  }
}

export const roomService = new P2PRoomService();
