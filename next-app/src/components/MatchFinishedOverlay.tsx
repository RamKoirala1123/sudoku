"use client";

import React, { useEffect } from "react";
import { Trophy, Medal, RotateCcw, Home } from "lucide-react";
import confetti from "canvas-confetti";
import { PlayerProgress } from "@/lib/types";

interface MatchFinishedOverlayProps {
  isWinner: boolean;
  rank?: number;
  timeFormatted: string;
  score: number;
  mistakes: number;
  players?: PlayerProgress[];
  isMultiplayer?: boolean;
  onPlayAgain?: () => void;
  onBackToHome: () => void;
}

export const MatchFinishedOverlay: React.FC<MatchFinishedOverlayProps> = ({
  isWinner,
  rank = 1,
  timeFormatted,
  score,
  mistakes,
  players = [],
  isMultiplayer = false,
  onPlayAgain,
  onBackToHome,
}) => {
  useEffect(() => {
    if (isWinner || !isMultiplayer) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [isWinner, isMultiplayer]);

  const getRankBadge = (pos: number) => {
    if (pos === 1) return "🥇 1st Place";
    if (pos === 2) return "🥈 2nd Place";
    if (pos === 3) return "🥉 3rd Place";
    return `#${pos} Place`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm sm:max-w-md w-full p-6 text-center shadow-2xl">
        {/* Trophy / Icon */}
        <div className="w-20 h-20 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4 border border-amber-500/20 shadow-inner">
          {isWinner || !isMultiplayer ? (
            <Trophy className="w-10 h-10 animate-pulse" />
          ) : (
            <Medal className="w-10 h-10" />
          )}
        </div>

        <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 mb-1">
          {isMultiplayer ? (isWinner ? "Victory!" : "Match Finished") : "Puzzle Solved!"}
        </h2>

        {isMultiplayer && (
          <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mb-4">
            {getRankBadge(rank)}
          </p>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 my-5 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Time</span>
            <p className="font-mono text-base font-bold text-slate-800 dark:text-slate-200">
              {timeFormatted}
            </p>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Score</span>
            <p className="text-base font-bold text-indigo-600 dark:text-indigo-400">
              {score}
            </p>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Mistakes</span>
            <p className="text-base font-bold text-rose-500">
              {mistakes}
            </p>
          </div>
        </div>

        {/* Multiplayer Podium Recap */}
        {isMultiplayer && players.length > 0 && (
          <div className="mb-5 text-left bg-slate-100 dark:bg-slate-800/40 p-3 rounded-xl max-h-36 overflow-y-auto">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Final Standings
            </span>
            <div className="space-y-1.5 text-xs">
              {players.map((p, idx) => (
                <div key={p.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-400">#{idx + 1}</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
                      {p.name}
                    </span>
                  </div>
                  <span className="font-mono text-slate-500 dark:text-slate-400">
                    {p.isKnockedOut ? "❌ Knocked out" : p.isFinished ? "🏆 Won" : `${Math.round((p.progress ?? p.progressPercent ?? 0) * 100)}%`}
                  </span>

                </div>
              ))}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          {onPlayAgain && (
            <button
              type="button"
              onClick={onPlayAgain}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition active:scale-98 shadow-md shadow-indigo-500/25"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Play Again</span>
            </button>
          )}

          <button
            type="button"
            onClick={onBackToHome}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition active:scale-98"
          >
            <Home className="w-4 h-4" />
            <span>Main Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
