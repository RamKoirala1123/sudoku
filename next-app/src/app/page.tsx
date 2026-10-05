"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Trophy,
  Users,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Moon,
  Sun,
  ShieldAlert,
  Zap,
  HeartHandshake,
  Sparkles,
} from "lucide-react";

import { Difficulty, MistakeRule, PlayerProgress, SudokuPuzzle } from "@/lib/types";
import { generateSudoku } from "@/lib/sudoku/engine";
import { soundService } from "@/lib/sound/soundService";
import { roomService } from "@/lib/p2p/roomService";
import { useSudokuGame } from "@/lib/sudoku/useSudokuGame";

import { TopBar } from "@/components/TopBar";
import { SudokuBoard } from "@/components/SudokuBoard";
import { NumberPad } from "@/components/NumberPad";
import { RaceLeaderboard } from "@/components/RaceLeaderboard";
import { FloatingEmojiOverlay, FloatingEmoji } from "@/components/FloatingEmojiOverlay";
import { CountdownOverlay } from "@/components/CountdownOverlay";
import { KnockoutOverlay } from "@/components/KnockoutOverlay";
import { MatchFinishedOverlay } from "@/components/MatchFinishedOverlay";
import { MultiplayerMenuModal } from "@/components/MultiplayerMenuModal";
import { MultiplayerLobby } from "@/components/MultiplayerLobby";

