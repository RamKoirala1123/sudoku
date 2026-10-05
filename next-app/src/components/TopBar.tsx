"use client";

import React from "react";
import { ArrowLeft, Volume2, VolumeX, Moon, Sun, Heart } from "lucide-react";
import { Difficulty, MistakeRule } from "@/lib/types";

interface TopBarProps {
  difficulty: Difficulty;
  mistakeRule: MistakeRule;
  mistakes: number;
  maxMistakes: number;
  score: number;
  timeFormatted: string;
  isMuted: boolean;
  onToggleMute: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onBack: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  difficulty,
  mistakeRule,
  mistakes,
  maxMistakes,
  score,
  timeFormatted,
  isMuted,
  onToggleMute,
  isDarkMode,
  onToggleTheme,
  onBack,
}) => {
  const difficultyColors: Record<Difficulty, string> = {
    easy: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-300 dark:border-amber-800",
    hard: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-300 dark:border-rose-800",
    expert: "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 border-purple-300 dark:border-purple-800",
    difficult: "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 border-purple-300 dark:border-purple-800",
    extreme: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 border-red-300 dark:border-red-800",
  };


  return (
    <header className="w-full max-w-[490px] mx-auto px-2 py-2 flex flex-col gap-2 select-none">
      {/* Upper Row: Back button, Title / Difficulty, Quick settings */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition active:scale-95"
          title="Back to menu"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Home</span>
        </button>

        {/* Difficulty Badge */}
        <div
          className={`px-3 py-1 rounded-full text-xs font-semibold capitalize border tracking-wide shadow-xs ${
            difficultyColors[difficulty] || difficultyColors.medium
          }`}
        >
          {difficulty}
        </div>

        {/* Quick action buttons: Sound & Theme */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleMute}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition active:scale-95"
            title={isMuted ? "Unmute sound" : "Mute sound"}
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5 text-rose-500" />
            ) : (
              <Volume2 className="w-5 h-5 text-indigo-500" />
            )}
          </button>
          <button
            type="button"
            onClick={onToggleTheme}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition active:scale-95"
            title={isDarkMode ? "Light mode" : "Dark mode"}
          >
            {isDarkMode ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-indigo-500" />
            )}
          </button>
        </div>
      </div>

      {/* Stats Row: Mistakes status, Score, Timer */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs sm:text-sm font-medium border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
        {/* Mistakes count depending on rule */}
        <div className="flex items-center gap-1.5">
          {mistakeRule === "casual" ? (
            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-amber-600 dark:text-amber-400">Casual:</span>
              <span>{mistakes} mistakes</span>
              {mistakes > 0 && (
                <span className="text-[10px] px-1 py-0.5 rounded bg-rose-500/10 text-rose-500 font-bold">
                  +{mistakes * 30}s
                </span>
              )}
            </div>
          ) : mistakeRule === "hardcore" ? (
            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-rose-600 dark:text-rose-400">Hardcore:</span>
              <div className="flex gap-0.5">
                <Heart
                  className={`w-4 h-4 ${
                    mistakes === 0
                      ? "fill-rose-500 text-rose-500"
                      : "fill-slate-300 text-slate-400 dark:fill-slate-700 dark:text-slate-600"
                  }`}
                />
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">(Sudden Death)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
              <span className="font-medium text-slate-500 dark:text-slate-400">Mistakes:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {mistakes}/{maxMistakes}
              </span>
              <div className="flex gap-0.5 ml-1">
                {Array.from({ length: maxMistakes }).map((_, i) => (
                  <Heart
                    key={i}
                    className={`w-3.5 h-3.5 ${
                      i < maxMistakes - mistakes
                        ? "fill-rose-500 text-rose-500"
                        : "fill-slate-300 text-slate-300 dark:fill-slate-700 dark:text-slate-600"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Score & Timer */}
        <div className="flex items-center gap-4">
          <div className="text-slate-600 dark:text-slate-300">
            <span className="text-slate-400 dark:text-slate-500 text-xs mr-1">Score:</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">{score}</span>
          </div>
          <div className="font-mono text-sm tracking-wider text-slate-700 dark:text-slate-200 font-semibold bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-800">
            {timeFormatted}
          </div>
        </div>
      </div>
    </header>
  );
};
