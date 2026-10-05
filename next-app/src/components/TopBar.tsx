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
  className?: string;
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
  className = "w-full select-none",
}) => {
  const diffLabel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  const textColor = isDarkMode ? "#F3F4FA" : "#1E2233";
  const primaryColor = isDarkMode ? "#7C8CFF" : "#5B6CFF";

  return (
    <header className={className}>
      {/* Upper Row: Back button, Difficulty pill, Action icons */}
      <div className="flex items-center justify-between mb-3">
        {/* Back Button */}
        <button
          type="button"
          onClick={onBack}
          className="p-1.5 -ml-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition cursor-pointer"
          style={{ color: textColor }}
          title="Back"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Flutter Difficulty Badge: color: AppColors.primary (0.12 alpha), borderRadius: 10 */}
        <div
          style={{
            backgroundColor: isDarkMode ? "rgba(124, 140, 255, 0.15)" : "rgba(91, 108, 255, 0.12)",
            color: primaryColor,
          }}
          className="px-3.5 py-1 rounded-[10px] font-bold text-sm tracking-wide"
        >
          {diffLabel}
        </div>

        {/* Action icons: Sound, Theme, Pause */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onToggleMute}
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition cursor-pointer"
            style={{ color: textColor }}
            title={isMuted ? "Unmute Sound" : "Mute Sound"}
          >
            {isMuted ? (
              <VolumeX className="w-[22px] h-[22px] text-[#FF5D6C]" />
            ) : (
              <Volume2 className="w-[22px] h-[22px]" />
            )}
          </button>

          <button
            type="button"
            suppressHydrationWarning
            onClick={onToggleTheme}
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition cursor-pointer"
            style={{ color: textColor }}
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
              className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition cursor-pointer"
              style={{ color: textColor }}
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
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1">
                {Array.from({ length: maxMistakes }).map((_, i) => {
                  const isAlive = i < maxMistakes - mistakes;
                  return (
                    <Heart
                      key={i}
                      style={{
                        fill: isAlive
                          ? "#FF5D6C"
                          : isDarkMode
                          ? "#3A3F52"
                          : "#DADFEA",
                        color: isAlive
                          ? "#FF5D6C"
                          : isDarkMode
                          ? "#3A3F52"
                          : "#DADFEA",
                      }}
                      className="w-5 h-5 transition-transform duration-200"
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* TimerWidget: Icons.timer_outlined + formatted time */}
        <div
          style={{ color: isDarkMode ? "rgba(243, 244, 250, 0.8)" : "rgba(30, 34, 51, 0.8)" }}
          className="flex items-center gap-1.5"
        >
          <Timer className="w-4 h-4 opacity-60" />
          <span className="font-mono text-sm tracking-tight">{timeFormatted}</span>
        </div>

        {/* ScoreWidget: Icons.star_rounded (color: #FF8A65) + score + floating score delta */}
        <div
          style={{ color: textColor }}
          className="relative flex items-center gap-1.5"
        >
          <Star className="w-4 h-4 fill-[#FF8A65] text-[#FF8A65]" />
          <span className="font-bold text-sm">{score}</span>

          {/* Floating animated delta score pop (+10 / -5) */}
          {lastDelta !== undefined && lastDelta !== null && lastDelta !== 0 && (
            <span
              key={`${score}-${lastDelta}`}
              className={`absolute -top-3.5 right-0 text-xs font-bold animate-scoreDelta pointer-events-none ${
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
