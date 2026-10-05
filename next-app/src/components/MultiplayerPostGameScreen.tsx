"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Trophy,
  Crown,
  Medal,
  RefreshCw,
  Share2,
  Check,
  Home,
  Users,
  Clock,
  Target,
  Zap,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Difficulty, MistakeRule, PlayerProgress } from "@/lib/types";
import { soundService } from "@/lib/sound/soundService";

interface MultiplayerPostGameScreenProps {
  isHost: boolean;
  roomCode: string;
  myId: string;
  difficulty: Difficulty;
  mistakeRule: MistakeRule;
  winner: PlayerProgress | null;
  standings: PlayerProgress[];
  allDefeated: boolean;
  myStats: {
    timeFormatted: string;
    accuracyPercent: number;
    cellsPerMinute: number;
    mistakes: number;
    lives: number;
    isCompleted: boolean;
    isDefeated: boolean;
    rank: number;
  };
  onRematch: () => void;
  onReturnToLobby: () => void;
  onExitHome: () => void;
}

const PLAYER_COLORS = [
  "#5B6CFF", // Indigo/Blue
  "#3DDC97", // Emerald Green
  "#FF9F43", // Coral Orange
  "#FF5D6C", // Rose Pink
  "#A358DF", // Purple
  "#00CFDE", // Teal
];

