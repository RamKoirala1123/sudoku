"use client";

import React from "react";
import {
  ChevronLeft,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Pause,
  Timer,
  Star,
  Heart,
  AlertTriangle,
} from "lucide-react";
import { Difficulty, MistakeRule } from "@/lib/types";

interface TopBarProps {
  difficulty: Difficulty;
  mistakeRule: MistakeRule;
  mistakes: number;
  maxMistakes: number;
  score: number;
  lastDelta?: number | null;
  timeFormatted: string;
  isMuted: boolean;
  onToggleMute: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onBack: () => void;
  onPause?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  difficulty,
  mistakeRule,
  mistakes,
  maxMistakes,
  score,
  lastDelta,
  timeFormatted,
  isMuted,
  onToggleMute,
  isDarkMode,
  onToggleTheme,
  onBack,
  onPause,
}) => {
  const diffLabel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

  return (
    <header className="w-full max-w-[490px] mx-auto px-2 pt-2 pb-1 select-none">
      {/* Upper Row: Back button, Difficulty pill, Action icons */}
      <div className="flex items-center justify-between mb-3">
        {/* Back Button */}
        <button
          type="button"
          onClick={onBack}
          className="p-1.5 -ml-1 rounded-full text-[#1E2233] dark:text-[#F3F4FA] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition"
          title="Back"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Flutter Difficulty Badge: color: AppColors.primary (0.12 alpha), borderRadius: 10 */}
        <div className="px-3 py-1 rounded-[10px] bg-[#5B6CFF]/12 dark:bg-[#7C8CFF]/15 text-[#5B6CFF] dark:text-[#7C8CFF] font-bold text-sm tracking-wide">
          {diffLabel}
        </div>

        {/* Action icons: Sound, Theme, Pause */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onToggleMute}
            className="p-1.5 rounded-full text-[#1E2233] dark:text-[#F3F4FA] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition"
            title={isMuted ? "Unmute Sound" : "Mute Sound"}
          >
            {isMuted ? (
              <VolumeX className="w-[22px] h-[22px]" />
            ) : (
              <Volume2 className="w-[22px] h-[22px]" />
            )}
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            className="p-1.5 rounded-full text-[#1E2233] dark:text-[#F3F4FA] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition"
            title={isDarkMode ? "Switch to Light Theme" : "Switch to Dark Theme"}
          >
            {isDarkMode ? (
              <Sun className="w-[22px] h-[22px]" />
            ) : (
              <Moon className="w-[22px] h-[22px]" />
            )}
          </button>

          {onPause && (
            <button
              type="button"
              onClick={onPause}
              className="p-1.5 rounded-full text-[#1E2233] dark:text-[#F3F4FA] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition"
              title="Pause Game"
            >
              <Pause className="w-[22px] h-[22px]" />
            </button>
          )}
        </div>
      </div>

      {/* Flutter Stats Row: LivesWidget, TimerWidget, ScoreWidget */}
      <div className="flex items-center justify-between px-1 text-sm font-semibold">
        {/* LivesWidget / MistakeRule */}
        <div>
          {mistakeRule === "casual" ? (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#FFC24B]/15 text-[#FFC24B] font-bold text-xs">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>
                Mistakes: {mistakes} {mistakes > 0 ? `(+${mistakes * 30}s)` : ""}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-[#1E2233]/70 dark:text-[#F3F4FA]/70 mr-0.5">
                Mistakes:
              </span>
              <div className="flex items-center gap-1">
                {Array.from({ length: maxMistakes }).map((_, i) => {
                  const isAlive = i < maxMistakes - mistakes;
                  return (
                    <Heart
                      key={i}
                      className={`w-4 h-4 transition-transform duration-200 ${
                        isAlive
                          ? "fill-[#FF5D6C] text-[#FF5D6C] scale-100"
                          : "fill-[#DADFEA] dark:fill-[#3A3F52] text-[#DADFEA] dark:text-[#3A3F52] scale-90"
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* TimerWidget: Icons.timer_outlined + formatted time */}
        <div className="flex items-center gap-1.5 text-[#1E2233]/80 dark:text-[#F3F4FA]/80">
          <Timer className="w-4 h-4 opacity-60" />
          <span className="font-mono text-sm tracking-tight">{timeFormatted}</span>
        </div>

        {/* ScoreWidget: Icons.star_rounded (color: #FF8A65) + score + floating score delta */}
        <div className="relative flex items-center gap-1 text-[#1E2233] dark:text-[#F3F4FA]">
          <Star className="w-4 h-4 fill-[#FF8A65] text-[#FF8A65]" />
          <span className="font-bold text-sm">{score}</span>

          {/* Floating animated delta score pop (+10 / -5) */}
          {lastDelta !== undefined && lastDelta !== null && lastDelta !== 0 && (
            <span
              key={`${score}-${lastDelta}`}
              className={`absolute -top-3 right-0 text-xs font-bold animate-scoreDelta pointer-events-none ${
                lastDelta > 0 ? "text-emerald-500" : "text-rose-500"
              }`}
            >
              {lastDelta > 0 ? `+${lastDelta}` : lastDelta}
            </span>
          )}
        </div>
      </div>
    </header>
  );
};
