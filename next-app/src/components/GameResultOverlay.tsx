"use client";

import React from "react";
import { Difficulty } from "@/lib/types";

interface GameResultOverlayProps {
  won: boolean;
  difficulty: Difficulty;
  score: number;
  elapsedSeconds: number;
  mistakes: number;
  correct: number;
  onPlayAgain: () => void;
  onHome: () => void;
  isDarkMode?: boolean;
}

export const GameResultOverlay: React.FC<GameResultOverlayProps> = ({
  won,
  difficulty,
  score,
  elapsedSeconds,
  mistakes,
  correct,
  onPlayAgain,
  onHome,
  isDarkMode = false,
}) => {
  const m = Math.floor(elapsedSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (elapsedSeconds % 60).toString().padStart(2, "0");
  const formattedTime = `${m}:${s}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs select-none animate-fadeIn">
      {/* Flutter Card container with easeOutBack scale transition */}
      <div
        className={`w-full max-w-[340px] rounded-[24px] px-7 py-8 text-center shadow-2xl transition-all transform scale-100 ${
          isDarkMode
            ? "bg-[#1B1E29] text-[#F3F4FA] border border-white/10"
            : "bg-white text-[#1E2233] border border-black/5"
        }`}
      >
        {/* Emoji 🎉 or 💔 */}
        <div className="text-4xl mb-2">{won ? "🎉" : "💔"}</div>

        {/* YOU WON! or GAME OVER */}
        <h2
          className={`text-2xl font-extrabold tracking-wide mb-1 ${
            won ? "text-[#5B6CFF] dark:text-[#7C8CFF]" : "text-[#FF5D6C]"
          }`}
        >
          {won ? "YOU WON!" : "GAME OVER"}
        </h2>

        {/* Difficulty label */}
        <p className="text-xs font-semibold uppercase tracking-wider text-[#1E2233]/60 dark:text-[#F3F4FA]/60 mb-6">
          Difficulty: {difficulty}
        </p>

        {/* 2x2 Stats Grid (Flutter exact: Score, Time / Mistakes, Correct) */}
        <div className="space-y-4 mb-7">
          <div className="flex items-center justify-around">
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold">{score}</span>
              <span className="text-xs text-[#1E2233]/60 dark:text-[#F3F4FA]/60">Score</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold font-mono">{formattedTime}</span>
              <span className="text-xs text-[#1E2233]/60 dark:text-[#F3F4FA]/60">Time</span>
            </div>
          </div>

          <div className="flex items-center justify-around">
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold">{mistakes}</span>
              <span className="text-xs text-[#1E2233]/60 dark:text-[#F3F4FA]/60">Mistakes</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold">{correct}</span>
              <span className="text-xs text-[#1E2233]/60 dark:text-[#F3F4FA]/60">Correct</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* PLAY AGAIN (Elevated Button) */}
          <button
            type="button"
            onClick={onPlayAgain}
            className="w-full py-3 px-4 rounded-[12px] bg-[#5B6CFF] hover:bg-[#4D5EFF] text-white font-bold text-sm tracking-wider shadow-md active:scale-[0.98] transition cursor-pointer"
          >
            PLAY AGAIN
          </button>

          {/* HOME (Outlined Button) */}
          <button
            type="button"
            onClick={onHome}
            className={`w-full py-3 px-4 rounded-[12px] font-bold text-sm tracking-wider border active:scale-[0.98] transition cursor-pointer ${
              isDarkMode
                ? "border-white/20 text-[#F3F4FA] hover:bg-white/5"
                : "border-black/20 text-[#1E2233] hover:bg-black/5"
            }`}
          >
            HOME
          </button>
        </div>
      </div>
    </div>
  );
};
