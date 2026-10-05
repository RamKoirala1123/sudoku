"use client";

import React from "react";
import { Skull, Eye, RotateCcw, Home } from "lucide-react";
import { MistakeRule } from "@/lib/types";

interface KnockoutOverlayProps {
  mistakeRule: MistakeRule;
  mistakes: number;
  maxMistakes: number;
  isMultiplayer: boolean;
  onSpectate?: () => void;
  onRestart?: () => void;
  onLeave: () => void;
}

export const KnockoutOverlay: React.FC<KnockoutOverlayProps> = ({
  mistakeRule,
  mistakes,
  maxMistakes,
  isMultiplayer,
  onSpectate,
  onRestart,
  onLeave,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn select-none">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl">
        {/* Skull Icon */}
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-4 border border-rose-500/20 shadow-inner">
          <Skull className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-1">
          Knocked Out!
        </h2>

        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          {mistakeRule === "hardcore"
            ? "Hardcore Sudden Death: 1 mistake and you're eliminated!"
            : `You made ${mistakes}/${maxMistakes} mistakes.`}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          {isMultiplayer && onSpectate && (
            <button
              type="button"
              onClick={onSpectate}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition active:scale-98 shadow-md shadow-indigo-500/25"
            >
              <Eye className="w-4 h-4" />
              <span>Spectate Race</span>
            </button>
          )}

          {!isMultiplayer && onRestart && (
            <button
              type="button"
              onClick={onRestart}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition active:scale-98 shadow-md shadow-indigo-500/25"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
          )}

          <button
            type="button"
            onClick={onLeave}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition active:scale-98"
          >
            <Home className="w-4 h-4" />
            <span>{isMultiplayer ? "Leave Room" : "Main Menu"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
