"use client";

import React, { useState } from "react";
import { User, PlusCircle, Users, ArrowLeft } from "lucide-react";

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
  const [nickname, setNickname] = useState(initialNickname || "Player");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-fadeIn">
      <div className="bg-white dark:bg-[#1B1E29] border border-black/[0.08] dark:border-white/[0.08] rounded-[24px] max-w-md w-full p-6 shadow-2xl">
        {/* Header (Flutter AppBar title: 'Multiplayer') */}
        <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.06]">
          <button
            type="button"
            onClick={mode === "join" ? () => setMode("menu") : onClose}
            className="flex items-center gap-1 text-[#1E2233]/70 dark:text-[#F3F4FA]/70 hover:text-[#1E2233] dark:hover:text-[#F3F4FA] transition"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">{mode === "join" ? "Back" : "Close"}</span>
          </button>
          <h2 className="text-base font-bold text-[#1E2233] dark:text-[#F3F4FA]">Multiplayer</h2>
          <div className="w-6" />
        </div>

        {/* Flutter Your Name input */}
        <div className="my-5">
          <label className="text-xs font-bold text-[#1E2233]/70 dark:text-[#F3F4FA]/70 block mb-2">
            Your Name
          </label>
          <div className="relative flex items-center">
            <User className="absolute left-3.5 w-4 h-4 text-[#1E2233]/40 dark:text-[#F3F4FA]/40" />
            <input
              type="text"
              value={nickname}
              maxLength={15}
              onChange={(e) => handleNicknameChange(e.target.value)}
              placeholder="Enter your name"
              className="w-full pl-10 pr-4 py-3 rounded-[14px] bg-[#F1F3FA] dark:bg-[#1E2233] text-[#1E2233] dark:text-[#F3F4FA] font-medium text-sm border-none focus:outline-none focus:ring-2 focus:ring-[#5B6CFF]"
            />
          </div>
        </div>

        {mode === "menu" ? (
          /* Host or Join Selection Cards (Exact Flutter layout & colors) */
          <div className="space-y-4">
            {/* Host Game Card (AppColors.primary #5B6CFF) */}
            <div className="p-5 rounded-[18px] bg-white dark:bg-[#1B1E29] border-[1.5px] border-[#5B6CFF]/25 shadow-[0_4px_14px_rgba(91,108,255,0.06)] flex flex-col justify-between">
              <div className="flex items-start gap-3.5 mb-4">
                <div className="p-2.5 rounded-[12px] bg-[#5B6CFF]/12 text-[#5B6CFF] flex-shrink-0">
                  <PlusCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1E2233] dark:text-[#F3F4FA] leading-tight">
                    Host a Game
                  </h3>
                  <p className="text-xs text-[#1E2233]/60 dark:text-[#F3F4FA]/60 mt-1 leading-snug">
                    Choose difficulty and rules, invite friends with a 6-digit code
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onHost}
                className="w-full py-2.5 px-4 rounded-[12px] bg-[#5B6CFF] hover:bg-[#4D5EFF] text-white font-bold text-sm shadow-md shadow-[#5B6CFF]/25 active:scale-98 transition"
              >
                Create Room
              </button>
            </div>

            {/* Join Game Card (AppColors.secondary #FF8A65) */}
            <div className="p-5 rounded-[18px] bg-white dark:bg-[#1B1E29] border-[1.5px] border-[#FF8A65]/25 shadow-[0_4px_14px_rgba(255,138,101,0.06)] flex flex-col justify-between">
              <div className="flex items-start gap-3.5 mb-4">
                <div className="p-2.5 rounded-[12px] bg-[#FF8A65]/12 text-[#FF8A65] flex-shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1E2233] dark:text-[#F3F4FA] leading-tight">
                    Join a Game
                  </h3>
                  <p className="text-xs text-[#1E2233]/60 dark:text-[#F3F4FA]/60 mt-1 leading-snug">
                    Enter a 6-digit room code from a friend to start playing
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMode("join")}
                className="w-full py-2.5 px-4 rounded-[12px] bg-[#FF8A65] hover:bg-[#F47D57] text-white font-bold text-sm shadow-md shadow-[#FF8A65]/25 active:scale-98 transition"
              >
                Join with Code
              </button>
            </div>
          </div>
        ) : (
          /* Join Screen with 6-digit pin input */
          <form onSubmit={handleJoinSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-[#1E2233]/70 dark:text-[#F3F4FA]/70 block mb-2 text-center">
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
                className="w-full text-center text-3xl font-mono font-bold tracking-widest px-4 py-3 rounded-[16px] border-2 border-[#5B6CFF] bg-[#F1F3FA] dark:bg-[#1E2233] text-[#1E2233] dark:text-[#F3F4FA] focus:outline-none focus:ring-4 focus:ring-[#5B6CFF]/20"
              />
              {joinError && (
                <p className="text-xs text-[#FF5D6C] font-semibold text-center mt-2">
                  {joinError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={roomCodeInput.length !== 6}
              className="w-full py-3.5 px-4 rounded-[14px] bg-[#5B6CFF] hover:bg-[#4D5EFF] text-white font-bold transition active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-[#5B6CFF]/25"
            >
              Join Match
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