type AppMode = "home" | "solo_game" | "multiplayer_lobby" | "multiplayer_game";

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
    toggleNotesMode,
    remainingCounts,
    timeFormatted,
  } = useSudokuGame(difficulty, mistakeRule);

  // Load user settings on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("sudoku_theme");
      const savedMute = localStorage.getItem("sudoku_muted");
      const savedNick = localStorage.getItem("sudoku_nickname");

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

      // Check URL hash for direct join (#join=123456 or #room=123456)
      const hash = window.location.hash;
      const match = hash.match(/(?:join|room)=([0-9]{6})/);
      if (match && match[1]) {
        handleJoinRoom(match[1]);
      }
    }
  }, []);

  // Update theme class on document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("sudoku_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
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
  }, [startNewGame]);

  // Host a room
  const handleHostRoom = async () => {
    setShowMultiplayerMenu(false);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setRoomCode(code);
    setIsHost(true);
    setIsSpectating(false);
    window.location.hash = `#room=${code}`;

    setupRoomListeners();
    await roomService.initializeRoom(code, nickname, true);
    setMode("multiplayer_lobby");
  };

  // Join a room
  const handleJoinRoom = async (code: string) => {
    setShowMultiplayerMenu(false);
    setRoomCode(code);
    setIsHost(false);
    setIsSpectating(false);
    window.location.hash = `#room=${code}`;

    setupRoomListeners();
    await roomService.initializeRoom(code, nickname, false);
    setMode("multiplayer_lobby");
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
  };

  const handleBackHome = () => {
    if (mode === "multiplayer_game" || mode === "multiplayer_lobby") {
      handleLeaveRoom();
    } else {
      setMode("home");
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-between pb-6 px-3">
      {/* Floating Emojis */}
      <FloatingEmojiOverlay emojis={floatingEmojis} />

      {/* 3-2-1 Countdown Overlay */}
      {showCountdown && <CountdownOverlay onComplete={handleCountdownComplete} />}

      {/* Knockout Modal (Max Mistakes) */}
      {gameState.isKnockedOut && !isSpectating && (
        <KnockoutOverlay
          mistakeRule={mistakeRule}
          mistakes={gameState.mistakes}
          maxMistakes={gameState.maxMistakes}
          isMultiplayer={mode === "multiplayer_game"}
          onSpectate={mode === "multiplayer_game" ? () => setIsSpectating(true) : undefined}
          onRestart={mode === "solo_game" ? () => startNewGame(difficulty, mistakeRule) : undefined}
          onLeave={handleBackHome}
        />
      )}

      {/* Match Finished Overlay (Win / Complete) */}
      {gameState.isFinished && (
        <MatchFinishedOverlay
          isWinner={true}
          rank={1}
          timeFormatted={timeFormatted}
          score={gameState.score}
          mistakes={gameState.mistakes}
          players={players}
          isMultiplayer={mode === "multiplayer_game"}
          onPlayAgain={
            mode === "solo_game"
              ? () => startNewGame(difficulty, mistakeRule)
              : undefined
          }
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

      {/* SCREEN 1: HOME SCREEN */}
      {mode === "home" && (
        <div className="w-full max-w-md mx-auto pt-8 flex flex-col items-center">
          {/* Top Bar for Theme & Sound */}
          <div className="w-full flex items-center justify-between mb-6 px-2">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-indigo-500/25">
                S
              </div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-slate-100">
                Sudoku<span className="text-indigo-600 dark:text-indigo-400">.io</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleMute}
                className="p-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-xs active:scale-95"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <VolumeX className="w-5 h-5 text-rose-500" /> : <Volume2 className="w-5 h-5 text-indigo-500" />}
              </button>
              <button
                type="button"
                onClick={handleToggleTheme}
                className="p-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-xs active:scale-95"
                title={isDarkMode ? "Light Mode" : "Dark Mode"}
              >
                {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-500" />}
              </button>
            </div>
          </div>

          {/* Multiplayer Banner Card */}
          <div className="w-full mb-6 p-5 rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-sky-700 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/20 text-white backdrop-blur-xs flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-300" /> Serverless P2P WebRTC
                </span>
              </div>
              <h2 className="text-2xl font-black mb-1">Multiplayer Duel</h2>
              <p className="text-xs text-indigo-100/90 mb-4 max-w-[280px]">
                Race head-to-head with friends in real-time. Share a 6-digit room PIN or direct invite link!
              </p>
              <button
                type="button"
                onClick={() => setShowMultiplayerMenu(true)}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-indigo-700 hover:bg-slate-100 font-bold text-sm shadow-md transition active:scale-95"
              >
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Play with Friends</span>
              </button>
            </div>
            {/* Background design glow */}
            <div className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none" />
          </div>

          {/* Solo Play Section */}
          <div className="w-full">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Single Player Puzzles
              </h3>
            </div>

            {/* Difficulty Cards */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                {
                  id: "easy" as Difficulty,
                  title: "Easy",
                  sub: "Great for warm-up",
                  color: "border-emerald-500/30 hover:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400",
                },
                {
                  id: "medium" as Difficulty,
                  title: "Medium",
                  sub: "Classic balance",
                  color: "border-amber-500/30 hover:border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400",
                },
                {
                  id: "hard" as Difficulty,
                  title: "Hard",
                  sub: "Requires advanced logic",
                  color: "border-rose-500/30 hover:border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400",
                },
                {
                  id: "expert" as Difficulty,
                  title: "Expert",
                  sub: "For master solvers",
                  color: "border-purple-500/30 hover:border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400",
                },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleStartSolo(item.id)}
                  className={`p-4 rounded-2xl border text-left transition active:scale-95 group ${item.color}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-base font-bold capitalize text-slate-900 dark:text-slate-100">
                      {item.title}
                    </span>
                    <Play className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">
                    {item.sub}
                  </span>
                </button>
              ))}
            </div>

            {/* Mistake Rule Preference Selector */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs mb-6">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2.5">
                Game Rules
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "standard" as MistakeRule, label: "3 Mistakes", icon: ShieldAlert },
                  { id: "hardcore" as MistakeRule, label: "Sudden Death", icon: Zap },
                  { id: "casual" as MistakeRule, label: "Casual (+30s)", icon: HeartHandshake },
                ].map((rule) => {
                  const Icon = rule.icon;
                  const isSelected = mistakeRule === rule.id;
                  return (
                    <button
                      key={rule.id}
                      type="button"
                      onClick={() => setMistakeRule(rule.id)}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition active:scale-95 ${
                        isSelected
                          ? "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold"
                          : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <Icon className="w-4 h-4 mb-1" />
                      <span className="text-[11px] leading-tight">{rule.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SCREEN 2: GAME SCREEN (SOLO OR MULTIPLAYER RACE) */}
      {(mode === "solo_game" || mode === "multiplayer_game") && (
        <div className="w-full flex flex-col items-center animate-fadeIn">
          {/* Header Stats */}
          <TopBar
            difficulty={difficulty}
            mistakeRule={mistakeRule}
            mistakes={gameState.mistakes}
            maxMistakes={gameState.maxMistakes}
            score={gameState.score}
            timeFormatted={timeFormatted}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            isDarkMode={isDarkMode}
            onToggleTheme={handleToggleTheme}
            onBack={handleBackHome}
          />

          {/* Multiplayer Race Progress Leaderboard */}
          {mode === "multiplayer_game" && (
            <RaceLeaderboard
              players={players}
              myId={roomService.getMyPeerId()}
              onSendEmoji={handleSendEmoji}
              latencyMs={latencyMs}
            />
          )}

          {/* Sudoku 9x9 Board */}
          <SudokuBoard
            state={gameState}
            onSelectCell={selectCell}
            isSpectating={isSpectating}
          />

          {/* Number Pad & Controls */}
          <NumberPad
            remainingCounts={remainingCounts}
            isNotesMode={isNotesMode}
            onToggleNotes={toggleNotesMode}
            onInputNumber={inputNumber}
            onErase={eraseCell}
            onUndo={undo}
            onRestart={
              mode === "solo_game"
                ? () => startNewGame(difficulty, mistakeRule)
                : undefined
            }
            disabled={gameState.isFinished || (gameState.isKnockedOut && isSpectating)}
          />
        </div>
      )}
    </main>
  );
}
