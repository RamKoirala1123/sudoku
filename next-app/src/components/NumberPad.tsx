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
  isGrid?: boolean;
  isDarkMode?: boolean;
  showToolbar?: boolean;
  toolbarOrder?: "undo-erase-pencil" | "undo-pencil-erase";
}

export const NumberPad: React.FC<NumberPadProps> = ({
  remainingCounts,
  isNotesMode,
  onToggleNotes,
  onInputNumber,
  onErase,
  onUndo,
  disabled = false,
  isGrid = false,
  isDarkMode = false,
  showToolbar = true,
  toolbarOrder = "undo-erase-pencil",
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

  const primaryColor = isDarkMode ? "#7C8CFF" : "#5B6CFF";
  const surfaceColor = isDarkMode ? "#1B1E29" : "#FFFFFF";
  const textColor = isDarkMode ? "#F3F4FA" : "#1E2233";
  const borderColor = isDarkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)";

  const renderToolbar = () => {
    const undoBtn = (
      <button
        key="undo"
        type="button"
        onClick={onUndo}
        disabled={disabled}
        className="flex flex-col items-center justify-center px-4 py-1.5 rounded-lg active:scale-95 transition disabled:opacity-40 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
        style={{ color: textColor }}
        title="Undo (Ctrl+Z)"
      >
        <Undo2 className="w-5 h-5 mb-1" />
        <span className="text-xs font-normal">Undo</span>
      </button>
    );

    const eraseBtn = (
      <button
        key="erase"
        type="button"
        onClick={onErase}
        disabled={disabled}
        className="flex flex-col items-center justify-center px-4 py-1.5 rounded-lg active:scale-95 transition disabled:opacity-40 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
        style={{ color: textColor }}
        title="Erase (Backspace)"
      >
        <Sparkles className="w-5 h-5 mb-1" />
        <span className="text-xs font-normal">Erase</span>
      </button>
    );

    const pencilBtn = (
      <button
        key="pencil"
        type="button"
        onClick={onToggleNotes}
        disabled={disabled}
        className="flex flex-col items-center justify-center px-4 py-1.5 rounded-lg active:scale-95 transition disabled:opacity-40 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
        style={{ color: isNotesMode ? primaryColor : textColor }}
        title="Pencil Mode (N)"
      >
        <Edit3 className="w-5 h-5 mb-1" />
        <span className="text-xs font-medium">
          {isNotesMode ? "Pencil ON" : "Pencil"}
        </span>
      </button>
    );

    if (toolbarOrder === "undo-pencil-erase") {
      return (
        <div className="flex items-center justify-around py-2 mb-3">
          {undoBtn}
          {pencilBtn}
          {eraseBtn}
        </div>
      );
    }

    return (
      <div className="flex items-center justify-around py-2 mb-3">
        {undoBtn}
        {eraseBtn}
        {pencilBtn}
      </div>
    );
  };

  return (
    <div className="w-full select-none">
      {/* Flutter IconLabelButton Toolbar */}
      {showToolbar && renderToolbar()}

      {/* Number Pad Grid or Row */}
      {isGrid ? (
        /* Flutter 3x3 Keypad (widescreen) */
        <div className="grid grid-cols-3 gap-2.5 max-w-[290px] mx-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
            const remaining = remainingCounts[num] ?? 9;
            const isExhausted = remaining <= 0;

            return (
              <button
                key={num}
                type="button"
                disabled={disabled || isExhausted}
                onClick={() => onInputNumber(num)}
                style={{
                  backgroundColor: isExhausted
                    ? isDarkMode
                      ? "rgba(27, 30, 41, 0.4)"
                      : "rgba(255, 255, 255, 0.4)"
                    : surfaceColor,
                  borderColor: borderColor,
                }}
                className={`flex flex-col items-center justify-center h-20 rounded-[12px] border active:scale-95 transition-all cursor-pointer ${
                  isExhausted ? "opacity-30 pointer-events-none" : "hover:border-[#5B6CFF] shadow-xs"
                }`}
              >
                <span
                  style={{
                    color: isExhausted
                      ? isDarkMode
                        ? "rgba(243, 244, 250, 0.3)"
                        : "rgba(30, 34, 51, 0.3)"
                      : primaryColor,
                  }}
                  className="text-[28px] font-bold leading-none mb-1"
                >
                  {num}
                </span>
                <span
                  style={{
                    color: isExhausted
                      ? isDarkMode
                        ? "rgba(243, 244, 250, 0.3)"
                        : "rgba(30, 34, 51, 0.3)"
                      : isDarkMode
                      ? "rgba(243, 244, 250, 0.7)"
                      : "rgba(30, 34, 51, 0.7)",
                  }}
                  className="text-[11px] leading-none"
                >
                  {remaining}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        /* Flutter 1-row NumberPad (mobile) */
        <div className="grid grid-cols-9 gap-1 sm:gap-1.5 max-w-[490px] mx-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
            const remaining = remainingCounts[num] ?? 9;
            const isExhausted = remaining <= 0;

            return (
              <button
                key={num}
                type="button"
                disabled={disabled || isExhausted}
                onClick={() => onInputNumber(num)}
                style={{
                  backgroundColor: isExhausted
                    ? isDarkMode
                      ? "rgba(27, 30, 41, 0.4)"
                      : "rgba(255, 255, 255, 0.4)"
                    : surfaceColor,
                  borderColor: borderColor,
                }}
                className={`flex flex-col items-center justify-center h-14 sm:h-16 rounded-[10px] border active:scale-90 transition-all cursor-pointer ${
                  isExhausted ? "opacity-30 pointer-events-none" : "hover:border-[#5B6CFF] shadow-xs"
                }`}
              >
                <span
                  style={{
                    color: isExhausted
                      ? isDarkMode
                        ? "rgba(243, 244, 250, 0.3)"
                        : "rgba(30, 34, 51, 0.3)"
                      : primaryColor,
                  }}
                  className="text-[22px] font-bold leading-none mb-0.5"
                >
                  {num}
                </span>
                <span
                  style={{
                    color: isExhausted
                      ? isDarkMode
                        ? "rgba(243, 244, 250, 0.3)"
                        : "rgba(30, 34, 51, 0.3)"
                      : isDarkMode
                      ? "rgba(243, 244, 250, 0.7)"
                      : "rgba(30, 34, 51, 0.7)",
                  }}
                  className="text-[10px] leading-none"
                >
                  {remaining}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
