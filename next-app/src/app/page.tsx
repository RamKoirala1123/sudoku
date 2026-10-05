"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import { MultiplayerMenuModal } from "@/components/MultiplayerMenuModal";
import { MultiplayerLobby } from "@/components/MultiplayerLobby";

type AppMode = "home" | "solo_game" | "multiplayer_lobby" | "multiplayer_game";

interface SavedSession {
  difficulty: Difficulty;
  mistakeRule: MistakeRule;
  roomCode?: string;
  isMultiplayer: boolean;
  score: number;
  timeFormatted: string;
}

interface PlayerStats {
  totalGamesPlayed: number;
  totalGamesWon: number;
  bestTime: string;
  bestScore: number;
}

export default function SudokuApp() {
  // Appearance & Audio state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // App navigation state
  const [mode, setMode] = useState<AppMode>("home");
  const [showMultiplayerMenu, setShowMultiplayerMenu] = useState<boolean>(false);

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
    selectedCell,
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
  } = useSudokuGame(difficulty, mistakeRule);

  // Load user settings, stats, and session on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("sudoku_theme");
      const savedMute = localStorage.getItem("sudoku_muted");
      const savedNick = localStorage.getItem("sudoku_nickname");
      const savedStatsStr = localStorage.getItem("sudoku_stats");
      const savedSessionStr = localStorage.getItem("sudoku_active_session");

      if (savedTheme) {
        setIsDarkMode(savedTheme === "dark");
      } else {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        setIsDarkMode(prefersDark);
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
        } catch {}
      }

      if (savedSessionStr) {
        try {
          setActiveSession(JSON.parse(savedSessionStr));
        } catch {}
      }

      // Check URL hash for direct join (#join=123456 or #room=123456)
      const hash = window.location.hash;
      const match = hash.match(/(?:join|room)=([0-9]{6})/);
      if (match && match[1]) {
        handleJoinRoom(match[1]).catch(() => {});
      }
    }
  }, []);


  // Update theme class and data-theme on document & body
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
      document.body.classList.add("dark");
      document.body.setAttribute("data-theme", "dark");
      localStorage.setItem("sudoku_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
      document.body.classList.remove("dark");
      document.body.setAttribute("data-theme", "light");
      localStorage.setItem("sudoku_theme", "light");
    }
  }, [isDarkMode]);

  const handleToggleTheme = () => {
    setIsDarkMode((prev) => !prev);
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

    // Save active session
    const sess: SavedSession = {
      difficulty: diff,
      mistakeRule,
      isMultiplayer: false,
      score: 0,
      timeFormatted: "00:00",
    };
    setActiveSession(sess);
    localStorage.setItem("sudoku_active_session", JSON.stringify(sess));
  };

  const handleResumeSession = () => {
    if (!activeSession) return;
    setDifficulty(activeSession.difficulty);
    setMistakeRule(activeSession.mistakeRule);
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
  };

  // P2P Room callbacks setup
  const setupRoomListeners = useCallback(() => {
    roomService.onPlayersChanged = (updated) => {
      setPlayers(updated);
    };

    roomService.onGameStarted = (puzzle: SudokuPuzzle, rule: MistakeRule) => {
      setMistakeRule(rule);
      setDifficulty(puzzle.difficulty);
      startWithPuzzle(puzzle, rule);
      setShowCountdown(true);
    };

    roomService.onEmojiReceived = (emoji: string, senderName: string) => {
      const id = `${Date.now()}-${Math.random()}`;
      const leftPercent = 15 + Math.random() * 70;
      setFloatingEmojis((prev) => [...prev, { id, emoji, senderName, leftPercent }]);

      setTimeout(() => {
        setFloatingEmojis((prev) => prev.filter((item) => item.id !== id));
      }, 2800);
    };

    roomService.onLatencyUpdated = (ping) => {
      setLatencyMs(ping);
    };
  }, [startWithPuzzle]);

  // Host a room
  const handleHostRoom = async () => {
    try {
      setShowMultiplayerMenu(false);
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setRoomCode(code);
      setIsHost(true);
      setIsSpectating(false);
      window.location.hash = `#room=${code}`;

      setupRoomListeners();
      await roomService.initializeRoom(code, nickname, true);
      setMode("multiplayer_lobby");
    } catch (err) {
      console.warn("[Multiplayer] Host room creation failed:", err);
      window.location.hash = "";
      setMode("home");
      alert("Could not connect to multiplayer network. Please try again.");
    }
  };

  // Join a room
  const handleJoinRoom = async (code: string) => {
    try {
      setShowMultiplayerMenu(false);
      setRoomCode(code);
      setIsHost(false);
      setIsSpectating(false);
      window.location.hash = `#room=${code}`;

      setupRoomListeners();
      await roomService.initializeRoom(code, nickname, false);
      setMode("multiplayer_lobby");
    } catch (err) {
      console.warn("[Multiplayer] Join room failed:", err);
      window.location.hash = "";
      setMode("home");
      alert("Could not join room. Ensure the host is in the lobby and the code is correct.");
    }
  };


  // Host launches game
  const handleHostStartMatch = () => {
    const puzzle = generateSudoku(difficulty);
    roomService.startGame(puzzle, mistakeRule);
    startWithPuzzle(puzzle, mistakeRule);
    setShowCountdown(true);
  };

  // Countdown completed -> switch to multiplayer game screen
  const handleCountdownComplete = () => {
    setShowCountdown(false);
    setMode("multiplayer_game");
  };

  // Synchronize player progress to room peers
  useEffect(() => {
    if (mode === "multiplayer_game" && gameState.puzzle) {
      const totalCells = 81;
      const filledCorrect = gameState.board.filter(
        (cell, idx) => cell !== 0 && cell === gameState.puzzle!.solution[idx]
      ).length;
      const progress = totalCells > 0 ? filledCorrect / totalCells : 0;

      roomService.broadcastProgress(
        progress,
        gameState.mistakes,
        gameState.isKnockedOut,
        gameState.isFinished
      );
    }
  }, [mode, gameState.board, gameState.mistakes, gameState.isKnockedOut, gameState.isFinished, gameState.puzzle]);

  // When game finishes, update statistics
  useEffect(() => {
    if (gameState.isFinished) {
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
  const handleSendEmoji = (emoji: string) => {
    roomService.broadcastEmoji(emoji);
    const id = `${Date.now()}-${Math.random()}`;
    setFloatingEmojis((prev) => [
      ...prev,
      { id, emoji, senderName: "You", leftPercent: 20 + Math.random() * 60 },
    ]);
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((item) => item.id !== id));
    }, 2800);
  };

  // Leave room or exit match
  const handleLeaveRoom = () => {
    roomService.disconnect();
    window.location.hash = "";
    setMode("home");
    setIsSpectating(false);
    handleDiscardSession();
  };

  const handleBackHome = () => {
    if (mode === "multiplayer_game" || mode === "multiplayer_lobby") {
      handleLeaveRoom();
    } else {
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
      data-theme={isDarkMode ? "dark" : "light"}
      className={`min-h-screen flex flex-col items-center justify-start pb-6 px-3 transition-colors ${
        isDarkMode ? "dark bg-[#11131A] text-[#F3F4FA]" : "bg-[#F6F7FB] text-[#1E2233]"
      }`}
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

      {/* Multiplayer Menu Modal */}
      {showMultiplayerMenu && (
        <MultiplayerMenuModal
          initialNickname={nickname}
          onSaveNickname={handleSaveNickname}
          onHost={handleHostRoom}
          onJoin={handleJoinRoom}
          onClose={() => setShowMultiplayerMenu(false)}
        />
      )}

      {/* Multiplayer Lobby Modal */}
      {mode === "multiplayer_lobby" && (
        <MultiplayerLobby
          isHost={isHost}
          roomCode={roomCode}
          players={players}
          difficulty={difficulty}
          mistakeRule={mistakeRule}
          onDifficultyChange={(d) => setDifficulty(d)}
          onMistakeRuleChange={(r) => setMistakeRule(r)}
          onStartMatch={handleHostStartMatch}
          onLeave={handleLeaveRoom}
        />
      )}

      {/* ========================================================================= */}
      {/* SCREEN 1: FLUTTER HOME SCREEN                                             */}
      {/* ========================================================================= */}
      {mode === "home" && (
        <div className="w-full max-w-[520px] mx-auto pt-6 px-3 flex flex-col animate-fadeIn">
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
                onClick={handleToggleMute}
                className="p-2.5 rounded-full text-[#1E2233] dark:text-[#F3F4FA] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition"
                title={isMuted ? "Unmute Sound" : "Mute Sound"}
              >
                {isMuted ? (
                  <VolumeX className="w-[22px] h-[22px] text-[#FF5D6C]" />
                ) : (
                  <Volume2 className="w-[22px] h-[22px]" />
                )}
              </button>
              <button
                type="button"
                onClick={handleToggleTheme}
                className="p-2.5 rounded-full text-[#1E2233] dark:text-[#F3F4FA] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition"
                title={isDarkMode ? "Light Mode" : "Dark Mode"}
              >
                {isDarkMode ? (
                  <Sun className="w-[22px] h-[22px]" />
                ) : (
                  <Moon className="w-[22px] h-[22px]" />
                )}
              </button>
            </div>
          </div>

          {/* Active Session Resume Banner (Flutter _buildActiveSessionBanner) */}
          {activeSession && (
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
            onClick={() => setShowMultiplayerMenu(true)}
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
                <div className="text-[26px] font-bold text-[#1E2233] dark:text-[#F3F4FA] leading-tight">
                  {stats.totalGamesPlayed}
                </div>
                <span className="text-xs text-[#1E2233]/60 dark:text-[#F3F4FA]/60">
                  Games Played
                </span>
              </div>
              <div>
                <div className="text-[26px] font-bold text-[#1E2233] dark:text-[#F3F4FA] leading-tight">
                  {stats.totalGamesWon}
                </div>
                <span className="text-xs text-[#1E2233]/60 dark:text-[#F3F4FA]/60">
                  Games Won
                </span>
              </div>
              <div>
                <div className="text-[26px] font-bold font-mono text-[#1E2233] dark:text-[#F3F4FA] leading-tight">
                  {stats.bestTime}
                </div>
                <span className="text-xs text-[#1E2233]/60 dark:text-[#F3F4FA]/60">
                  Best Time
                </span>
              </div>
              <div>
                <div className="text-[26px] font-bold text-[#1E2233] dark:text-[#F3F4FA] leading-tight">
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
        <div className="w-full flex flex-col items-center animate-fadeIn max-w-[500px] md:max-w-[920px] mx-auto">
          {/* Top Bar (Difficulty, Controls, Pause) */}
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
            onPause={mode === "solo_game" && gameState.status === "playing" ? handleOpenPause : undefined}
            className="w-full max-w-[490px] md:max-w-[920px] mx-auto px-2 pt-2 pb-1 select-none"
          />

          {/* Spectating Banner */}
          {isSpectating && (
            <div className="w-full max-w-[490px] md:max-w-[920px] mx-auto px-2 mt-2">
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

          {/* Flutter Widescreen 2-column layout (>= 768px) */}
          <div className="hidden md:flex flex-row items-start justify-center gap-6 w-full max-w-[920px] mt-4 px-2">
            {/* Left Column: Board (flex 6, max 490px) */}
            <div className="flex-[6] flex justify-center">
              <div className="w-full max-w-[490px]">
                <SudokuBoard
                  state={gameState}
                  onSelectCell={selectCell}
                  isSpectating={isSpectating}
                  isDarkMode={isDarkMode}
                />
              </div>
            </div>

            {/* Right Column: Controls + 3x3 Grid (flex 4, max 290px) */}
            <div className="flex-[4] max-w-[290px] flex flex-col pt-1">
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
            </div>
          </div>

          {/* Flutter Mobile layout (< 768px) */}
          <div className="flex md:hidden flex-col items-center w-full max-w-[500px]">
            {/* Board (max 480px) */}
            <div className="w-full max-w-[480px]">
              <SudokuBoard
                state={gameState}
                onSelectCell={selectCell}
                isSpectating={isSpectating}
                isDarkMode={isDarkMode}
              />
            </div>

            {/* Mobile Toolbar + 1-row NumberPad */}
            <div className="w-full max-w-[480px] mt-2">
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
            </div>
          </div>

          {/* Multiplayer Race Progress Leaderboard at bottom */}
          {mode === "multiplayer_game" && (
            <div className="w-full max-w-[500px] md:max-w-[920px] mx-auto mt-4 px-2">
              <RaceLeaderboard
                players={players}
                myId={roomService.getMyPeerId()}
                onSendEmoji={handleSendEmoji}
                latencyMs={latencyMs}
              />
            </div>
          )}
        </div>
      )}
    </main>
  );
}
