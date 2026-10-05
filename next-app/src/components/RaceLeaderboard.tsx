"use client";

import React from "react";
import { Crown, Skull, CheckCircle2, Wifi } from "lucide-react";
import { PlayerProgress } from "@/lib/types";

interface RaceLeaderboardProps {
  players: PlayerProgress[];
  myId: string;
  onSendEmoji: (emoji: string) => void;
  latencyMs?: number;
}

const EMOJI_LIST = ["🔥", "🚀", "😎", "👏", "😱", "😭", "🤯", "💀"];

export const RaceLeaderboard: React.FC<RaceLeaderboardProps> = ({
  players,
  myId,
  onSendEmoji,
  latencyMs,
}) => {
  // Sort players by finished rank first, then progress descending, then mistakes ascending
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.isFinished && !b.isFinished) return -1;
    if (!a.isFinished && b.isFinished) return 1;
    if (a.isKnockedOut && !b.isKnockedOut) return 1;
    if (!a.isKnockedOut && b.isKnockedOut) return -1;
    const progB = b.progress ?? b.progressPercent ?? 0;
    const progA = a.progress ?? a.progressPercent ?? 0;
    return progB - progA || a.mistakes - b.mistakes;
  });

  return (
    <div className="w-full max-w-[490px] mx-auto px-2 mt-3 select-none">
      {/* Header bar */}
      <div className="flex items-center justify-between px-2 pb-1.5 text-xs text-slate-500 dark:text-slate-400 font-semibold tracking-wide">
        <span>RACE PROGRESS ({players.length} Players)</span>
        {latencyMs !== undefined && (
          <div className="flex items-center gap-1 text-[11px] font-mono">
            <Wifi
              className={`w-3.5 h-3.5 ${
                latencyMs < 80
                  ? "text-emerald-500"
                  : latencyMs < 180
                  ? "text-amber-500"
                  : "text-rose-500"
              }`}
            />
            <span>{latencyMs}ms</span>
          </div>
        )}
      </div>

      {/* Players Progress Bars */}
      <div className="space-y-1.5 bg-slate-100/80 dark:bg-slate-800/60 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
        {sortedPlayers.map((p, idx) => {
          const isMe = p.id === myId;
          const prog = p.progress ?? p.progressPercent ?? 0;
          const percent = Math.min(100, Math.max(0, Math.round(prog * 100)));


          return (
            <div
              key={p.id}
              className={`p-2 rounded-xl transition-all ${
                isMe
                  ? "bg-white dark:bg-slate-800 shadow-sm border border-indigo-200 dark:border-indigo-900/50"
                  : "bg-slate-200/50 dark:bg-slate-900/40"
              }`}
            >
              {/* Info row */}
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] w-4 text-slate-400 font-bold">
                    #{idx + 1}
                  </span>
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: p.color || "#6366f1" }}
                  />
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[120px] sm:max-w-[160px]">
                    {p.name} {isMe ? "(You)" : ""}
                  </span>
                  {p.isHost && (
                    <Crown className="w-3 h-3 text-amber-500 flex-shrink-0" />
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {p.isKnockedOut ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded">
                      <Skull className="w-3 h-3" /> Knocked Out
                    </span>
                  ) : p.isFinished ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      <CheckCircle2 className="w-3 h-3" /> Finished
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400">
                        {p.mistakes} ❌
                      </span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                        {percent}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress track */}
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300 ease-out"
                  style={{
                    width: `${percent}%`,
                    backgroundColor: p.isKnockedOut
                      ? "#f43f5e"
                      : p.color || "#6366f1",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Emoji Picker Bar */}
      <div className="mt-2.5 flex items-center justify-between px-2 py-1.5 bg-white dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <span className="text-[11px] font-semibold text-slate-400 uppercase mr-1">
          React:
        </span>
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {EMOJI_LIST.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onSendEmoji(emoji)}
              className="text-lg hover:scale-125 active:scale-95 transition-transform px-1 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
