"use client";

import React, { useState } from "react";
import { Users, PlusCircle, LogIn, ArrowLeft } from "lucide-react";

interface MultiplayerMenuModalProps {
  initialNickname: string;
  onSaveNickname: (name: string) => void;
  onHost: () => void;
  onJoin: (roomCode: string) => void;
  onClose: () => void;
}

export const MultiplayerMenuModal: React.FC<MultiplayerMenuModalProps> = ({
  initialNickname,
  onSaveNickname,
  onHost,
  onJoin,
  onClose,
}) => {
  const [nickname, setNickname] = useState(initialNickname || `Player${Math.floor(1000 + Math.random() * 9000)}`);
  const [mode, setMode] = useState<"menu" | "join">("menu");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [joinError, setJoinError] = useState("");

  const handleNicknameChange = (val: string) => {
    setNickname(val);
    onSaveNickname(val);
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = roomCodeInput.trim().replace(/\D/g, "");
    if (cleanCode.length !== 6) {
      setJoinError("Room code must be exactly 6 digits.");
      return;
    }
    setJoinError("");
    onJoin(cleanCode);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm select-none">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={mode === "join" ? () => setMode("menu") : onClose}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">{mode === "join" ? "Back" : "Close"}</span>
          </button>
          <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
            <Users className="w-4 h-4" />
            <span>Multiplayer Race</span>
          </div>
        </div>

        {/* Nickname Input */}
        <div className="my-5">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
            Your Nickname
          </label>
          <input
            type="text"
            value={nickname}
            maxLength={18}
            onChange={(e) => handleNicknameChange(e.target.value)}
            placeholder="Enter nickname..."
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {mode === "menu" ? (
          /* Host or Join Selection Cards */
          <div className="space-y-3">
            {/* Host Game Card */}
            <button
              type="button"
              onClick={onHost}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 hover:bg-indigo-100/80 dark:hover:bg-indigo-900/40 transition active:scale-98 text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25 group-hover:scale-105 transition-transform">
                  <PlusCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Host a Match
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Create a 6-digit room, choose rules & invite friends
                  </p>
                </div>
              </div>
            </button>

            {/* Join Game Card */}
            <button
              type="button"
              onClick={() => setMode("join")}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-98 text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-700 dark:bg-slate-700 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <LogIn className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Join Match with PIN
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Enter friend&apos;s 6-digit code or link
                  </p>
                </div>
              </div>
            </button>
          </div>
        ) : (
          /* Join Screen with 6-digit pin input */
          <form onSubmit={handleJoinSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2 text-center">
                Enter 6-Digit Room Code
              </label>
              <input
                type="text"
                pattern="[0-9]*"
                inputMode="numeric"
                maxLength={6}
                value={roomCodeInput}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setRoomCodeInput(cleaned);
                  if (cleaned.length === 6) {
                    onJoin(cleaned);
                  }
                }}
                placeholder="123456"
                autoFocus
                className="w-full text-center text-3xl font-mono font-bold tracking-widest px-4 py-3 rounded-2xl border-2 border-indigo-400 dark:border-indigo-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
              />
              {joinError && (
                <p className="text-xs text-rose-500 font-semibold text-center mt-2">
                  {joinError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={roomCodeInput.length !== 6}
              className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-indigo-500/25"
            >
              Join Match
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
