"use client";

import React, { useEffect } from "react";
import { Undo2, Eraser, Pencil, RotateCcw, Lightbulb } from "lucide-react";

interface NumberPadProps {
  remainingCounts: Record<number, number>;
  isNotesMode: boolean;
  onToggleNotes: () => void;
  onInputNumber: (num: number) => void;
  onErase: () => void;
  onUndo: () => void;
  onRestart?: () => void;
  onHint?: () => void;
  disabled?: boolean;
}

export const NumberPad: React.FC<NumberPadProps> = ({
  remainingCounts,
  isNotesMode,
  onToggleNotes,
  onInputNumber,
  onErase,
  onUndo,
  onRestart,
  onHint,
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
    <div className="w-full max-w-[490px] mx-auto px-2 mt-4 select-none">
      {/* Action Controls Row */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {/* Undo */}
        <button
          type="button"
          onClick={onUndo}
          disabled={disabled}
          className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 transition-all text-slate-700 dark:text-slate-300 active:scale-95 disabled:opacity-40"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-5 h-5 mb-0.5 text-indigo-600 dark:text-indigo-400" />
          <span className="text-[11px] font-medium tracking-tight">Undo</span>
        </button>

        {/* Erase */}
        <button
          type="button"
          onClick={onErase}
          disabled={disabled}
          className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 transition-all text-slate-700 dark:text-slate-300 active:scale-95 disabled:opacity-40"
          title="Erase (Backspace)"
        >
          <Eraser className="w-5 h-5 mb-0.5 text-rose-500 dark:text-rose-400" />
          <span className="text-[11px] font-medium tracking-tight">Erase</span>
        </button>

        {/* Pencil / Notes Toggle */}
        <button
          type="button"
          onClick={onToggleNotes}
          disabled={disabled}
          className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all active:scale-95 disabled:opacity-40 ${
            isNotesMode
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25 dark:bg-indigo-500"
              : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300"
          }`}
          title="Notes mode (N)"
        >
          <div className="relative">
            <Pencil className={`w-5 h-5 mb-0.5 ${isNotesMode ? "text-white" : "text-amber-500 dark:text-amber-400"}`} />
            <span
              className={`absolute -top-1 -right-4 px-1 py-0.2 text-[8px] font-bold rounded-full uppercase leading-tight ${
                isNotesMode ? "bg-amber-400 text-slate-950 font-black" : "bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              {isNotesMode ? "ON" : "OFF"}
            </span>
          </div>
          <span className="text-[11px] font-medium tracking-tight">Notes</span>
        </button>

        {/* Restart or Hint */}
        {onHint ? (
          <button
            type="button"
            onClick={onHint}
            disabled={disabled}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 transition-all text-slate-700 dark:text-slate-300 active:scale-95 disabled:opacity-40"
            title="Hint"
          >
            <Lightbulb className="w-5 h-5 mb-0.5 text-amber-500 dark:text-amber-400" />
            <span className="text-[11px] font-medium tracking-tight">Hint</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onRestart}
            disabled={disabled}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 transition-all text-slate-700 dark:text-slate-300 active:scale-95 disabled:opacity-40"
            title="Restart"
          >
            <RotateCcw className="w-5 h-5 mb-0.5 text-sky-500 dark:text-sky-400" />
            <span className="text-[11px] font-medium tracking-tight">Restart</span>
          </button>
        )}
      </div>

      {/* 1-9 Number Row (Sudoku.com style with remaining counts) */}
      <div className="grid grid-cols-9 gap-1.5 sm:gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
          const remaining = remainingCounts[num] ?? 9;
          const isDone = remaining <= 0;

          return (
            <button
              key={num}
              type="button"
              disabled={disabled || isDone}
              onClick={() => onInputNumber(num)}
              className={`flex flex-col items-center justify-center h-14 sm:h-16 rounded-xl transition-all duration-150 relative active:scale-90 ${
                isDone
                  ? "opacity-20 pointer-events-none bg-slate-100 dark:bg-slate-800/40 text-slate-400"
                  : "bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:border-indigo-400 border border-slate-200 dark:border-slate-700 shadow-sm active:bg-indigo-100"
              }`}
            >
              <span className="text-2xl sm:text-3xl font-normal leading-none mb-1 text-slate-900 dark:text-slate-100">
                {num}
              </span>
              <span className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 font-medium leading-none">
                {isDone ? "✓" : remaining}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
