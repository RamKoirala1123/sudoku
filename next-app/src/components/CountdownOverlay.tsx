"use client";

import React, { useEffect, useRef, useState } from "react";
import { soundService } from "@/lib/sound/soundService";

interface CountdownOverlayProps {
  initialCount?: number;
  onComplete: () => void;
}

export const CountdownOverlay: React.FC<CountdownOverlayProps> = ({
  initialCount = 3,
  onComplete,
}) => {
  const [count, setCount] = useState<number>(initialCount);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    soundService.playTap();
    const interval = setInterval(() => {
      setCount((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          soundService.playSuccess();
          setTimeout(() => {
            onCompleteRef.current();
          }, 600);
          return 0; // 0 = "GO!"
        }
        soundService.playTap();
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="flex flex-col items-center justify-center">
        <span className="text-slate-400 text-sm uppercase tracking-widest font-semibold mb-4">
          Match Starting In
        </span>
        <div
          key={count}
          className="text-8xl sm:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 via-sky-300 to-indigo-600 animate-bounce scale-110 drop-shadow-[0_10px_20px_rgba(99,102,241,0.5)]"
        >
          {count === 0 ? "GO!" : count}
        </div>
      </div>
    </div>
  );
};
