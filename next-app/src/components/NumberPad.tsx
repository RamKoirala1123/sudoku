"use client";

import React, { useEffect } from "react";
import { Undo2, Sparkles, Edit3 } from "lucide-react";

interface NumberPadProps {
  remainingCounts: Record<number, number>;
  isNotesMode: boolean;
  onToggleNotes: () => void;
  onInputNumber: (num: number) => void;
  onErase: () => void;
  onUndo: () => void;
  disabled?: boolean;
}

export const NumberPad: React.FC<NumberPadProps> = ({
  remainingCounts,
  isNotesMode,
  onToggleNotes,
  onInputNumber,
  onErase,
  onUndo,
  disabled = false,
}) => {
  // Keyboard listener for 1-9, Backspace, N, Z
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key >= "1" && e.key <= "9") {
        const num = parseInt(e.key, 10);
        if ((remainingCounts[num] ?? 9) > 0) {
          onInputNumber(num);
        }
      } else if (e.key === "Backspace" || e.key === "Delete") {
        onErase();
      } else if (e.key.toLowerCase() === "n") {
        onToggleNotes();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        onUndo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [disabled, remainingCounts, onInputNumber, onErase, onToggleNotes, onUndo]);

  return (
    <div className="w-full max-w-[490px] mx-auto px-2 mt-2 select-none">
      {/* Flutter IconLabelButton Toolbar: Undo, Erase, Pencil */}
      <div className="flex items-center justify-around py-2 mb-2">
        {/* Undo */}
        <button
          type="button"
          onClick={onUndo}
          disabled={disabled}
          className="flex flex-col items-center justify-center px-4 py-1.5 rounded-lg text-[#1E2233] dark:text-[#F3F4FA] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition disabled:opacity-40"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-5 h-5 mb-1 text-[#1E2233] dark:text-[#F3F4FA]" />
          <span className="text-xs font-normal">Undo</span>
        </button>

        {/* Erase */}
        <button
          type="button"
          onClick={onErase}
          disabled={disabled}
          className="flex flex-col items-center justify-center px-4 py-1.5 rounded-lg text-[#1E2233] dark:text-[#F3F4FA] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition disabled:opacity-40"
          title="Erase (Backspace)"
        >
          <Sparkles className="w-5 h-5 mb-1 text-[#1E2233] dark:text-[#F3F4FA]" />
          <span className="text-xs font-normal">Erase</span>
        </button>

        {/* Pencil / Notes */}
        <button
          type="button"
          onClick={onToggleNotes}
          disabled={disabled}
          className="flex flex-col items-center justify-center px-4 py-1.5 rounded-lg active:scale-95 transition disabled:opacity-40"
          title="Pencil Mode (N)"
        >
          <Edit3
            className={`w-5 h-5 mb-1 transition-colors ${
              isNotesMode ? "text-[#5B6CFF] dark:text-[#7C8CFF]" : "text-[#1E2233] dark:text-[#F3F4FA]"
            }`}
          />
          <span
            className={`text-xs font-medium transition-colors ${
              isNotesMode ? "text-[#5B6CFF] dark:text-[#7C8CFF] font-bold" : "text-[#1E2233] dark:text-[#F3F4FA]"
            }`}
          >
            {isNotesMode ? "Pencil ON" : "Pencil"}
          </span>
        </button>
      </div>

      {/* Flutter NumberPadWidget 1-9 Row */}
      <div className="grid grid-cols-9 gap-1 sm:gap-1.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
          const remaining = remainingCounts[num] ?? 9;
          const isExhausted = remaining <= 0;

          return (
            <button
              key={num}
              type="button"
              disabled={disabled || isExhausted}
              onClick={() => onInputNumber(num)}
              className={`flex flex-col items-center justify-center h-14 sm:h-16 rounded-[10px] transition-all duration-100 border active:scale-90 ${
                isExhausted
                  ? "bg-white/40 dark:bg-[#1B1E29]/40 border-black/5 dark:border-white/5 opacity-30 pointer-events-none"
                  : "bg-white dark:bg-[#1B1E29] border-black/10 dark:border-white/10 hover:border-[#5B6CFF] dark:hover:border-[#7C8CFF] active:bg-[#5B6CFF]/10 shadow-xs"
              }`}
            >
              {/* Flutter Number TextStyle: bold, 22px, AppColors.primary */}
              <span
                className={`text-[22px] font-bold leading-none mb-0.5 ${
                  isExhausted
                    ? "text-[#1E2233]/30 dark:text-[#F3F4FA]/30"
                    : "text-[#5B6CFF] dark:text-[#7C8CFF]"
                }`}
              >
                {num}
              </span>
              {/* Remaining count: 10px, onSurface 0.7 */}
              <span
                className={`text-[10px] leading-none ${
                  isExhausted
                    ? "text-[#1E2233]/30 dark:text-[#F3F4FA]/30"
                    : "text-[#1E2233]/70 dark:text-[#F3F4FA]/70"
                }`}
              >
                {remaining}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
