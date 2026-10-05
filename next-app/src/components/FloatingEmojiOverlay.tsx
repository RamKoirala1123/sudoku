"use client";

import React from "react";

export interface FloatingEmoji {
  id: string;
  emoji: string;
  senderName: string;
  leftPercent: number;
}

interface FloatingEmojiOverlayProps {
  emojis: FloatingEmoji[];
}

export const FloatingEmojiOverlay: React.FC<FloatingEmojiOverlayProps> = ({ emojis }) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      {emojis.map((item) => (
        <div
          key={item.id}
          className="absolute bottom-16 flex flex-col items-center animate-floatUp"
          style={{
            left: `${item.leftPercent}%`,
          }}
        >
          <span className="text-3xl sm:text-4xl filter drop-shadow-md select-none">
            {item.emoji}
          </span>
          <span className="text-[10px] font-bold bg-slate-900/70 text-white px-1.5 py-0.5 rounded-full mt-0.5 whitespace-nowrap shadow-xs">
            {item.senderName}
          </span>
        </div>
      ))}
    </div>
  );
};
