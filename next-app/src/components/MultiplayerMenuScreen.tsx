"use client";

import React, { useState } from "react";
import { ArrowLeft, User, PlusCircle, Users, Shuffle, AlertCircle, Loader2 } from "lucide-react";
import { Difficulty, MistakeRule } from "@/lib/types";

interface MultiplayerMenuScreenProps {
  initialNickname: string;
  onSaveNickname: (name: string) => void;
  onHost: (difficulty: Difficulty, mistakeRule: MistakeRule) => Promise<void> | void;
  onJoin: (roomCode: string, nickname: string) => Promise<void> | void;
  onBack: () => void;
  initialRoomCode?: string;
  initialTab?: "host" | "join";
}

const FUN_NICKNAMES = [
  "SwiftSolver",
  "SudokuNinja",
  "GridMaster",
  "LogicLegend",
  "PuzzlePro",
  "NumberWhiz",
  "BrainStormer",
  "MatrixMind",
];

export const MultiplayerMenuScreen: React.FC<MultiplayerMenuScreenProps> = ({
  initialNickname,
  onSaveNickname,
  onHost,
  onJoin,
  onBack,
  initialRoomCode = "",
  initialTab = "host",
}) => {
  const [nickname, setNickname] = useState(initialNickname || "Player");
  const [tab, setTab] = useState<"host" | "join">(initialRoomCode ? "join" : initialTab);
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [mistakeRule, setMistakeRule] = useState<MistakeRule>("standard");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [prevInitialCode, setPrevInitialCode] = useState(initialRoomCode);
  if (initialRoomCode !== prevInitialCode) {
    setPrevInitialCode(initialRoomCode);
    setRoomCode(initialRoomCode);
    if (initialRoomCode) {
      setTab("join");
    }
  }

  const handleNicknameChange = (val: string) => {
    setNickname(val);
    onSaveNickname(val);
  };

  const handleRandomizeName = () => {
    const randomName =
      FUN_NICKNAMES[Math.floor(Math.random() * FUN_NICKNAMES.length)] +
      Math.floor(10 + Math.random() * 90);
    handleNicknameChange(randomName);
  };

  const handleHostSubmit = async () => {
    setErrorMessage("");
    const effectiveName = nickname.trim() || "Host";
    onSaveNickname(effectiveName);
    setIsSubmitting(true);
    try {
      await onHost(difficulty, mistakeRule);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create room";
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  const handleJoinSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage("");
    const cleanCode = roomCode.trim().replace(/\D/g, "");
    if (cleanCode.length !== 6) {
      setErrorMessage("Please enter a valid 6-digit room code.");
      return;
    }

    const effectiveName = nickname.trim() || "Player";
    onSaveNickname(effectiveName);
    setIsSubmitting(true);
    try {
      await onJoin(cleanCode, effectiveName);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not join room";
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  const difficulties: { id: Difficulty; label: string; desc: string }[] = [
    { id: "easy", label: "Easy", desc: "For casual warming up" },
    { id: "medium", label: "Medium", desc: "Balanced competition" },
    { id: "hard", label: "Hard", desc: "Demanding deduction" },
    { id: "difficult", label: "Difficult", desc: "Advanced techniques" },
    { id: "extreme", label: "Extreme", desc: "For true puzzle masters" },
  ];

  const mistakeRules: { id: MistakeRule; label: string; sub: string }[] = [
    { id: "standard", label: "Standard", sub: "3 Mistakes (Knocked out)" },
    { id: "hardcore", label: "Hardcore", sub: "1 Mistake (Sudden death)" },
    { id: "casual", label: "Casual", sub: "Unlimited (+30s per mistake)" },
  ];

  return (
    <div className="w-full max-w-[500px] lg:max-w-[580px] xl:max-w-[620px] mx-auto px-4 py-6 flex flex-col items-stretch select-none animate-fadeIn">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-black/[0.06] dark:border-white/[0.06]">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="flex items-center gap-1.5 text-sm font-semibold text-[#1E2233]/70 dark:text-[#F3F4FA]/70 hover:text-[#5B6CFF] dark:hover:text-[#7C8CFF] transition disabled:opacity-50 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home</span>
        </button>
        <h1 className="text-lg font-black tracking-tight text-[#1E2233] dark:text-[#F3F4FA]">
          Multiplayer Race
        </h1>
        <div className="w-12" />
      </div>

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="mb-5 p-3.5 rounded-[16px] bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-red-600 dark:text-red-400 text-xs font-semibold animate-shake">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <span className="font-bold block">Connection Error</span>
            {errorMessage}
          </div>
        </div>
      )}

      {/* Edit Nickname Card */}
      <div className="p-4 rounded-[20px] bg-white dark:bg-[#1B1E29] border border-black/[0.08] dark:border-white/[0.08] shadow-xs mb-5">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-[#1E2233]/70 dark:text-[#F3F4FA]/70 uppercase tracking-wider">
            Your Nickname
          </label>
          <button
            type="button"
            onClick={handleRandomizeName}
            disabled={isSubmitting}
            className="flex items-center gap-1 text-[11px] font-semibold text-[#5B6CFF] dark:text-[#7C8CFF] hover:underline cursor-pointer"
          >
            <Shuffle className="w-3 h-3" /> Randomize
          </button>
        </div>
        <div className="relative flex items-center">
          <User className="absolute left-3.5 w-4 h-4 text-[#1E2233]/40 dark:text-[#F3F4FA]/40" />
          <input
            type="text"
            value={nickname}
            maxLength={16}
            disabled={isSubmitting}
            onChange={(e) => handleNicknameChange(e.target.value)}
            placeholder="Enter your name"
            className="w-full pl-10 pr-4 py-2.5 rounded-[14px] bg-[#F1F3FA] dark:bg-[#11131A] text-[#1E2233] dark:text-[#F3F4FA] font-bold text-sm border-none focus:outline-none focus:ring-2 focus:ring-[#5B6CFF]"
          />
        </div>
        <span className="text-[11px] text-[#1E2233]/50 dark:text-[#F3F4FA]/50 mt-1.5 block">
          This is the name other players see on the race board and leaderboard.
        </span>
      </div>

      {/* Link join announcement */}
      {initialRoomCode && tab === "join" && (
        <div className="mb-4 p-3 rounded-[14px] bg-[#5B6CFF]/10 border border-[#5B6CFF]/20 text-[#5B6CFF] dark:text-[#7C8CFF] text-xs font-medium flex items-center gap-2">
          <span>🎯</span>
          <span>
            You opened an invite link for Room <b>#{initialRoomCode}</b>. Check your name above and click Join!
          </span>
        </div>
      )}

      {/* Mode Switcher Tabs */}
      <div className="grid grid-cols-2 p-1 rounded-[16px] bg-[#F1F3FA] dark:bg-[#1B1E29] border border-black/[0.05] dark:border-white/[0.05] mb-5">
        <button
          type="button"
          onClick={() => {
            setTab("host");
            setErrorMessage("");
          }}
          disabled={isSubmitting}
          className={`py-2.5 rounded-[12px] font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
            tab === "host"
              ? "bg-white dark:bg-[#252A3D] text-[#5B6CFF] dark:text-[#7C8CFF] shadow-xs"
              : "text-[#1E2233]/60 dark:text-[#F3F4FA]/60 hover:text-[#1E2233] dark:hover:text-[#F3F4FA]"
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>Host Game</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setTab("join");
            setErrorMessage("");
          }}
          disabled={isSubmitting}
          className={`py-2.5 rounded-[12px] font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
            tab === "join"
              ? "bg-white dark:bg-[#252A3D] text-[#5B6CFF] dark:text-[#7C8CFF] shadow-xs"
              : "text-[#1E2233]/60 dark:text-[#F3F4FA]/60 hover:text-[#1E2233] dark:hover:text-[#F3F4FA]"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Join Game</span>
        </button>
      </div>

      {/* Host Room Screen Tab */}
      {tab === "host" && (
        <div className="space-y-5 animate-fadeIn">
          {/* Difficulty Selection */}
          <div className="p-4 rounded-[20px] bg-white dark:bg-[#1B1E29] border border-black/[0.08] dark:border-white/[0.08]">
            <span className="text-xs font-bold text-[#1E2233]/70 dark:text-[#F3F4FA]/70 block mb-2.5 uppercase tracking-wider">
              Select Difficulty
            </span>
            <div className="grid grid-cols-3 gap-2">
              {difficulties.slice(0, 3).map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDifficulty(d.id)}
                  disabled={isSubmitting}
                  className={`py-2.5 px-2 rounded-[12px] font-bold text-xs text-center transition cursor-pointer ${
                    difficulty === d.id
                      ? "bg-[#5B6CFF] text-white shadow-xs"
                      : "bg-[#F1F3FA] dark:bg-[#11131A] text-[#1E2233]/80 dark:text-[#F3F4FA]/80 hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {difficulties.slice(3).map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDifficulty(d.id)}
                  disabled={isSubmitting}
                  className={`py-2.5 px-2 rounded-[12px] font-bold text-xs text-center transition cursor-pointer ${
                    difficulty === d.id
                      ? "bg-[#5B6CFF] text-white shadow-xs"
                      : "bg-[#F1F3FA] dark:bg-[#11131A] text-[#1E2233]/80 dark:text-[#F3F4FA]/80 hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mistake Rules Selection */}
          <div className="p-4 rounded-[20px] bg-white dark:bg-[#1B1E29] border border-black/[0.08] dark:border-white/[0.08]">
            <span className="text-xs font-bold text-[#1E2233]/70 dark:text-[#F3F4FA]/70 block mb-2.5 uppercase tracking-wider">
              Mistake Rule
            </span>
            <div className="space-y-2">
              {mistakeRules.map((rule) => (
                <button
                  key={rule.id}
                  type="button"
                  onClick={() => setMistakeRule(rule.id)}
                  disabled={isSubmitting}
                  className={`w-full p-3 rounded-[14px] text-left transition flex items-center justify-between cursor-pointer ${
                    mistakeRule === rule.id
                      ? "bg-[#5B6CFF]/10 dark:bg-[#5B6CFF]/20 border-[1.5px] border-[#5B6CFF]"
                      : "bg-[#F1F3FA] dark:bg-[#11131A] border border-transparent hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  <div>
                    <span className="font-bold text-sm text-[#1E2233] dark:text-[#F3F4FA] block">
                      {rule.label}
                    </span>
                    <span className="text-xs text-[#1E2233]/60 dark:text-[#F3F4FA]/60 block mt-0.5">
                      {rule.sub}
                    </span>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      mistakeRule === rule.id
                        ? "border-[#5B6CFF] bg-[#5B6CFF]"
                        : "border-[#1E2233]/30 dark:border-[#F3F4FA]/30"
                    }`}
                  >
                    {mistakeRule === rule.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Create Room Button */}
          <button
            type="button"
            onClick={handleHostSubmit}
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-[16px] bg-[#5B6CFF] hover:bg-[#4D5EFF] text-white font-bold text-sm shadow-md shadow-[#5B6CFF]/25 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating Room & Lobby...</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4" />
                <span>Create Room</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Join Room Screen Tab */}
      {tab === "join" && (
        <form onSubmit={handleJoinSubmit} className="space-y-5 animate-fadeIn">
          <div className="p-5 rounded-[20px] bg-white dark:bg-[#1B1E29] border border-black/[0.08] dark:border-white/[0.08] text-center">
            <span className="text-xs font-bold text-[#1E2233]/70 dark:text-[#F3F4FA]/70 block mb-2 uppercase tracking-wider">
              Enter 6-Digit Code
            </span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={roomCode}
              disabled={isSubmitting}
              onChange={(e) => {
                setRoomCode(e.target.value.replace(/\D/g, ""));
                setErrorMessage("");
              }}
              placeholder="123456"
              className="w-full text-center text-3xl font-mono font-black tracking-[0.25em] py-3 rounded-[16px] bg-[#F1F3FA] dark:bg-[#11131A] text-[#1E2233] dark:text-[#F3F4FA] focus:outline-none focus:ring-2 focus:ring-[#5B6CFF]"
            />
            <span className="text-xs text-[#1E2233]/50 dark:text-[#F3F4FA]/50 mt-2 block">
              Ask your friend for the 6-digit code shown in their lobby.
            </span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || roomCode.replace(/\D/g, "").length !== 6}
            className="w-full py-3.5 rounded-[16px] bg-[#5B6CFF] hover:bg-[#4D5EFF] text-white font-bold text-sm shadow-md shadow-[#5B6CFF]/25 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Connecting to Lobby...</span>
              </>
            ) : (
              <>
                <Users className="w-4 h-4" />
                <span>Join Room</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};
