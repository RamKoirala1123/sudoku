"use client";

import React, { useState } from "react";
import { Copy, Check, Play, ArrowLeft, Crown } from "lucide-react";
import { Difficulty, MistakeRule, PlayerProgress } from "@/lib/types";

interface MultiplayerLobbyProps {
  isHost: boolean;
  roomCode: string;
  players: PlayerProgress[];
  difficulty: Difficulty;
  mistakeRule: MistakeRule;
  onDifficultyChange?: (d: Difficulty) => void;
  onMistakeRuleChange?: (r: MistakeRule) => void;
  onStartMatch?: () => void;
  onLeave: () => void;
}

export const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({
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
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const joinUrl = `${origin}/#join=${roomCode}`;
    navigator.clipboard.writeText(joinUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
    { id: "standard", label: "Standard", sub: "3 Mistakes (Knockout)" },
    { id: "hardcore", label: "Hardcore", sub: "1 Mistake (Sudden Death)" },
    { id: "casual", label: "Casual", sub: "Unlimited (+30s penalty)" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-fadeIn">
      <div className="bg-white dark:bg-[#1B1E29] border border-black/[0.08] dark:border-white/[0.08] rounded-[24px] max-w-lg w-full p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.06]">
          <button
            type="button"
            onClick={onLeave}
            className="flex items-center gap-1.5 text-[#1E2233]/70 dark:text-[#F3F4FA]/70 hover:text-[#1E2233] dark:hover:text-[#F3F4FA] transition"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Leave Room</span>
          </button>
          <span className="text-xs font-bold uppercase tracking-wider text-[#5B6CFF] dark:text-[#7C8CFF] bg-[#5B6CFF]/12 px-3 py-1 rounded-[10px]">
            {isHost ? "Host Room" : "Lobby"}
          </span>
        </div>

        {/* Room Code Card (Exact Flutter UI) */}
        <div className="my-5 p-4 bg-[#F1F3FA] dark:bg-[#1E2233] rounded-[18px] text-center border border-black/[0.05] dark:border-white/[0.05]">
          <span className="text-xs font-semibold text-[#1E2233]/60 dark:text-[#F3F4FA]/60 uppercase tracking-wider block mb-1">
            Room Code
          </span>
          <div className="text-4xl font-mono font-black tracking-widest text-[#1E2233] dark:text-[#F3F4FA] mb-3">
            {roomCode}
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[12px] bg-[#5B6CFF]/12 text-[#5B6CFF] dark:text-[#7C8CFF] hover:bg-[#5B6CFF]/20 text-sm font-semibold transition active:scale-95"
          >
            {copied ? <Check className="w-4 h-4 text-[#3DDC97]" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? "Link Copied!" : "Copy Invite Link"}</span>
          </button>
        </div>

        {/* Host Rules Customization (ChoiceChips matching Flutter) */}
        {isHost ? (
          <div className="space-y-4 mb-5">
            {/* Difficulty ChoiceChips */}
            <div>
              <label className="text-xs font-bold text-[#1E2233]/70 dark:text-[#F3F4FA]/70 uppercase tracking-wider block mb-2">
                Select Difficulty
              </label>
              <div className="flex flex-wrap gap-2">
                {difficulties.map((d) => {
                  const isSelected = difficulty === d.id;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => onDifficultyChange?.(d.id)}
                      className={`py-1.5 px-3.5 rounded-full text-xs font-semibold transition active:scale-95 border ${
                        isSelected
                          ? "bg-[#5B6CFF] text-white border-[#5B6CFF] shadow-xs"
                          : "bg-[#F1F3FA] dark:bg-[#1E2233] text-[#1E2233] dark:text-[#F3F4FA] border-transparent hover:bg-black/5"
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mistake Rules ChoiceChips */}
            <div>
              <label className="text-xs font-bold text-[#1E2233]/70 dark:text-[#F3F4FA]/70 uppercase tracking-wider block mb-2">
                Mistake Rules
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {mistakeRules.map((rule) => {
                  const isSelected = mistakeRule === rule.id;
                  return (
                    <button
                      key={rule.id}
                      type="button"
                      onClick={() => onMistakeRuleChange?.(rule.id)}
                      className={`p-3 rounded-[14px] text-left transition active:scale-98 border ${
                        isSelected
                          ? "bg-[#5B6CFF]/10 border-[#5B6CFF] text-[#5B6CFF] dark:text-[#7C8CFF]"
                          : "bg-[#F1F3FA] dark:bg-[#1E2233] border-transparent text-[#1E2233] dark:text-[#F3F4FA] hover:bg-black/5"
                      }`}
                    >
                      <span className="text-xs font-bold block mb-0.5">{rule.label}</span>
                      <span className="text-[10px] text-[#1E2233]/60 dark:text-[#F3F4FA]/60 leading-tight block">
                        {rule.sub}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-5 p-3 rounded-[14px] bg-[#F1F3FA] dark:bg-[#1E2233] text-xs text-[#1E2233] dark:text-[#F3F4FA] flex items-center justify-between">
            <div>
              <span className="text-[#1E2233]/50 dark:text-[#F3F4FA]/50 block text-[10px] uppercase font-bold">Difficulty</span>
              <span className="font-bold capitalize">{difficulty}</span>
            </div>
            <div>
              <span className="text-[#1E2233]/50 dark:text-[#F3F4FA]/50 block text-[10px] uppercase font-bold">Rule</span>
              <span className="font-bold capitalize">{mistakeRule}</span>
            </div>
            <div className="text-right">
              <span className="text-[#1E2233]/50 dark:text-[#F3F4FA]/50 block text-[10px] uppercase font-bold">Status</span>
              <span className="text-[#5B6CFF] dark:text-[#7C8CFF] font-semibold animate-pulse">Waiting for host...</span>
            </div>
          </div>
        )}

        {/* Players List */}
        <div className="mb-6 flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#1E2233]/70 dark:text-[#F3F4FA]/70 uppercase tracking-wider">
              Connected Players ({players.length})
            </span>
            <span className="text-[11px] text-[#1E2233]/50 dark:text-[#F3F4FA]/50">P2P WebRTC</span>
          </div>

          <div className="space-y-2 max-h-44 overflow-y-auto">
            {players.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-2.5 rounded-[12px] bg-[#F1F3FA] dark:bg-[#1E2233] border border-black/[0.05] dark:border-white/[0.05]"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3.5 h-3.5 rounded-full"
                    style={{ backgroundColor: p.color || "#5B6CFF" }}
                  />
                  <span className="text-sm font-semibold text-[#1E2233] dark:text-[#F3F4FA]">
                    {p.name}
                  </span>
                  {p.isHost && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#FFC24B] bg-[#FFC24B]/15 px-1.5 py-0.5 rounded">
                      <Crown className="w-3 h-3" /> Host
                    </span>
                  )}
                </div>
                <span className="text-xs text-[#3DDC97] font-medium flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#3DDC97] animate-ping inline-block" /> Ready
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        {isHost ? (
          <button
            type="button"
            onClick={onStartMatch}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-[16px] bg-[#5B6CFF] hover:bg-[#4D5EFF] text-white font-bold text-base transition active:scale-98 shadow-lg shadow-[#5B6CFF]/25"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>Start Match for All</span>
          </button>
        ) : (
          <div className="text-center text-xs text-[#1E2233]/60 dark:text-[#F3F4FA]/60 italic py-2">
            The match will start automatically once the host launches it.
          </div>
        )}
      </div>
    </div>
  );
};
