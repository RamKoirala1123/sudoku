"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  Copy,
  Check,
  Share2,
  Users,
  Play,
  Clock,
  Shield,
  Sparkles,
} from "lucide-react";
import { Difficulty, MistakeRule, PlayerProgress } from "@/lib/types";

interface MultiplayerLobbyScreenProps {
  isHost: boolean;
  roomCode: string;
  players: PlayerProgress[];
  difficulty: Difficulty;
  mistakeRule: MistakeRule;
  onDifficultyChange: (diff: Difficulty) => void;
  onMistakeRuleChange: (rule: MistakeRule) => void;
  onStartMatch: () => void;
  onLeave: () => void;
}

const PLAYER_COLORS = [
  "#5B6CFF", // Indigo/Blue (Host)
  "#3DDC97", // Emerald Green
  "#FF9F43", // Coral Orange
  "#FF5D6C", // Rose Pink
  "#A358DF", // Purple
  "#00CFDE", // Teal
];

export const MultiplayerLobbyScreen: React.FC<MultiplayerLobbyScreenProps> = ({
  isHost,
  roomCode,
  players,
  difficulty,
  mistakeRule,
  onDifficultyChange,
  onMistakeRuleChange,
  onStartMatch,
  onLeave,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    });
  };

  const handleCopyLink = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const joinUrl = `${origin}/#join=${roomCode}`;
    navigator.clipboard.writeText(joinUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  const difficulties: { id: Difficulty; label: string }[] = [
    { id: "easy", label: "Easy" },
    { id: "medium", label: "Medium" },
    { id: "hard", label: "Hard" },
    { id: "difficult", label: "Difficult" },
    { id: "extreme", label: "Extreme" },
  ];

  const mistakeRules: { id: MistakeRule; label: string; sub: string }[] = [
    { id: "standard", label: "Standard", sub: "3 Mistakes" },
    { id: "hardcore", label: "Hardcore", sub: "1 Mistake" },
    { id: "casual", label: "Casual", sub: "Unlimited" },
  ];

  return (
    <div className="w-full max-w-[520px] lg:max-w-[580px] xl:max-w-[620px] mx-auto px-4 py-6 flex flex-col items-stretch select-none animate-fadeIn">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-black/[0.06] dark:border-white/[0.06]">
        <button
          type="button"
          onClick={onLeave}
          className="flex items-center gap-1.5 text-sm font-semibold text-[#1E2233]/70 dark:text-[#F3F4FA]/70 hover:text-red-500 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Leave</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#3DDC97] animate-pulse" />
          <h1 className="text-base font-black tracking-tight text-[#1E2233] dark:text-[#F3F4FA]">
            Room Lobby
          </h1>
        </div>

        <div className="w-12" />
      </div>

      {/* Room Code & Sharing Card */}
      <div className="p-5 rounded-[22px] bg-white dark:bg-[#1B1E29] border border-black/[0.08] dark:border-white/[0.08] shadow-xs mb-5 text-center">
        <span className="text-[11px] font-bold text-[#1E2233]/50 dark:text-[#F3F4FA]/50 uppercase tracking-widest block mb-1">
          Room Code
        </span>
        <div className="text-4xl sm:text-5xl font-mono font-black tracking-[0.25em] text-[#5B6CFF] dark:text-[#7C8CFF] my-2 select-all">
          {roomCode}
        </div>
        <p className="text-xs text-[#1E2233]/60 dark:text-[#F3F4FA]/60 mb-4">
          Share this 6-digit code or link with friends to race in real time.
        </p>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handleCopyCode}
            className="py-2.5 px-3 rounded-[14px] bg-[#F1F3FA] dark:bg-[#11131A] hover:bg-black/5 dark:hover:bg-white/5 text-[#1E2233] dark:text-[#F3F4FA] font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            {copiedCode ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#3DDC97]" />
                <span className="text-[#3DDC97]">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#1E2233]/50 dark:text-[#F3F4FA]/50" />
                <span>Copy Code</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            className="py-2.5 px-3 rounded-[14px] bg-[#5B6CFF]/10 dark:bg-[#5B6CFF]/20 hover:bg-[#5B6CFF]/20 text-[#5B6CFF] dark:text-[#7C8CFF] font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#3DDC97]" />
                <span className="text-[#3DDC97]">Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span>Copy Invite Link</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Match Configuration Card */}
      <div className="p-4 rounded-[20px] bg-white dark:bg-[#1B1E29] border border-black/[0.08] dark:border-white/[0.08] shadow-xs mb-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-[#1E2233]/70 dark:text-[#F3F4FA]/70 uppercase tracking-wider">
            Match Settings
          </span>
          <span className="text-[11px] font-semibold text-[#1E2233]/40 dark:text-[#F3F4FA]/40">
            {isHost ? "Host can modify" : "Set by Host"}
          </span>
        </div>

        {/* Difficulty */}
        <div className="mb-3.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1E2233]/80 dark:text-[#F3F4FA]/80 mb-2">
            <Clock className="w-3.5 h-3.5 text-[#5B6CFF]" />
            <span>Difficulty</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {difficulties.map((d) => {
              const active = difficulty === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  disabled={!isHost}
                  onClick={() => isHost && onDifficultyChange(d.id)}
                  className={`py-1.5 px-3 rounded-[10px] text-xs font-bold transition ${
                    active
                      ? "bg-[#5B6CFF] text-white shadow-xs"
                      : "bg-[#F1F3FA] dark:bg-[#11131A] text-[#1E2233]/70 dark:text-[#F3F4FA]/70 hover:bg-black/5 dark:hover:bg-white/5"
                  } ${isHost ? "cursor-pointer" : "cursor-default"}`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Mistake Rules */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1E2233]/80 dark:text-[#F3F4FA]/80 mb-2">
            <Shield className="w-3.5 h-3.5 text-[#3DDC97]" />
            <span>Mistake Rule</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {mistakeRules.map((rule) => {
              const active = mistakeRule === rule.id;
              return (
                <button
                  key={rule.id}
                  type="button"
                  disabled={!isHost}
                  onClick={() => isHost && onMistakeRuleChange(rule.id)}
                  className={`p-2 rounded-[12px] text-center transition ${
                    active
                      ? "bg-[#3DDC97]/15 border-[1.5px] border-[#3DDC97] text-[#3DDC97] dark:text-[#3DDC97]"
                      : "bg-[#F1F3FA] dark:bg-[#11131A] border border-transparent text-[#1E2233]/70 dark:text-[#F3F4FA]/70 hover:bg-black/5 dark:hover:bg-white/5"
                  } ${isHost ? "cursor-pointer" : "cursor-default"}`}
                >
                  <span className="font-bold text-xs block leading-tight">{rule.label}</span>
                  <span className="text-[10px] opacity-75 block mt-0.5">{rule.sub}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Connected Players List */}
      <div className="p-4 rounded-[20px] bg-white dark:bg-[#1B1E29] border border-black/[0.08] dark:border-white/[0.08] shadow-xs mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#5B6CFF]" />
            <span className="text-xs font-bold text-[#1E2233]/70 dark:text-[#F3F4FA]/70 uppercase tracking-wider">
              Connected Players
            </span>
          </div>
          <span className="text-xs font-black text-[#5B6CFF] dark:text-[#7C8CFF] bg-[#5B6CFF]/10 px-2 py-0.5 rounded-full">
            {players.length} / 6
          </span>
        </div>

        <div className="space-y-2">
          {players.map((p, idx) => {
            const color = PLAYER_COLORS[idx % PLAYER_COLORS.length];
            return (
              <div
                key={p.id || idx}
                className="flex items-center justify-between p-2.5 rounded-[14px] bg-[#F1F3FA] dark:bg-[#11131A]"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs shadow-xs"
                    style={{ backgroundColor: color }}
                  >
                    {p.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-sm font-bold text-[#1E2233] dark:text-[#F3F4FA] block leading-tight">
                      {p.name}
                    </span>
                    <span className="text-[10px] text-[#1E2233]/50 dark:text-[#F3F4FA]/50 block">
                      Player #{idx + 1}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {p.isHost && (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#5B6CFF]/15 text-[#5B6CFF] dark:text-[#7C8CFF]">
                      Host
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Match Launch Area */}
      {isHost ? (
        <div className="space-y-2">
          {players.length < 2 ? (
            <div className="space-y-2">
              <button
                type="button"
                disabled
                className="w-full py-4 rounded-[18px] bg-black/[0.06] dark:bg-white/[0.08] text-[#1E2233]/40 dark:text-[#F3F4FA]/40 font-bold text-sm sm:text-base border border-black/[0.06] dark:border-white/[0.06] flex items-center justify-center gap-2 cursor-not-allowed select-none"
              >
                <Users className="w-5 h-5 opacity-40" />
                <span>Waiting for Opponents to Join (Min 2)...</span>
              </button>
              <span className="text-xs text-center text-[#5B6CFF] dark:text-[#7C8CFF] font-medium block">
                Share room code <span className="font-mono font-bold tracking-wider">{roomCode}</span> with a friend to start the duel!
              </span>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={onStartMatch}
                className="w-full py-4 rounded-[18px] bg-gradient-to-r from-[#5B6CFF] to-[#7C8CFF] hover:opacity-95 text-white font-black text-base shadow-lg shadow-[#5B6CFF]/30 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer animate-pulse"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>Start Match Now ({players.length} Players Ready!)</span>
              </button>
              <span className="text-xs text-center text-[#1E2233]/50 dark:text-[#F3F4FA]/50 block">
                Launches countdown and synchronizes puzzle to all connected players.
              </span>
            </>
          )}
        </div>
      ) : (
        <div className="p-4 rounded-[18px] bg-[#5B6CFF]/10 dark:bg-[#5B6CFF]/15 border border-[#5B6CFF]/20 flex items-center gap-3 text-center">
          <div className="w-8 h-8 rounded-full bg-[#5B6CFF]/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-[#5B6CFF] animate-pulse" />
          </div>
          <div className="text-left flex-1">
            <span className="text-xs font-bold text-[#5B6CFF] dark:text-[#7C8CFF] block">
              Waiting for Host
            </span>
            <span className="text-[11px] text-[#1E2233]/70 dark:text-[#F3F4FA]/70 block mt-0.5">
              Host will launch the match when everyone has joined. The countdown will begin automatically.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
