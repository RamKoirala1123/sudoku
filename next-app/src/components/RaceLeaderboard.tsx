"use client";

import React, { useState } from "react";
import { Crown, Skull, CheckCircle2, Wifi, Trophy, ChevronDown, ChevronUp } from "lucide-react";
import { PlayerProgress } from "@/lib/types";

interface RaceLeaderboardProps {
  players: PlayerProgress[];
  myId: string;
  onSendEmoji?: (emoji: string) => void;
  latencyMs?: number;
  className?: string;
  showReactions?: boolean;
  compact?: boolean;
}

const EMOJI_LIST = ["🔥", "👏", "🤯", "😎", "😱", "💀"];

export const RaceLeaderboard: React.FC<RaceLeaderboardProps> = ({
  players,
  myId,
  onSendEmoji,
  latencyMs,
  className = "",
  showReactions = false,
  compact = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Sort players by rank (or progress/mistakes)
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.isFinished && !b.isFinished) return -1;
    if (!a.isFinished && b.isFinished) return 1;
    if (a.isKnockedOut && !b.isKnockedOut) return 1;
    if (!a.isKnockedOut && b.isKnockedOut) return -1;
    const progB = b.progress ?? b.progressPercent ?? 0;
    const progA = a.progress ?? a.progressPercent ?? 0;
    return progB - progA || a.mistakes - b.mistakes;
  });

  const localPlayer =
    sortedPlayers.find((p) => p.id === myId) ||
    (sortedPlayers.length > 0 ? sortedPlayers[0] : null);

  const displayedPlayers =
    isExpanded || sortedPlayers.length <= 4 || compact
      ? sortedPlayers
      : sortedPlayers.slice(0, 3);

  const myRank = localPlayer
    ? sortedPlayers.findIndex((p) => p.id === myId) + 1
    : 1;

  return (
    <div className={`w-full select-none ${className}`}>
      {/* Leaderboard card */}
      <div className={`bg-[#F1F3FA] dark:bg-[#1E2233] rounded-[16px] border border-black/[0.06] dark:border-white/[0.08] shadow-xs ${
        compact ? "p-2.5" : "p-3"
      }`}>
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-2 border-b border-black/[0.04] dark:border-white/[0.04] mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Trophy className="w-3.5 h-3.5 text-[#5B6CFF] dark:text-[#7C8CFF] shrink-0" />
            <span className="text-xs font-bold text-[#1E2233] dark:text-[#F3F4FA] truncate">
              Live Race ({sortedPlayers.length})
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {localPlayer && (
              <div
                className="px-1.5 py-0.5 rounded-[8px] text-[10px] font-bold"
                style={{
                  backgroundColor: `${localPlayer.color || "#5B6CFF"}22`,
                  color: localPlayer.color || "#5B6CFF",
                }}
              >
                #{myRank}
              </div>
            )}

            {latencyMs !== undefined && (
              <div className="flex items-center gap-0.5 text-[10px] font-mono text-[#1E2233]/60 dark:text-[#F3F4FA]/60">
                <Wifi
                  className={`w-3 h-3 ${
                    latencyMs < 80
                      ? "text-[#3DDC97]"
                      : latencyMs < 180
                      ? "text-[#FFC24B]"
                      : "text-[#FF5D6C]"
                  }`}
                />
                <span>{latencyMs}ms</span>
              </div>
            )}

            {!compact && sortedPlayers.length > 3 && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-0.5 text-[#1E2233]/60 dark:text-[#F3F4FA]/60 hover:text-[#1E2233] cursor-pointer"
              >
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* Players Progress Cards */}
        <div className={`space-y-1.5 ${compact ? "max-h-[160px] overflow-y-auto no-scrollbar" : ""}`}>
          {displayedPlayers.map((p, idx) => {
            const isMe = p.id === myId;
            const prog = p.progress ?? p.progressPercent ?? 0;
            const percent = Math.min(100, Math.max(0, Math.round(prog * 100)));
            const playerColor = p.color || "#5B6CFF";

            return (
              <div
                key={p.id}
                className={`p-1.5 sm:p-2 rounded-[12px] transition-all ${
                  isMe
                    ? "bg-white dark:bg-[#1B1E29] shadow-xs border border-[#5B6CFF]/30 dark:border-[#7C8CFF]/30"
                    : "bg-white/60 dark:bg-[#1B1E29]/60 border border-black/[0.04] dark:border-white/[0.04]"
                }`}
              >
                {/* Row info */}
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono text-[10px] w-3 text-[#1E2233]/50 dark:text-[#F3F4FA]/50 font-bold shrink-0">
                      #{idx + 1}
                    </span>
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: playerColor }}
                    />
                    <span className="font-medium text-[#1E2233] dark:text-[#F3F4FA] truncate max-w-[100px] sm:max-w-[130px]">
                      {p.name} {isMe ? "(You)" : ""}
                    </span>
                    {p.isHost && (
                      <Crown className="w-2.5 h-2.5 text-[#FFC24B] shrink-0" />
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {p.isKnockedOut || p.isDefeated ? (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-[#FF5D6C] bg-[#FF5D6C]/10 px-1 py-0.2 rounded">
                        <Skull className="w-2.5 h-2.5" /> Out
                      </span>
                    ) : p.isFinished || p.isCompleted ? (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-[#3DDC97] bg-[#3DDC97]/10 px-1 py-0.2 rounded">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Won
                      </span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-[#1E2233]/50 dark:text-[#F3F4FA]/50">
                          {p.mistakes}❌
                        </span>
                        <span className="font-mono font-bold text-[11px] text-[#1E2233] dark:text-[#F3F4FA]">
                          {percent}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress track */}
                <div className="w-full h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300 ease-out"
                    style={{
                      width: `${percent}%`,
                      backgroundColor: (p.isKnockedOut || p.isDefeated) ? "#FF5D6C" : playerColor,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Optional Floating Emoji Picker Bar */}
        {showReactions && onSendEmoji && (
          <div className="mt-2 pt-2 border-t border-black/[0.05] dark:border-white/[0.05] flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#1E2233]/50 dark:text-[#F3F4FA]/50 uppercase mr-1">
              React:
            </span>
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              {EMOJI_LIST.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onSendEmoji(emoji)}
                  className="text-base hover:scale-125 active:scale-95 transition-transform px-1 py-0.5 rounded hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
