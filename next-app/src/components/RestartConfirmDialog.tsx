"use client";

import React from "react";

interface RestartConfirmDialogProps {
  onConfirm: () => void;
  onCancel: () => void;
  isDarkMode?: boolean;
}

export const RestartConfirmDialog: React.FC<RestartConfirmDialogProps> = ({
  onConfirm,
  onCancel,
  isDarkMode = false,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn select-none">
      <div
        className={`w-full max-w-[340px] rounded-[24px] p-6 shadow-2xl transition-all ${
          isDarkMode
            ? "bg-[#1B1E29] text-[#F3F4FA] border border-white/10"
            : "bg-white text-[#1E2233] border border-black/5"
        }`}
      >
        <h3 className="text-lg font-bold mb-2">Restart puzzle?</h3>
        <p className="text-sm text-[#1E2233]/70 dark:text-[#F3F4FA]/70 leading-relaxed mb-6">
          Are you sure you want to restart this puzzle? Your current progress will be lost.
        </p>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-[10px] text-sm font-bold text-[#1E2233]/80 dark:text-[#F3F4FA]/80 hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition cursor-pointer"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-[10px] bg-[#5B6CFF] hover:bg-[#4D5EFF] text-white text-sm font-bold active:scale-95 transition cursor-pointer shadow-sm"
          >
            RESTART
          </button>
        </div>
      </div>
    </div>
  );
};
