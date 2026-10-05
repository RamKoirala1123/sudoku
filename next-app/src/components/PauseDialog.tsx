"use client";

import React from "react";
import { PauseCircle } from "lucide-react";

interface PauseDialogProps {
  onResume: () => void;
  onRestart: () => void;
  onExit: () => void;
  isDarkMode?: boolean;
}

export const PauseDialog: React.FC<PauseDialogProps> = ({
  onResume,
  onRestart,
  onExit,
  isDarkMode = false,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn select-none">
      <div
        className={`w-full max-w-[320px] rounded-[24px] p-7 text-center shadow-2xl transition-all scale-100 ${
          isDarkMode
            ? "bg-[#1B1E29] text-[#F3F4FA] border border-white/10"
            : "bg-white text-[#1E2233] border border-black/5"
        }`}
      >
        {/* Flutter: Icon(Icons.pause_circle_filled_rounded, size: 44, color: theme.colorScheme.primary) */}
        <div className="flex justify-center mb-3">
          <PauseCircle className="w-12 h-12 text-[#5B6CFF] dark:text-[#7C8CFF] fill-[#5B6CFF]/20" />
        </div>

        {/* Text('PAUSED', style: theme.textTheme.headlineMedium) */}
        <h2 className="text-2xl font-bold tracking-wider mb-6">PAUSED</h2>

        {/* Action Buttons (Flutter style) */}
        <div className="space-y-3">
          {/* RESUME (Elevated Button) */}
          <button
            type="button"
            onClick={onResume}
            className="w-full py-3 px-4 rounded-[12px] bg-[#5B6CFF] hover:bg-[#4D5EFF] text-white font-bold text-sm tracking-wide shadow-md active:scale-[0.98] transition cursor-pointer"
          >
            RESUME
          </button>

          {/* RESTART (Outlined Button) */}
          <button
            type="button"
            onClick={onRestart}
            className={`w-full py-3 px-4 rounded-[12px] font-bold text-sm tracking-wide border active:scale-[0.98] transition cursor-pointer ${
              isDarkMode
                ? "border-white/20 text-[#F3F4FA] hover:bg-white/5"
                : "border-black/20 text-[#1E2233] hover:bg-black/5"
            }`}
          >
            RESTART
          </button>

          {/* EXIT (Text Button) */}
          <button
            type="button"
            onClick={onExit}
            className="w-full py-2 px-4 rounded-[12px] font-semibold text-sm tracking-wide text-[#1E2233]/70 dark:text-[#F3F4FA]/70 hover:text-[#FF5D6C] active:scale-[0.98] transition cursor-pointer"
          >
            EXIT
          </button>
        </div>
      </div>
    </div>
  );
};
