"use client";

import React, { useState } from "react";
import { Users, Copy, Check, Play, ArrowLeft, ShieldAlert, Zap, HeartHandshake, Crown } from "lucide-react";
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

  const difficulties: Difficulty[] = ["easy", "medium", "hard", "expert"];
  const mistakeRules: { id: MistakeRule; title: string; subtitle: string; icon: any }[] = [
    {
      id: "standard",
      title: "Standard",
      subtitle: "3 Mistakes (Knockout)",
      icon: ShieldAlert,
    },
    {
      id: "hardcore",
      title: "Hardcore",
      subtitle: "1 Mistake (Sudden Death)",
      icon: Zap,
    },
    {
      id: "casual",
      title: "Casual",
      subtitle: "Unlimited (+30s penalty)",
      icon: HeartHandshake,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm select-none">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onLeave}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Leave Room</span>
          </button>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-full">
            {isHost ? "Host Lobby" : "Player Lobby"}
          </span>
        </div>

        {/* Room PIN & Share Box */}
        <div className="my-5 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 text-center">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Room Code
          </span>
          <div className="text-4xl font-mono font-black tracking-widest text-slate-900 dark:text-slate-100 mb-3">
            {roomCode}
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-sm font-semibold transition active:scale-95 border border-indigo-200 dark:border-indigo-800"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? "Link Copied!" : "Copy Invite Link"}</span>
          </button>
        </div>

        {/* Host Rules Customization */}
        {isHost ? (
          <div className="space-y-4 mb-5">
            {/* Difficulty Selector */}
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                Puzzle Difficulty
              </label>
              <div className="grid grid-cols-4 gap-2">
                {difficulties.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onDifficultyChange?.(d)}
                    className={`py-2 px-1 rounded-xl text-xs font-semibold capitalize transition active:scale-95 border ${
                      difficulty === d
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-transparent hover:bg-slate-200"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Mistake Rules Selector */}
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                Mistake Rules
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {mistakeRules.map((rule) => {
                  const Icon = rule.icon;
                  const isSelected = mistakeRule === rule.id;
                  return (
                    <button
                      key={rule.id}
                      type="button"
                      onClick={() => onMistakeRuleChange?.(rule.id)}
                      className={`p-2.5 rounded-xl text-left transition active:scale-98 border ${
                        isSelected
                          ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-900 dark:text-indigo-200"
                          : "bg-slate-100 dark:bg-slate-800 border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Icon className="w-4 h-4 text-indigo-500" />
                        <span className="text-xs font-bold">{rule.title}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight block">
                        {rule.subtitle}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-5 p-3 rounded-xl bg-slate-100 dark:bg-slate-800/40 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Difficulty</span>
              <span className="font-bold capitalize">{difficulty}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Rule</span>
              <span className="font-bold capitalize">{mistakeRule}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Status</span>
              <span className="text-indigo-500 font-semibold animate-pulse">Waiting for host...</span>
            </div>
          </div>
        )}

        {/* Players List */}
        <div className="mb-6 flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Lobby ({players.length})
            </span>
            <span className="text-xs text-slate-400">P2P Mesh WebRTC</span>
          </div>

          <div className="space-y-2 max-h-40 overflow-y-auto">
            {players.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3.5 h-3.5 rounded-full"
                    style={{ backgroundColor: p.color || "#6366f1" }}
                  />
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {p.name}
                  </span>
                  {p.isHost && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                      <Crown className="w-3 h-3" /> Host
                    </span>
                  )}
                </div>
                <span className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" /> Ready
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
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base transition active:scale-98 shadow-lg shadow-indigo-500/25"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>Start Match for All</span>
          </button>
        ) : (
          <div className="text-center text-xs text-slate-400 italic py-2">
            The match will start automatically once the host launches it.
          </div>
        )}
      </div>
    </div>
  );
};