export const MultiplayerPostGameScreen: React.FC<MultiplayerPostGameScreenProps> = ({
  isHost,
  roomCode,
  myId,
  difficulty,
  mistakeRule,
  winner,
  standings,
  allDefeated,
  myStats,
  onRematch,
  onReturnToLobby,
  onExitHome,
}) => {
  const [copiedShare, setCopiedShare] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const isLocalWinner = winner?.id === myId;

  // Sound effect & Confetti animation on mount
  useEffect(() => {
    if (isLocalWinner) {
      soundService.playCompletion();
    } else {
      soundService.playSuccess();
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener("resize", handleResize);

    // Particle confetti
    const colors = ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEEAD", "#D4A5A5", "#9B59B6"];
    const particles = Array.from({ length: 70 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height * 0.4 - height * 0.3,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedY: Math.random() * 3 + 1.5,
      speedX: (Math.random() - 0.5) * 3,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 8,
      opacity: 1,
    }));

    const startTime = Date.now();

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      const elapsed = Date.now() - startTime;
      const fadeOut = elapsed > 3500 ? Math.max(0, 1 - (elapsed - 3500) / 1500) : 1;

      particles.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX;
        p.rotation += p.rotationSpeed;

        if (p.y > height) {
          p.y = -10;
          p.x = Math.random() * width;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = fadeOut;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });

      if (fadeOut > 0) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [isLocalWinner]);

  // Sort standings: 1st, 2nd, 3rd...
  const sortedStandings = [...standings].sort((a, b) => {
    if (a.isCompleted && !b.isCompleted) return -1;
    if (!a.isCompleted && b.isCompleted) return 1;
    if (!a.isDefeated && b.isDefeated) return -1;
    if (a.isDefeated && !b.isDefeated) return 1;
    if (b.progressPercent !== a.progressPercent) return b.progressPercent - a.progressPercent;
    return b.score - a.score;
  });

  const firstPlace = sortedStandings[0];
  const secondPlace = sortedStandings[1];
  const thirdPlace = sortedStandings[2];
  const otherPlaces = sortedStandings.slice(3);

  // Copy shareable match card (Wordle / Chess.com format)
  const handleCopyShareCard = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://sudoku-duel.app";
    const title = allDefeated
      ? `💀 Sudoku Duel #${roomCode} - All Knocked Out!`
      : `🏆 Sudoku Duel #${roomCode} Winner: ${firstPlace ? firstPlace.name : "Player"}`;

    const lines = [
      title,
      `Difficulty: ${difficulty.toUpperCase()} • Rule: ${mistakeRule.toUpperCase()}`,
      "",
    ];

    sortedStandings.forEach((p, idx) => {
      let medal = `#${idx + 1}`;
      if (idx === 0) medal = "🥇";
      else if (idx === 1) medal = "🥈";
      else if (idx === 2) medal = "🥉";

      const isMe = p.id === myId;
      const statusText = p.isDefeated
        ? "Knocked Out 💀"
        : p.isCompleted
        ? p.timeFormatted ? `Finished in ${p.timeFormatted} ⚡` : "Finished! ⚡"
        : `${Math.round(p.progressPercent * 100)}% completed`;

      lines.push(`${medal} ${p.name}${isMe ? " (You)" : ""}: ${statusText}`);
    });

    lines.push("");
    lines.push(`Play live at: ${origin}/#join=${roomCode}`);

    const cardText = lines.join("\n");
    navigator.clipboard.writeText(cardText).then(() => {
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    });
  };

  return (
    <div className="relative w-full max-w-[540px] lg:max-w-[620px] xl:max-w-[660px] mx-auto px-4 py-6 flex flex-col items-stretch select-none animate-fadeIn">
      {/* Particle Canvas overlay */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-20 w-full h-[400px]"
      />

      {/* Hero Victory / Defeat Header */}
      <div className="text-center mb-6 relative z-10">
        <div className="inline-flex items-center justify-center p-3.5 rounded-full bg-gradient-to-br from-amber-400/20 to-yellow-500/20 border border-amber-400/30 shadow-lg shadow-amber-400/10 mb-3 animate-bounce">
          {allDefeated ? (
            <ShieldAlert className="w-10 h-10 text-[#FF5D6C]" />
          ) : (
            <Trophy className="w-10 h-10 text-amber-400" />
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1E2233] dark:text-[#F3F4FA] leading-tight">
          {allDefeated
            ? "ALL PLAYERS DEFEATED! 💀"
            : isLocalWinner
            ? "VICTORY! YOU WON! 🏆"
            : `${firstPlace?.name || "Player"} WON 1ST PLACE! 🏆`}
        </h1>

        <p className="text-xs sm:text-sm text-[#1E2233]/70 dark:text-[#F3F4FA]/70 mt-1 max-w-[400px] mx-auto leading-snug">
          {allDefeated
            ? "Every player made 3 mistakes and ran out of lives. Better luck next race!"
            : isLocalWinner
            ? "Incredible speed and focus! You solved the puzzle before anyone else."
            : `${firstPlace?.name || "Winner"} finished first! Check the final podium below.`}
        </p>

        {/* Room & Match Settings Badge */}
        <div className="inline-flex items-center gap-2 mt-3 px-3 py-1 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[11px] font-semibold text-[#1E2233]/70 dark:text-[#F3F4FA]/70">
          <span className="capitalize">{difficulty}</span>
          <span>•</span>
          <span className="capitalize">{mistakeRule} Mode</span>
          <span>•</span>
          <span className="font-mono">Room #{roomCode}</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* OLYMPIC-STYLE PODIUM (1st, 2nd, 3rd)                                      */}
      {/* ========================================================================= */}
      <div className="p-5 rounded-[24px] bg-white dark:bg-[#1B1E29] border border-black/[0.08] dark:border-white/[0.08] shadow-md mb-5 relative z-10 overflow-hidden">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-black/[0.06] dark:border-white/[0.06]">
          <span className="text-xs font-black uppercase tracking-wider text-[#1E2233]/60 dark:text-[#F3F4FA]/60 flex items-center gap-1.5">
            <Medal className="w-4 h-4 text-amber-400" />
            Final Race Podium
          </span>
          <span className="text-[11px] font-bold text-[#5B6CFF] dark:text-[#7C8CFF]">
            {sortedStandings.length} Racers
          </span>
        </div>

        {/* Podium Pillars Container */}
        <div className="pt-6 pb-2 px-2 flex items-end justify-center gap-2 sm:gap-3 min-h-[220px]">
          {/* 2ND PLACE (SILVER) - Left */}
          {secondPlace && (
            <div className="flex-1 flex flex-col items-center animate-slideUp">
              {/* Avatar + Badge */}
              <div className="relative mb-2 flex flex-col items-center">
                <div
                  className="w-12 h-12 rounded-full border-2 border-slate-300 dark:border-slate-400 flex items-center justify-center font-bold text-white text-base shadow-md"
                  style={{
                    backgroundColor:
                      PLAYER_COLORS[secondPlace.colorIndex % PLAYER_COLORS.length] || "#A0AEC0",
                  }}
                >
                  {secondPlace.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="absolute -bottom-2 px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-[10px] font-black shadow-xs flex items-center gap-0.5">
                  🥈 2nd
                </div>
              </div>

              {/* Player Name */}
              <span className="text-xs font-bold text-[#1E2233] dark:text-[#F3F4FA] mt-1 text-center truncate max-w-[85px] leading-tight">
                {secondPlace.name}
                {secondPlace.id === myId && " (You)"}
              </span>
              <span className="text-[10px] text-[#1E2233]/60 dark:text-[#F3F4FA]/60 text-center mb-2">
                {secondPlace.isDefeated
                  ? "Defeated"
                  : secondPlace.timeFormatted || `${Math.round(secondPlace.progressPercent * 100)}%`}
              </span>

              {/* Pillar 2 */}
              <div className="w-full h-[90px] rounded-t-[14px] bg-gradient-to-b from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 border-t-2 border-slate-300 dark:border-slate-500 shadow-inner flex items-center justify-center">
                <span className="text-3xl font-black text-slate-400/80 dark:text-slate-500/80 font-mono">
                  2
                </span>
              </div>
            </div>
          )}

          {/* 1ST PLACE (GOLD) - Center */}
          {firstPlace && (
            <div className="flex-1 flex flex-col items-center animate-slideUp z-10">
              {/* Crown + Avatar */}
              <div className="relative mb-2 flex flex-col items-center">
                <Crown className="w-6 h-6 text-amber-400 animate-bounce mb-0.5 drop-shadow-[0_2px_4px_rgba(245,158,11,0.5)]" />
                <div
                  className="w-14 h-14 rounded-full border-[3px] border-amber-400 flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-amber-400/25 ring-4 ring-amber-400/20"
                  style={{
                    backgroundColor:
                      PLAYER_COLORS[firstPlace.colorIndex % PLAYER_COLORS.length] || "#F59E0B",
                  }}
                >
                  {firstPlace.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="absolute -bottom-2 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-[11px] font-black shadow-sm flex items-center gap-0.5">
                  🥇 1st
                </div>
              </div>

              {/* Winner Name */}
              <span className="text-sm font-extrabold text-[#1E2233] dark:text-[#F3F4FA] mt-1 text-center truncate max-w-[100px] leading-tight">
                {firstPlace.name}
                {firstPlace.id === myId && " (You)"}
              </span>
              <span className="text-[11px] font-semibold text-amber-500 dark:text-amber-400 text-center mb-2">
                {firstPlace.isCompleted
                  ? firstPlace.timeFormatted || "Winner ⚡"
                  : `${Math.round(firstPlace.progressPercent * 100)}%`}
              </span>

              {/* Pillar 1 */}
              <div className="w-full h-[125px] rounded-t-[16px] bg-gradient-to-b from-amber-200 via-amber-300 to-amber-400 dark:from-amber-600/60 dark:via-amber-700/60 dark:to-amber-800/60 border-t-[3px] border-amber-300 dark:border-amber-400 shadow-md flex items-center justify-center">
                <span className="text-4xl font-black text-amber-600/60 dark:text-amber-300/60 font-mono">
                  1
                </span>
              </div>
            </div>
          )}

          {/* 3RD PLACE (BRONZE) - Right */}
          {thirdPlace && (
            <div className="flex-1 flex flex-col items-center animate-slideUp">
              {/* Avatar + Badge */}
              <div className="relative mb-2 flex flex-col items-center">
                <div
                  className="w-11 h-11 rounded-full border-2 border-amber-700 dark:border-amber-600 flex items-center justify-center font-bold text-white text-sm shadow-md"
                  style={{
                    backgroundColor:
                      PLAYER_COLORS[thirdPlace.colorIndex % PLAYER_COLORS.length] || "#B45309",
                  }}
                >
                  {thirdPlace.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="absolute -bottom-2 px-2 py-0.5 rounded-full bg-amber-800 text-white text-[10px] font-black shadow-xs flex items-center gap-0.5">
                  🥉 3rd
                </div>
              </div>

              {/* Player Name */}
              <span className="text-xs font-bold text-[#1E2233] dark:text-[#F3F4FA] mt-1 text-center truncate max-w-[85px] leading-tight">
                {thirdPlace.name}
                {thirdPlace.id === myId && " (You)"}
              </span>
              <span className="text-[10px] text-[#1E2233]/60 dark:text-[#F3F4FA]/60 text-center mb-2">
                {thirdPlace.isDefeated
                  ? "Defeated"
                  : thirdPlace.timeFormatted || `${Math.round(thirdPlace.progressPercent * 100)}%`}
              </span>

              {/* Pillar 3 */}
              <div className="w-full h-[65px] rounded-t-[14px] bg-gradient-to-b from-amber-100 to-amber-200 dark:from-stone-700 dark:to-stone-800 border-t-2 border-amber-600 dark:border-amber-700 shadow-inner flex items-center justify-center">
                <span className="text-2xl font-black text-amber-800/60 dark:text-stone-500/80 font-mono">
                  3
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 4th+ Positions List */}
        {otherPlaces.length > 0 && (
          <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.06] space-y-2">
            {otherPlaces.map((p, idx) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-2 rounded-[12px] bg-[#F1F3FA] dark:bg-[#11131A] text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 font-mono font-bold text-[#1E2233]/50 dark:text-[#F3F4FA]/50">
                    #{idx + 4}
                  </span>
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor:
                        PLAYER_COLORS[p.colorIndex % PLAYER_COLORS.length] || "#718096",
                    }}
                  />
                  <span className="font-semibold text-[#1E2233] dark:text-[#F3F4FA]">
                    {p.name}
                    {p.id === myId && " (You)"}
                  </span>
                </div>
                <span className="text-[#1E2233]/60 dark:text-[#F3F4FA]/60 font-medium">
                  {p.isDefeated ? "Knocked Out 💀" : `${Math.round(p.progressPercent * 100)}%`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* YOUR MATCH STATS BREAKDOWN                                               */}
      {/* ========================================================================= */}
      <div className="p-4 rounded-[20px] bg-white dark:bg-[#1B1E29] border border-black/[0.08] dark:border-white/[0.08] shadow-xs mb-5">
        <span className="text-xs font-bold text-[#1E2233]/70 dark:text-[#F3F4FA]/70 uppercase tracking-wider block mb-3">
          Your Performance
        </span>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Time */}
          <div className="p-3 rounded-[14px] bg-[#F1F3FA] dark:bg-[#11131A] text-center">
            <Clock className="w-4 h-4 text-[#5B6CFF] mx-auto mb-1" />
            <span className="text-base font-black text-[#1E2233] dark:text-[#F3F4FA] block font-mono">
              {myStats.timeFormatted || "--:--"}
            </span>
            <span className="text-[10px] text-[#1E2233]/50 dark:text-[#F3F4FA]/50 block">
              Match Time
            </span>
          </div>

          {/* Accuracy */}
          <div className="p-3 rounded-[14px] bg-[#F1F3FA] dark:bg-[#11131A] text-center">
            <Target className="w-4 h-4 text-[#3DDC97] mx-auto mb-1" />
            <span className="text-base font-black text-[#3DDC97] block font-mono">
              {myStats.accuracyPercent ?? 100}%
            </span>
            <span className="text-[10px] text-[#1E2233]/50 dark:text-[#F3F4FA]/50 block">
              Accuracy
            </span>
          </div>

          {/* Speed */}
          <div className="p-3 rounded-[14px] bg-[#F1F3FA] dark:bg-[#11131A] text-center">
            <Zap className="w-4 h-4 text-amber-500 mx-auto mb-1" />
            <span className="text-base font-black text-[#1E2233] dark:text-[#F3F4FA] block font-mono">
              {myStats.cellsPerMinute ?? 0}
            </span>
            <span className="text-[10px] text-[#1E2233]/50 dark:text-[#F3F4FA]/50 block">
              Cells / Min
            </span>
          </div>

          {/* Mistakes */}
          <div className="p-3 rounded-[14px] bg-[#F1F3FA] dark:bg-[#11131A] text-center">
            <ShieldAlert className="w-4 h-4 text-[#FF5D6C] mx-auto mb-1" />
            <span className="text-base font-black text-[#FF5D6C] block font-mono">
              {myStats.mistakes} / {mistakeRule === "hardcore" ? 1 : mistakeRule === "casual" ? "∞" : 3}
            </span>
            <span className="text-[10px] text-[#1E2233]/50 dark:text-[#F3F4FA]/50 block">
              Mistakes
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1-CLICK SHAREABLE MATCH CARD (Wordle / Chess.com style)                  */}
      {/* ========================================================================= */}
      <button
        type="button"
        onClick={handleCopyShareCard}
        className="w-full py-3.5 px-4 rounded-[16px] bg-[#5B6CFF]/10 hover:bg-[#5B6CFF]/20 text-[#5B6CFF] dark:text-[#7C8CFF] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer mb-5 border border-[#5B6CFF]/20"
      >
        {copiedShare ? (
          <>
            <Check className="w-4 h-4 text-[#3DDC97]" />
            <span className="text-[#3DDC97]">Match Summary Copied to Clipboard! ✨</span>
          </>
        ) : (
          <>
            <Share2 className="w-4 h-4" />
            <span>Copy Shareable Match Card (Wordle Style)</span>
          </>
        )}
      </button>

      {/* ========================================================================= */}
      {/* REMATCH & NAVIGATION CONTROLS                                             */}
      {/* ========================================================================= */}
      <div className="space-y-2.5">
        {isHost ? (
          <>
            {/* Host: Play Rematch with New Puzzle */}
            {sortedStandings.length < 2 ? (
              <button
                type="button"
                disabled
                className="w-full py-4 rounded-[18px] bg-black/[0.06] dark:bg-white/[0.08] text-[#1E2233]/40 dark:text-[#F3F4FA]/40 font-bold text-sm sm:text-base border border-black/[0.06] dark:border-white/[0.06] flex items-center justify-center gap-2 cursor-not-allowed select-none"
              >
                <Users className="w-5 h-5 opacity-40" />
                <span>Opponents Left (Return to Lobby to Play)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onRematch}
                className="w-full py-4 rounded-[18px] bg-gradient-to-r from-[#5B6CFF] to-[#7C8CFF] hover:opacity-95 text-white font-black text-base shadow-lg shadow-[#5B6CFF]/30 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-5 h-5 fill-none" />
                <span>Play Rematch (New Puzzle)</span>
              </button>
            )}

            {/* Host: Return to Lobby */}
            <button
              type="button"
              onClick={onReturnToLobby}
              className="w-full py-3 rounded-[16px] bg-white dark:bg-[#1B1E29] hover:bg-black/5 dark:hover:bg-white/5 border border-black/[0.08] dark:border-white/[0.08] text-[#1E2233] dark:text-[#F3F4FA] font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Users className="w-4 h-4 text-[#5B6CFF]" />
              <span>Return to Lobby (Change Settings)</span>
            </button>
          </>
        ) : (
          /* Guest: Waiting for Host */
          <div className="p-4 rounded-[18px] bg-[#5B6CFF]/10 dark:bg-[#5B6CFF]/15 border border-[#5B6CFF]/20 flex items-center gap-3 text-center">
            <div className="w-9 h-9 rounded-full bg-[#5B6CFF]/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-[#5B6CFF] animate-pulse" />
            </div>
            <div className="text-left flex-1">
              <span className="text-xs font-bold text-[#5B6CFF] dark:text-[#7C8CFF] block">
                Waiting for Host to Start Rematch
              </span>
              <span className="text-[11px] text-[#1E2233]/70 dark:text-[#F3F4FA]/70 block mt-0.5">
                The host can launch a new puzzle immediately or return the party to the room lobby.
              </span>
            </div>
          </div>
        )}

        {/* Exit to Home */}
        <button
          type="button"
          onClick={onExitHome}
          className="w-full py-3 rounded-[16px] text-xs font-bold text-[#1E2233]/60 dark:text-[#F3F4FA]/60 hover:text-red-500 transition flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span>Exit to Main Menu</span>
        </button>
      </div>
    </div>
  );
};
