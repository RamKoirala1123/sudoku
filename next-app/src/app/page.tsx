"use client";

import React, { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import {
  Users,
  Play,
  Volume2,
  VolumeX,
  Moon,
  Sun,
  ChevronRight,
  User,
  X,
} from "lucide-react";

import { Difficulty, MistakeRule, PlayerProgress, SudokuPuzzle } from "@/lib/types";
import { generateSudoku } from "@/lib/sudoku/engine";
import { soundService } from "@/lib/sound/soundService";
import { roomService } from "@/lib/p2p/roomService";
import { useSudokuGame } from "@/lib/sudoku/useSudokuGame";

import { TopBar } from "@/components/TopBar";
import { SudokuBoard } from "@/components/SudokuBoard";
import { NumberPad } from "@/components/NumberPad";
import { PauseDialog } from "@/components/PauseDialog";
import { RestartConfirmDialog } from "@/components/RestartConfirmDialog";
import { GameResultOverlay } from "@/components/GameResultOverlay";
import { RaceLeaderboard } from "@/components/RaceLeaderboard";
import { FloatingEmojiOverlay, FloatingEmoji } from "@/components/FloatingEmojiOverlay";
import { CountdownOverlay } from "@/components/CountdownOverlay";
import { KnockoutOverlay } from "@/components/KnockoutOverlay";
import { MatchFinishedOverlay } from "@/components/MatchFinishedOverlay";
import { MultiplayerMenuScreen } from "@/components/MultiplayerMenuScreen";
import { MultiplayerLobbyScreen } from "@/components/MultiplayerLobbyScreen";
import { MultiplayerPostGameScreen } from "@/components/MultiplayerPostGameScreen";

type AppMode = "home" | "solo_game" | "multiplayer_menu" | "multiplayer_lobby" | "multiplayer_game" | "multiplayer_postgame";

const QUICK_REACTION_EMOJIS = ["🔥", "👏", "🤯", "😎", "😱", "💀"];

interface SavedSession {
  difficulty: Difficulty;
  mistakeRule: MistakeRule;
  roomCode?: string;
  isMultiplayer: boolean;
  score: number;
  timeFormatted: string;
  theme?: "dark" | "light";
}

interface PlayerStats {
  totalGamesPlayed: number;
  totalGamesWon: number;
  bestTime: string;
  bestScore: number;
}

let nextEmojiId = 0;
function spawnFloatingEmojiItem(emoji: string, senderName: string): FloatingEmoji {
  nextEmojiId += 1;
  const id = `fe_${nextEmojiId}_${(nextEmojiId * 997) % 10000}`;
  const leftPercent = 15 + ((nextEmojiId * 37) % 65);
  return { id, emoji, senderName, leftPercent };
}

export default function SudokuApp() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("sudoku_theme") || sessionStorage.getItem("sudoku_theme");
      if (savedTheme === "dark") return true;
      if (savedTheme === "light") return false;
      const savedSessionStr = localStorage.getItem("sudoku_active_session") || sessionStorage.getItem("sudoku_active_session");
      if (savedSessionStr) {
        try {
          const parsed = JSON.parse(savedSessionStr);
          if (parsed?.theme === "dark") return true;
          if (parsed?.theme === "light") return false;
        } catch { }
      }
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return true;
  });
  const mounted = useSyncExternalStore(
    () => () => { },
    () => true,
    () => false
  );
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // App navigation state
  const [mode, setMode] = useState<AppMode>("home");
  const [inviteRoomCode, setInviteRoomCode] = useState<string>("");

  // Settings
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [mistakeRule, setMistakeRule] = useState<MistakeRule>("standard");
  const [nickname, setNickname] = useState<string>("Player");

  // Multiplayer Room state
  const [isHost, setIsHost] = useState<boolean>(false);
  const [roomCode, setRoomCode] = useState<string>("");
  const [players, setPlayers] = useState<PlayerProgress[]>([]);
  const [latencyMs, setLatencyMs] = useState<number>(20);
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const [showCountdown, setShowCountdown] = useState<boolean>(false);
  const [isSpectating, setIsSpectating] = useState<boolean>(false);
  const [postGameWinner, setPostGameWinner] = useState<PlayerProgress | null>(null);
  const [postGameStandings, setPostGameStandings] = useState<PlayerProgress[]>([]);
  const [postGameAllDefeated, setPostGameAllDefeated] = useState<boolean>(false);

  // Saved Session & Stats
  const [activeSession, setActiveSession] = useState<SavedSession | null>(null);
  const [stats, setStats] = useState<PlayerStats>({
    totalGamesPlayed: 0,
    totalGamesWon: 0,
    bestTime: "--:--",
    bestScore: 0,
  });

  const [showPauseDialog, setShowPauseDialog] = useState<boolean>(false);
  const [showRestartConfirmDialog, setShowRestartConfirmDialog] = useState<boolean>(false);

  // Sudoku Hook
  const {
    gameState,
    isGenerating,
    isNotesMode,
    startNewGame,
    startWithPuzzle,
    selectCell,
    inputNumber,
    eraseCell,
    undo,
    pause,
    resume,
    restart,
    toggleNotesMode,
    remainingCounts,
    timeFormatted,
    lastDelta,
    waveAnimation,
    shakeAnimation,
    conflictHighlight,
  } = useSudokuGame(difficulty, mistakeRule);

  // Sync client storage and settings after hydration
  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedTheme = localStorage.getItem("sudoku_theme") || sessionStorage.getItem("sudoku_theme");
    const savedMute = localStorage.getItem("sudoku_muted");
    const savedNick = localStorage.getItem("sudoku_nickname");
    const savedStatsStr = localStorage.getItem("sudoku_stats");
    const savedSessionStr = localStorage.getItem("sudoku_active_session") || sessionStorage.getItem("sudoku_active_session");

    let resolvedDark = true;
    if (savedTheme === "dark") {
      resolvedDark = true;
    } else if (savedTheme === "light") {
      resolvedDark = false;
    } else if (savedSessionStr) {
      try {
        const parsed = JSON.parse(savedSessionStr);
        if (parsed?.theme) {
          resolvedDark = parsed.theme === "dark";
        } else {
          resolvedDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        }
      } catch {
        resolvedDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      }
    } else {
      resolvedDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    }

    setIsDarkMode(resolvedDark);
    const themeStr = resolvedDark ? "dark" : "light";
    document.documentElement.classList.toggle("dark", resolvedDark);
    document.documentElement.setAttribute("data-theme", themeStr);
    if (document.body) {
      document.body.classList.toggle("dark", resolvedDark);
      document.body.setAttribute("data-theme", themeStr);
    }
    if (savedMute) {
      const muted = savedMute === "true";
      setIsMuted(muted);
      soundService.setMuted(muted);
    }

    if (savedNick) {
      setNickname(savedNick);
    } else {
      const randomNick = `Player${Math.floor(1000 + Math.random() * 9000)}`;
      setNickname(randomNick);
      localStorage.setItem("sudoku_nickname", randomNick);
    }

    if (savedStatsStr) {
      try {
        setStats(JSON.parse(savedStatsStr));
      } catch { }
    }

    if (savedSessionStr) {
      try {
        setActiveSession(JSON.parse(savedSessionStr));
      } catch { }
    }
  }, []);

  const handleToggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      const themeStr = next ? "dark" : "light";
      localStorage.setItem("sudoku_theme", themeStr);
      sessionStorage.setItem("sudoku_theme", themeStr);
      document.documentElement.classList.toggle("dark", next);
      document.documentElement.setAttribute("data-theme", themeStr);
      if (document.body) {
        document.body.classList.toggle("dark", next);
        document.body.setAttribute("data-theme", themeStr);
      }
      setActiveSession((sess) => {
        if (!sess) return null;
        const updated = { ...sess, theme: themeStr as "dark" | "light" };
        localStorage.setItem("sudoku_active_session", JSON.stringify(updated));
        sessionStorage.setItem("sudoku_active_session", JSON.stringify(updated));
        return updated;
      });
      return next;
    });
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundService.setMuted(next);
    localStorage.setItem("sudoku_muted", String(next));
  };

  const handleSaveNickname = (name: string) => {
    setNickname(name);
    localStorage.setItem("sudoku_nickname", name);
  };

  // Solo Start
  const handleStartSolo = (diff: Difficulty) => {
    setDifficulty(diff);
    startNewGame(diff, mistakeRule);
    setMode("solo_game");

    // Save active session with current theme to both localStorage and sessionStorage
    const sess: SavedSession = {
      difficulty: diff,
      mistakeRule,
      isMultiplayer: false,
      score: 0,
      timeFormatted: "00:00",
      theme: isDarkMode ? "dark" : "light",
    };
    setActiveSession(sess);
    localStorage.setItem("sudoku_active_session", JSON.stringify(sess));
    sessionStorage.setItem("sudoku_active_session", JSON.stringify(sess));
  };

  const handleResumeSession = () => {
    if (!activeSession) return;
    setDifficulty(activeSession.difficulty);
    setMistakeRule(activeSession.mistakeRule);
    if (activeSession.theme) {
      const isDark = activeSession.theme === "dark";
      setIsDarkMode(isDark);
      localStorage.setItem("sudoku_theme", activeSession.theme);
      sessionStorage.setItem("sudoku_theme", activeSession.theme);
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.setAttribute("data-theme", activeSession.theme);
      if (document.body) {
        document.body.classList.toggle("dark", isDark);
        document.body.setAttribute("data-theme", activeSession.theme);
      }
    }
    if (activeSession.isMultiplayer && activeSession.roomCode) {
      handleJoinRoom(activeSession.roomCode);
    } else {
      startNewGame(activeSession.difficulty, activeSession.mistakeRule);
      setMode("solo_game");
    }
  };

  const handleDiscardSession = () => {
    setActiveSession(null);
    localStorage.removeItem("sudoku_active_session");
    sessionStorage.removeItem("sudoku_active_session");
  };

  // P2P Room callbacks setup
  const setupRoomListeners = useCallback(() => {
    roomService.onPlayersChanged = (updated) => {
      setPlayers([...updated]);
    };

    roomService.onSettingsChanged = (diff: Difficulty, rule: MistakeRule) => {
      setDifficulty(diff);
      setMistakeRule(rule);
    };

    roomService.onGameStarted = (puzzle: SudokuPuzzle, rule: MistakeRule) => {
      setMistakeRule(rule);
      setDifficulty(puzzle.difficulty);
      startWithPuzzle(puzzle, rule);
      setMode("multiplayer_game");
      setShowCountdown(true);
    };

    roomService.onEmojiReceived = (emoji: string, senderName: string) => {
      const item = spawnFloatingEmojiItem(emoji, senderName);
      setFloatingEmojis((prev) => [...prev, item]);

      setTimeout(() => {
        setFloatingEmojis((prev) => prev.filter((entry) => entry.id !== item.id));
      }, 2800);
    };

    roomService.onMatchEnded = (matchWinner, matchStandings, matchAllDefeated) => {
      setPostGameWinner(matchWinner);
      setPostGameStandings(matchStandings);
      setPostGameAllDefeated(matchAllDefeated);
      setTimeout(() => {
        setMode("multiplayer_postgame");
      }, 700);
    };

    roomService.onReturnToLobby = () => {
      setIsSpectating(false);
      setPlayers([...roomService.playersList]);
      setMode("multiplayer_lobby");
    };

    roomService.onLatencyUpdated = (ping) => {
      setLatencyMs(ping);
    };
  }, [startWithPuzzle]);

  // Host a room
  const handleHostRoom = async (diff: Difficulty, rule: MistakeRule) => {
    try {
      setDifficulty(diff);
      setMistakeRule(rule);
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setRoomCode(code);
      setIsHost(true);
      setIsSpectating(false);
      window.location.hash = `#room=${code}`;

      setupRoomListeners();
      const p = generateSudoku(diff);
      roomService.puzzle = p;
      roomService.mistakeRule = rule;
      await roomService.initializeRoom(code, nickname, true);
      setPlayers([...roomService.playersList]);
      setMode("multiplayer_lobby");
    } catch (err) {
      console.warn("[Multiplayer] Host room creation failed:", err);
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", window.location.pathname);
      }
      throw err;
    }
  };

  // Join a room
  const handleJoinRoom = async (code: string, chosenNickname?: string) => {
    try {
      const cleanCode = code.trim();
      const finalName = chosenNickname?.trim() || nickname.trim() || "Player";
      setRoomCode(cleanCode);
      setIsHost(false);
      setIsSpectating(false);
      window.location.hash = `#room=${cleanCode}`;

      setupRoomListeners();
      await roomService.initializeRoom(cleanCode, finalName, false);
      setPlayers([...roomService.playersList]);
      if (roomService.puzzle) {
        setDifficulty(roomService.puzzle.difficulty);
      }
      if (roomService.mistakeRule) {
        setMistakeRule(roomService.mistakeRule);
      }
      setMode("multiplayer_lobby");
    } catch (err) {
      console.warn("[Multiplayer] Join room failed:", err);
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", window.location.pathname);
      }
      throw err;
    }
  };

  // Check URL hash for direct join (#join=123456 or #room=123456)
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      const match = hash.match(/(?:join|room)=([0-9]{6})/);
      if (match && match[1]) {
        setInviteRoomCode(match[1]);
        setMode("multiplayer_menu");
      }
    };

    window.addEventListener("hashchange", handleHash);
    queueMicrotask(handleHash);

    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  // Host launches game
  const handleHostStartMatch = useCallback(() => {
    if (players.length < 2) return;
    const puzzle = generateSudoku(difficulty);
    roomService.startGame(puzzle, mistakeRule);
    startWithPuzzle(puzzle, mistakeRule);
    setMode("multiplayer_game");
    setShowCountdown(true);
  }, [difficulty, mistakeRule, players.length, startWithPuzzle]);

  // Countdown completed -> remove countdown overlay
  const handleCountdownComplete = useCallback(() => {
    setShowCountdown(false);
  }, []);

  // Leave room or exit match
  const handleLeaveRoom = useCallback(() => {
    roomService.disconnect();
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", window.location.pathname);
    }
    setMode("home");
    setIsSpectating(false);
    handleDiscardSession();
  }, []);

  // Host launches rematch with newly generated puzzle
  const handleHostRematch = useCallback(() => {
    if (players.length < 2) return;
    const newPuzzle = generateSudoku(difficulty);
    roomService.startRematch(newPuzzle);
    startWithPuzzle(newPuzzle, mistakeRule);
    setIsSpectating(false);
    setMode("multiplayer_game");
    setShowCountdown(true);
  }, [difficulty, mistakeRule, players.length, startWithPuzzle]);

  // Host returns everyone to lobby to adjust settings
  const handleReturnToLobby = useCallback(() => {
    roomService.returnToLobby();
    setIsSpectating(false);
    setPlayers([...roomService.playersList]);
    setMode("multiplayer_lobby");
  }, []);

  // Exit from post-match screen to home
  const handleExitPostGame = useCallback(() => {
    handleLeaveRoom();
    setMode("home");
  }, [handleLeaveRoom]);

  // Synchronize player progress to room peers (starts at 0% based on remaining empty cells)
  useEffect(() => {
    if (mode === "multiplayer_game" && gameState.puzzle) {
      const puzzle = gameState.puzzle;
      const totalGivens = puzzle.givens.filter((v) => v !== 0).length;
      const targetToFill = 81 - totalGivens;
      let correctFilled = 0;
      for (let i = 0; i < 81; i++) {
        if (puzzle.givens[i] === 0 && gameState.board[i] !== 0 && gameState.board[i] === puzzle.solution[i]) {
          correctFilled++;
        }
      }
      const progress = targetToFill > 0 ? Math.min(1, Math.max(0, correctFilled / targetToFill)) : 0;
      const totalAttempts = correctFilled + gameState.mistakes;
      const accuracyPercent = totalAttempts > 0 ? Math.round((correctFilled / totalAttempts) * 100) : 100;
      const cellsPerMinute =
        gameState.elapsedSeconds > 0
          ? Math.round((correctFilled / (gameState.elapsedSeconds / 60)) * 10) / 10
          : 0;

      roomService.broadcastProgress(
        progress,
        gameState.mistakes,
        gameState.isKnockedOut,
        gameState.isFinished,
        {
          timeFormatted,
          accuracyPercent,
          cellsPerMinute,
        }
      );
    }
  }, [
    mode,
    gameState.board,
    gameState.mistakes,
    gameState.isKnockedOut,
    gameState.isFinished,
    gameState.puzzle,
    gameState.elapsedSeconds,
    timeFormatted,
  ]);

  // When game finishes, update statistics
  useEffect(() => {
    if (gameState.isFinished) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStats((prev) => {
        const next: PlayerStats = {
          totalGamesPlayed: prev.totalGamesPlayed + 1,
          totalGamesWon: prev.totalGamesWon + 1,
          bestTime: prev.bestTime === "--:--" ? timeFormatted : prev.bestTime,
          bestScore: Math.max(prev.bestScore, gameState.score),
        };
        localStorage.setItem("sudoku_stats", JSON.stringify(next));
        return next;
      });
      handleDiscardSession();
    }
  }, [gameState.isFinished, gameState.score, timeFormatted]);

  // Send emoji reaction
  const handleSendEmoji = useCallback((emoji: string) => {
    roomService.broadcastEmoji(emoji);
    const item = spawnFloatingEmojiItem(emoji, "You");
    setFloatingEmojis((prev) => [...prev, item]);
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((entry) => entry.id !== item.id));
    }, 2800);
  }, []);

  const handleBackHome = () => {
    if (mode === "multiplayer_game" || mode === "multiplayer_lobby") {
      handleLeaveRoom();
    } else {
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", window.location.pathname);
      }
      setInviteRoomCode("");
      setMode("home");
    }
  };

  // Pause / Resume / Restart handlers matching Flutter
  const handleOpenPause = () => {
    pause();
    setShowPauseDialog(true);
  };

  const handleResumeFromPause = () => {
    setShowPauseDialog(false);
    resume();
  };

  const handlePromptRestart = () => {
    setShowPauseDialog(false);
    setShowRestartConfirmDialog(true);
  };

  const handleConfirmRestart = () => {
    setShowRestartConfirmDialog(false);
    handleDiscardSession();
    restart();
  };

  const handleCancelRestart = () => {
    setShowRestartConfirmDialog(false);
    resume();
  };

  const handleExitFromPause = () => {
    setShowPauseDialog(false);
    handleDiscardSession();
    handleBackHome();
  };

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-start pb-6 px-3 transition-colors bg-background text-foreground"
    >
      {/* Floating Emojis */}
      <FloatingEmojiOverlay emojis={floatingEmojis} />

      {/* 3-2-1 Countdown Overlay */}
      {showCountdown && <CountdownOverlay onComplete={handleCountdownComplete} />}

      {/* Flutter Pause Dialog */}
      {showPauseDialog && (
        <PauseDialog
          onResume={handleResumeFromPause}
          onRestart={handlePromptRestart}
          onExit={handleExitFromPause}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Flutter Restart Confirm Dialog */}
      {showRestartConfirmDialog && (
        <RestartConfirmDialog
          onConfirm={handleConfirmRestart}
          onCancel={handleCancelRestart}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Solo Game Result Overlay (Exact Flutter game_result_overlay.dart) */}
      {mode === "solo_game" && (gameState.status === "won" || gameState.status === "lost") && (
        <GameResultOverlay
          won={gameState.status === "won"}
          difficulty={difficulty}
          score={gameState.score}
          elapsedSeconds={gameState.elapsedSeconds}
          mistakes={gameState.mistakes}
          correct={gameState.correctCount}
          onPlayAgain={() => startNewGame(difficulty, mistakeRule)}
          onHome={handleBackHome}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Multiplayer Knockout Modal (Max Mistakes) */}
      {mode === "multiplayer_game" && gameState.isKnockedOut && !isSpectating && (
        <KnockoutOverlay
          mistakeRule={mistakeRule}
          mistakes={gameState.mistakes}
          maxMistakes={gameState.maxMistakes}
          isMultiplayer={true}
          onSpectate={() => setIsSpectating(true)}
          onLeave={handleBackHome}
        />
      )}

      {/* Multiplayer Match Finished Overlay (Win / Complete) */}
      {mode === "multiplayer_game" && gameState.isFinished && (
        <MatchFinishedOverlay
          isWinner={true}
          rank={1}
          timeFormatted={timeFormatted}
          score={gameState.score}
          mistakes={gameState.mistakes}
          players={players}
          isMultiplayer={true}
          onBackToHome={handleBackHome}
        />
      )}

      {/* Multiplayer Menu Screen (Host / Join / Edit Nickname) */}
      {mode === "multiplayer_menu" && (
        <MultiplayerMenuScreen
          initialNickname={nickname}
          onSaveNickname={handleSaveNickname}
          onHost={handleHostRoom}
          onJoin={handleJoinRoom}
          onBack={handleBackHome}
          initialRoomCode={inviteRoomCode}
          initialTab={inviteRoomCode ? "join" : "host"}
        />
      )}

      {/* Multiplayer Lobby Screen (Waiting for match start) */}
      {mode === "multiplayer_lobby" && (
        <MultiplayerLobbyScreen
          isHost={isHost}
          roomCode={roomCode}
          players={players}
          difficulty={difficulty}
          mistakeRule={mistakeRule}
          onDifficultyChange={(d) => {
            setDifficulty(d);
            roomService.changeDifficulty(d);
          }}
          onMistakeRuleChange={(r) => {
            setMistakeRule(r);
            roomService.changeMistakeRule(r);
          }}
          onStartMatch={handleHostStartMatch}
          onLeave={handleLeaveRoom}
        />
      )}

      {/* Multiplayer Post-Game Celebration & Podium Screen */}
      {mode === "multiplayer_postgame" && (
        <MultiplayerPostGameScreen
          isHost={isHost}
          roomCode={roomCode}
          myId={roomService.localPlayerId}
          difficulty={difficulty}
          mistakeRule={mistakeRule}
          winner={postGameWinner}
          standings={postGameStandings.length > 0 ? postGameStandings : players}
          allDefeated={postGameAllDefeated}
          myStats={{
            timeFormatted,
            accuracyPercent: (() => {
              const puzzle = gameState.puzzle;
              const correctFilled = puzzle
                ? gameState.board.filter((c, i) => puzzle.givens[i] === 0 && c !== 0 && c === puzzle.solution[i]).length
                : 0;
              const totalAttempts = correctFilled + gameState.mistakes;
              return totalAttempts > 0 ? Math.round((correctFilled / totalAttempts) * 100) : 100;
            })(),
            cellsPerMinute: (() => {
              const puzzle = gameState.puzzle;
              const correctFilled = puzzle
                ? gameState.board.filter((c, i) => puzzle.givens[i] === 0 && c !== 0 && c === puzzle.solution[i]).length
                : 0;
              return gameState.elapsedSeconds > 0
                ? Math.round((correctFilled / (gameState.elapsedSeconds / 60)) * 10) / 10
                : 0;
            })(),
            mistakes: gameState.mistakes,
            lives: gameState.lives,
            isCompleted: gameState.isFinished,
            isDefeated: gameState.isKnockedOut,
            rank: players.find((p) => p.id === roomService.localPlayerId)?.rank || 1,
          }}
          onRematch={handleHostRematch}
          onReturnToLobby={handleReturnToLobby}
          onExitHome={handleExitPostGame}
        />
      )}

      {/* ========================================================================= */}
      {/* SCREEN 1: FLUTTER HOME SCREEN                                             */}
      {/* ========================================================================= */}
      {mode === "home" && (
        <div className="w-full max-w-[520px] lg:max-w-[580px] mx-auto pt-6 px-3 flex flex-col animate-fadeIn">
          {/* Header (Flutter exact: 'Sudoku' / 'Duel' in primary color) */}
          <div className="w-full flex items-center justify-between mb-6">
            <div className="flex flex-col">
              <span className="text-[28px] font-extrabold tracking-tight leading-none text-[#1E2233] dark:text-[#F3F4FA]">
                Sudoku
              </span>
              <span className="text-[28px] font-extrabold tracking-tight leading-none text-[#5B6CFF] dark:text-[#7C8CFF]">
                Duel
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                suppressHydrationWarning
                onClick={handleToggleMute}
                className="p-2.5 rounded-full text-[#1E2233] dark:text-[#F3F4FA] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition"
                title={mounted && isMuted ? "Unmute Sound" : "Mute Sound"}
              >
                {mounted && isMuted ? (
                  <VolumeX className="w-[22px] h-[22px] text-[#FF5D6C]" />
                ) : (
                  <Volume2 className="w-[22px] h-[22px]" />
                )}
              </button>
              <button
                type="button"
                suppressHydrationWarning
                onClick={handleToggleTheme}
                className="p-2.5 rounded-full text-[#1E2233] dark:text-[#F3F4FA] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition"
                title={mounted ? (isDarkMode ? "Light Mode" : "Dark Mode") : "Toggle Theme"}
              >
                {!mounted ? (
                  <Moon className="w-[22px] h-[22px]" />
                ) : isDarkMode ? (
                  <Sun className="w-[22px] h-[22px]" />
                ) : (
                  <Moon className="w-[22px] h-[22px]" />
                )}
              </button>
            </div>
          </div>

          {/* Active Session Resume Banner (Flutter _buildActiveSessionBanner) */}
          {mounted && activeSession && (
            <div className="mb-6 p-4 rounded-[16px] bg-[#5B6CFF]/10 dark:bg-[#7C8CFF]/12 border border-[#5B6CFF]/25 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#5B6CFF] text-white flex items-center justify-center">
                  <Play className="w-5 h-5 fill-white ml-0.5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#1E2233] dark:text-[#F3F4FA]">
                    {activeSession.isMultiplayer
                      ? `Resume Match (${activeSession.roomCode})`
                      : `Resume Game (${activeSession.difficulty})`}
                  </h4>
                  <p className="text-xs text-[#1E2233]/60 dark:text-[#F3F4FA]/60">
                    Continue where you left off
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleResumeSession}
                  className="px-3.5 py-1.5 rounded-[10px] bg-[#5B6CFF] hover:bg-[#4D5EFF] text-white text-xs font-bold transition active:scale-95"
                >
                  Resume
                </button>
                <button
                  type="button"
                  onClick={handleDiscardSession}
                  className="p-1.5 rounded-full text-[#1E2233]/50 hover:text-[#1E2233] dark:text-[#F3F4FA]/50 dark:hover:text-[#F3F4FA] transition"
                  title="Discard"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* 1v1 P2P Multiplayer Card (Exact Flutter LinearGradient & styling) */}
          <div
            onClick={() => setMode("multiplayer_menu")}
            className="w-full mb-7 p-5 rounded-[20px] bg-gradient-to-br from-[#5B6CFF] to-[#7585FF] dark:from-[#38437D] dark:to-[#272F55] text-white shadow-[0_6px_16px_rgba(91,108,255,0.3)] cursor-pointer active:scale-[0.99] transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-[14px] flex items-center justify-center">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-[18px] font-bold text-white leading-tight">
                  Multiplayer
                </h3>
                <p className="text-[13px] text-white/70 mt-0.5 leading-snug">
                  Play live Sudoku with friends
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/70" />
          </div>

          {/* Solo Practice Header (Flutter: person_outline icon + 'Solo Practice') */}
          <div className="flex items-center gap-2 mb-3 px-1">
            <User className="w-5 h-5 text-[#1E2233]/70 dark:text-[#F3F4FA]/70" />
            <h3 className="text-[20px] font-bold text-[#1E2233] dark:text-[#F3F4FA]">
              Solo Practice
            </h3>
          </div>

          {/* 5 Difficulty Buttons (Matching Flutter DifficultyButton.dart) */}
          <div className="space-y-2.5 mb-6">
            {[
              { id: "easy" as Difficulty, label: "Easy", color: "#3DDC97" },
              { id: "medium" as Difficulty, label: "Medium", color: "#4FC3F7" },
              { id: "hard" as Difficulty, label: "Hard", color: "#FFC24B" },
              { id: "difficult" as Difficulty, label: "Difficult", color: "#FF8A65" },
              { id: "extreme" as Difficulty, label: "Extreme", color: "#FF5D6C" },
            ].map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => handleStartSolo(d.id)}
                className="w-full flex items-center justify-between px-[18px] py-[16px] rounded-[16px] bg-white dark:bg-[#1B1E29] border border-black/[0.06] dark:border-white/[0.06] shadow-xs hover:border-[#5B6CFF]/30 active:scale-[0.99] transition text-left group"
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: d.color }}
                  />
                  <span className="text-[16px] font-medium text-[#1E2233] dark:text-[#F3F4FA]">
                    {d.label}
                  </span>
                </div>
                <ChevronRight className="w-5 h-5 text-[#1E2233]/40 dark:text-[#F3F4FA]/40 group-hover:translate-x-0.5 transition-transform" />
              </button>
            ))}
          </div>

          {/* Statistics Summary Card (Matching Flutter StatsSummaryCard.dart) */}
          <div className="p-5 rounded-[16px] bg-white dark:bg-[#1B1E29] border border-black/[0.06] dark:border-white/[0.06] shadow-xs mb-6">
            <h4 className="text-[20px] font-bold text-[#1E2233] dark:text-[#F3F4FA] mb-4">
              Statistics
            </h4>
            <div className="grid grid-cols-2 gap-y-4 gap-x-4">
              <div>
                <div suppressHydrationWarning className="text-[26px] font-bold text-[#1E2233] dark:text-[#F3F4FA] leading-tight">
                  {stats.totalGamesPlayed}
                </div>
                <span className="text-xs text-[#1E2233]/60 dark:text-[#F3F4FA]/60">
                  Games Played
                </span>
              </div>
              <div>
                <div suppressHydrationWarning className="text-[26px] font-bold text-[#1E2233] dark:text-[#F3F4FA] leading-tight">
                  {stats.totalGamesWon}
                </div>
                <span className="text-xs text-[#1E2233]/60 dark:text-[#F3F4FA]/60">
                  Games Won
                </span>
              </div>
              <div>
                <div suppressHydrationWarning className="text-[26px] font-bold font-mono text-[#1E2233] dark:text-[#F3F4FA] leading-tight">
                  {stats.bestTime}
                </div>
                <span className="text-xs text-[#1E2233]/60 dark:text-[#F3F4FA]/60">
                  Best Time
                </span>
              </div>
              <div>
                <div suppressHydrationWarning className="text-[26px] font-bold text-[#1E2233] dark:text-[#F3F4FA] leading-tight">
                  {stats.bestScore > 0 ? stats.bestScore : "--"}
                </div>
                <span className="text-xs text-[#1E2233]/60 dark:text-[#F3F4FA]/60">
                  Best Score
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 2: GAME SCREEN (SOLO OR MULTIPLAYER RACE)                          */}
      {/* ========================================================================= */}
      {(mode === "solo_game" || mode === "multiplayer_game") && (
        <div className="w-full flex flex-col items-center animate-fadeIn max-w-[500px] md:max-w-[780px] lg:max-w-[820px] mx-auto">
          {/* Top Bar (Difficulty, Controls, Pause) — matches Flutter exact layout */}
          <TopBar
            difficulty={difficulty}
            mistakeRule={mistakeRule}
            mistakes={gameState.mistakes}
            maxMistakes={gameState.maxMistakes}
            score={gameState.score}
            lastDelta={lastDelta}
            timeFormatted={timeFormatted}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            isDarkMode={isDarkMode}
            onToggleTheme={handleToggleTheme}
            onBack={handleBackHome}
            onPause={mode === "solo_game" && gameState.status === "playing" && !isGenerating ? handleOpenPause : undefined}
            className="w-full px-2 pt-2 pb-1 select-none"
          />

          {/* Spectating Banner */}
          {isSpectating && (
            <div className="w-full px-2 mt-2">
              <div className="p-3 rounded-[12px] bg-[#FF5D6C]/10 border border-[#FF5D6C]/30 text-[#FF5D6C] text-xs font-bold flex items-center justify-between">
                <span>Spectating Match (Knocked Out by Mistakes)</span>
                <button
                  type="button"
                  onClick={handleLeaveRoom}
                  className="px-2 py-0.5 rounded bg-[#FF5D6C] text-white text-[11px] cursor-pointer"
                >
                  Leave
                </button>
              </div>
            </div>
          )}

          {/* Flutter loading indicator (CircularProgressIndicator equivalent) */}
          {isGenerating && (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div
                className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin"
                style={{ borderColor: isDarkMode ? "rgba(124,140,255,0.3)" : "rgba(91,108,255,0.3)", borderTopColor: "transparent" }}
              />
              <span className="text-sm font-medium" style={{ color: isDarkMode ? "rgba(243,244,250,0.6)" : "rgba(30,34,51,0.6)" }}>
                Generating puzzle...
              </span>
            </div>
          )}

          {/* Game board & controls — hidden while generating */}
          {!isGenerating && (
            <>
              {/* Flutter Widescreen 2-column layout (>= 768px): Board LEFT, Controls RIGHT */}
              <div className="hidden md:flex flex-row items-start justify-center gap-3 lg:gap-5 w-full mt-2 px-1">
                {/* Left Column: Board */}
                <div className="w-full max-w-[460px] lg:max-w-[500px] shrink-0">
                  <SudokuBoard
                    state={gameState}
                    onSelectCell={selectCell}
                    isSpectating={isSpectating}
                    isDarkMode={isDarkMode}
                    waveAnimation={waveAnimation}
                    shakeAnimation={shakeAnimation}
                    conflictHighlight={conflictHighlight}
                  />
                </div>

                {/* Right Column: Toolbar + 3x3 Number Grid */}
                <div className="w-[230px] lg:w-[260px] shrink-0 flex flex-col pt-1.5">
                  <NumberPad
                    remainingCounts={remainingCounts}
                    isNotesMode={isNotesMode}
                    onToggleNotes={toggleNotesMode}
                    onInputNumber={inputNumber}
                    onErase={eraseCell}
                    onUndo={undo}
                    disabled={gameState.status !== "playing" || isSpectating}
                    isGrid={true}
                    isDarkMode={isDarkMode}
                    showToolbar={true}
                    toolbarOrder="undo-erase-pencil"
                  />

                  {/* Flutter Quick Reactions Bar below numpad (Multiplayer only) */}
                  {mode === "multiplayer_game" && (
                    <div className="flex items-center justify-between gap-1 w-full mt-3 px-0.5">
                      {QUICK_REACTION_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleSendEmoji(emoji)}
                          className="flex-1 h-9.5 rounded-[14px] flex items-center justify-center text-lg sm:text-xl transition-all duration-150 bg-black/[0.04] dark:bg-white/[0.08] hover:bg-black/[0.08] dark:hover:bg-white/[0.14] hover:scale-110 active:scale-95 cursor-pointer select-none"
                          title={`React ${emoji}`}
                        >
                          <span className="leading-none">{emoji}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Flutter Mobile layout (< 768px): Board top, toolbar + 1-row pad below */}
              <div className="flex md:hidden flex-col items-center w-full max-w-[500px]">
                {/* Board (max 480px) */}
                <div className="w-full max-w-[480px]">
                  <SudokuBoard
                    state={gameState}
                    onSelectCell={selectCell}
                    isSpectating={isSpectating}
                    isDarkMode={isDarkMode}
                    waveAnimation={waveAnimation}
                    shakeAnimation={shakeAnimation}
                    conflictHighlight={conflictHighlight}
                  />
                </div>

                {/* Mobile Toolbar + 1-row NumberPad */}
                <div className="w-full max-w-[480px] mt-2 px-2">
                  <NumberPad
                    remainingCounts={remainingCounts}
                    isNotesMode={isNotesMode}
                    onToggleNotes={toggleNotesMode}
                    onInputNumber={inputNumber}
                    onErase={eraseCell}
                    onUndo={undo}
                    disabled={gameState.status !== "playing" || isSpectating}
                    isGrid={false}
                    isDarkMode={isDarkMode}
                    showToolbar={true}
                    toolbarOrder="undo-pencil-erase"
                  />

                  {/* Flutter Quick Reactions Bar below numpad (Multiplayer only) */}
                  {mode === "multiplayer_game" && (
                    <div className="flex items-center justify-center gap-2 w-full max-w-[340px] mx-auto mt-2.5 px-1">
                      {QUICK_REACTION_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleSendEmoji(emoji)}
                          className="w-10 h-10 rounded-[14px] flex items-center justify-center text-xl transition-all duration-150 bg-black/[0.04] dark:bg-white/[0.08] hover:bg-black/[0.08] dark:hover:bg-white/[0.14] hover:scale-110 active:scale-95 cursor-pointer select-none"
                          title={`React ${emoji}`}
                        >
                          <span className="leading-none">{emoji}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Multiplayer Race Progress Leaderboard at bottom */}
              {mode === "multiplayer_game" && (
                <div className="w-full mt-4 px-2">
                  <RaceLeaderboard
                    players={players}
                    myId={roomService.getMyPeerId()}
                    onSendEmoji={handleSendEmoji}
                    latencyMs={latencyMs}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </main>
  );
}
