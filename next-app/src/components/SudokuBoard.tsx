"use client";

import React, { useEffect, useRef, useState } from "react";
import { SudokuGameState, WaveAnimationData, ShakeAnimationData } from "../lib/types";
import { soundService } from "../lib/sound/soundService";

interface SudokuBoardProps {
  state: SudokuGameState;
  onSelectCell: (index: number) => void;
  isSpectating?: boolean;
  isDarkMode?: boolean;
  waveAnimation?: WaveAnimationData | null;
  shakeAnimation?: ShakeAnimationData | null;
  conflictHighlight?: { id: number; cellIndices: number[] } | null;
}

export const SudokuBoard: React.FC<SudokuBoardProps> = ({
  state,
  onSelectCell,
  isSpectating = false,
  isDarkMode = false,
  waveAnimation,
  shakeAnimation,
  conflictHighlight,
}) => {
  const { board, puzzle, selectedCell, candidates, incorrectCells } = state;
  const hasPlayedInitialSoundRef = useRef(false);

  // Play board placing sound once on board mount
  useEffect(() => {
    if (!hasPlayedInitialSoundRef.current && puzzle) {
      soundService.playBoardPlacing();
      hasPlayedInitialSoundRef.current = true;
    }
  }, [puzzle]);

  // Flowing wave animation state (row / column / box completion or error conflict pulse)
  const lastWaveIdRef = useRef<number | null>(null);
  const [activeWave, setActiveWave] = useState<{
    id: number;
    cells: Map<number, { delay: number; dirX: number; dirY: number }>;
    isError: boolean;
  } | null>(null);

  // Error shake animation state (cell & conflict shake on mistake)
  const lastShakeIdRef = useRef<number | null>(null);
  const [activeShaking, setActiveShaking] = useState<{
    id: number;
    cells: Set<number>;
  } | null>(null);

  // Note conflict highlight state (temporarily flashes conflicting row/col/box cells in red)
  const lastConflictIdRef = useRef<number | null>(null);
  const [activeConflict, setActiveConflict] = useState<{
    id: number;
    cells: Set<number>;
  } | null>(null);

  const incomingWave = waveAnimation ?? state.waveAnimation;
  const incomingShake = shakeAnimation ?? state.shakeAnimation;
  const incomingConflict = conflictHighlight ?? state.conflictHighlight;

  // Compute staggered Euclidean distance delays & normalized directions for wave flow
  useEffect(() => {
    if (!incomingWave || incomingWave.id === lastWaveIdRef.current) return;
    lastWaveIdRef.current = incomingWave.id;

    const { triggerIndex, cells, isError = false, id } = incomingWave;
    const tr = Math.floor(triggerIndex / 9);
    const tc = triggerIndex % 9;

    const distances = new Map<number, number>();
    let maxDistance = 0;

    for (const cell of cells) {
      const r = Math.floor(cell / 9);
      const c = cell % 9;
      const dx = c - tc;
      const dy = r - tr;
      const dist = Math.sqrt(dx * dx + dy * dy);
      distances.set(cell, dist);
      if (dist > maxDistance) maxDistance = dist;
    }

    if (maxDistance === 0) maxDistance = 1;

    const cellMap = new Map<number, { delay: number; dirX: number; dirY: number }>();
    for (const cell of cells) {
      const dist = distances.get(cell) || 0;
      const r = Math.floor(cell / 9);
      const c = cell % 9;
      const dx = c - tc;
      const dy = r - tr;
      const dirX = dist === 0 ? 0 : dx / dist;
      const dirY = dist === 0 ? 0 : dy / dist;

      // Stagger delay based on Euclidean distance outward from trigger cell (matches Flutter)
      const delay = Math.round((dist / (maxDistance + 0.0001)) * 260);
      cellMap.set(cell, { delay, dirX, dirY });
    }

    setActiveWave({ id, cells: cellMap, isError });

    const timeout = setTimeout(() => {
      setActiveWave((curr) => (curr?.id === id ? null : curr));
    }, 950);

    return () => clearTimeout(timeout);
  }, [incomingWave]);

  // Handle cell shaking on mistake
  useEffect(() => {
    if (!incomingShake || incomingShake.id === lastShakeIdRef.current) return;
    lastShakeIdRef.current = incomingShake.id;

    const { id, cellIndices } = incomingShake;
    setActiveShaking({ id, cells: new Set(cellIndices) });

    const timeout = setTimeout(() => {
      setActiveShaking((curr) => (curr?.id === id ? null : curr));
    }, 550);

    return () => clearTimeout(timeout);
  }, [incomingShake]);

  // Handle note conflict highlight (temporarily glows row/col/box cells in red for ~850ms)
  useEffect(() => {
    if (!incomingConflict || incomingConflict.id === lastConflictIdRef.current) return;
    lastConflictIdRef.current = incomingConflict.id;

    const { id, cellIndices } = incomingConflict;
    setActiveConflict({ id, cells: new Set(cellIndices) });

    const timeout = setTimeout(() => {
      setActiveConflict((curr) => (curr?.id === id ? null : curr));
    }, 850);

    return () => clearTimeout(timeout);
  }, [incomingConflict]);

  // Arrow key navigation to move selected cell across the 9x9 grid
  useEffect(() => {
    if (isSpectating) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();

        if (selectedCell === null) {
          onSelectCell(40); // default to center cell if none selected
          return;
        }

        const r = Math.floor(selectedCell / 9);
        const c = selectedCell % 9;
        let newR = r;
        let newC = c;

        if (e.key === "ArrowUp") newR = (r - 1 + 9) % 9;
        else if (e.key === "ArrowDown") newR = (r + 1) % 9;
        else if (e.key === "ArrowLeft") newC = (c - 1 + 9) % 9;
        else if (e.key === "ArrowRight") newC = (c + 1) % 9;

        onSelectCell(newR * 9 + newC);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedCell, isSpectating, onSelectCell]);

  const selectedVal = selectedCell !== null ? board[selectedCell] : null;
  const selRow = selectedCell !== null ? Math.floor(selectedCell / 9) : null;
  const selCol = selectedCell !== null ? selectedCell % 9 : null;
  const selBoxRow = selRow !== null ? Math.floor(selRow / 3) * 3 : null;
  const selBoxCol = selCol !== null ? Math.floor(selCol / 3) * 3 : null;

  // Exact BoardPalette from lib/core/theme/app_colors.dart
  const palette = isDarkMode
    ? {
        background: "#1B1E29",
        boxAltBackground: "#20232F",
        gridLineThin: "#2E3445",
        gridLineThick: "#7A869E",
        givenText: "#F3F4FA",
        playerText: "#4D9CFF",
        selectedCell: "#32486E",
        relatedCell: "#232A3B",
        sameNumberCell: "#2E3F5F",
        errorCell: "#4C222B",
        errorText: "#FF8A93",
      }
    : {
        background: "#FFFFFF",
        boxAltBackground: "#F1F3FA",
        gridLineThin: "#D6DCED",
        gridLineThick: "#344861",
        givenText: "#1E2233",
        playerText: "#0072E3",
        selectedCell: "#BBDEFB",
        relatedCell: "#E8F0FE",
        sameNumberCell: "#CCE5FF",
        errorCell: "#FFCDD2",
        errorText: "#FF5D6C",
      };

  // Precompute filled numbers in each row, column, and 3x3 box for instant note conflict detection
  const rowNumbers = Array.from({ length: 9 }, () => new Set<number>());
  const colNumbers = Array.from({ length: 9 }, () => new Set<number>());
  const boxNumbers = Array.from({ length: 9 }, () => new Set<number>());

  for (let i = 0; i < 81; i++) {
    const v = board[i];
    if (v !== 0) {
      const r = Math.floor(i / 9);
      const c = i % 9;
      const b = Math.floor(r / 3) * 3 + Math.floor(c / 3);
      rowNumbers[r].add(v);
      colNumbers[c].add(v);
      boxNumbers[b].add(v);
    }
  }

  return (
    <div className="w-full max-w-[490px] md:max-w-[510px] lg:max-w-[530px] mx-auto select-none aspect-square p-2">
      <div
        className="w-full h-full grid grid-cols-9 grid-rows-9 rounded-[12px] overflow-hidden transition-colors shadow-[0_8px_18px_rgba(0,0,0,0.08)] border-[2.5px]"
        style={{
          backgroundColor: palette.background,
          borderColor: palette.gridLineThick,
        }}
      >
        {Array.from({ length: 81 }).map((_, index) => {
          const row = Math.floor(index / 9);
          const col = index % 9;
          const boxRow = Math.floor(row / 3) * 3;
          const boxCol = Math.floor(col / 3) * 3;

          const isSelected = selectedCell === index;
          const isRelated =
            selectedCell !== null &&
            !isSelected &&
            (row === selRow || col === selCol || (boxRow === selBoxRow && boxCol === selBoxCol));
          const val = board[index];
          const isSameVal = selectedVal !== null && selectedVal !== 0 && val === selectedVal && !isSelected;
          const isGiven = puzzle ? puzzle.givens[index] !== 0 : false;
          const isIncorrect = incorrectCells.includes(index);
          const cellCandidates = candidates[index] || [];

          // Cell Wave, Shake & Conflict status
          const cellWave = activeWave?.cells.get(index);
          const isShaking = activeShaking?.cells.has(index);
          const isConflicting = activeConflict?.cells.has(index);

          // Cell Background color priority
          let cellBg = "transparent";
          if (isConflicting) {
            cellBg = palette.errorCell;
          } else if (isSelected) {
            cellBg = palette.selectedCell;
          } else if (isIncorrect) {
            cellBg = palette.errorCell;
          } else if (isSameVal) {
            cellBg = palette.sameNumberCell;
          } else if (isRelated) {
            cellBg = palette.relatedCell;
          }

          // Text color priority
          let cellTextColor = palette.playerText;
          if (isConflicting) {
            cellTextColor = palette.errorText;
          } else if (isIncorrect) {
            cellTextColor = palette.errorText;
          } else if (isGiven) {
            cellTextColor = palette.givenText;
          }

          // Exact Flutter Board Borders:
          // Every 3rd cell has thick border (2px), otherwise thin (1px)
          const isRightBoxEdge = (col + 1) % 3 === 0 && col < 8;
          const isBottomBoxEdge = (row + 1) % 3 === 0 && row < 8;
          const isRightThinEdge = (col + 1) % 3 !== 0 && col < 8;
          const isBottomThinEdge = (row + 1) % 3 !== 0 && row < 8;

          const borderRightStyle = isRightBoxEdge
            ? `2px solid ${palette.gridLineThick}`
            : isRightThinEdge
            ? `1px solid ${palette.gridLineThin}`
            : "none";

          const borderBottomStyle = isBottomBoxEdge
            ? `2px solid ${palette.gridLineThick}`
            : isBottomThinEdge
            ? `1px solid ${palette.gridLineThin}`
            : "none";

          return (
            <div
              key={index}
              onClick={() => !isSpectating && onSelectCell(index)}
              style={{
                backgroundColor: cellBg,
                borderRight: borderRightStyle,
                borderBottom: borderBottomStyle,
                animation: isConflicting
                  ? "cellGentleShake 380ms cubic-bezier(0.36, 0.07, 0.19, 0.97) both"
                  : isShaking
                  ? "cellErrorShake 450ms cubic-bezier(0.36, 0.07, 0.19, 0.97) both"
                  : undefined,
              }}
              className="relative flex items-center justify-center cursor-pointer transition-colors duration-75 select-none overflow-hidden"
            >
              {/* Flowing Wave Overlay across completed row/column/box or conflict pulse */}
              {cellWave && (
                <div
                  key={`wave-${activeWave?.id}-${index}`}
                  className="absolute inset-0 pointer-events-none z-10"
                  style={{
                    borderRadius: "2px",
                    animation: `waveFlow ${activeWave?.isError ? "700ms" : "520ms"} cubic-bezier(0.25, 1, 0.5, 1) ${cellWave.delay}ms both`,
                    backgroundColor: activeWave?.isError
                      ? (isDarkMode ? "rgba(255, 93, 108, 0.45)" : "rgba(255, 93, 108, 0.35)")
                      : (isDarkMode ? "rgba(77, 156, 255, 0.45)" : "rgba(187, 222, 251, 0.82)"),
                    boxShadow: activeWave?.isError
                      ? "0 0 14px rgba(255, 93, 108, 0.6)"
                      : isDarkMode
                      ? "0 0 16px rgba(77, 156, 255, 0.5)"
                      : "0 0 14px rgba(33, 150, 243, 0.45)",
                    "--dir-x": cellWave.dirX,
                    "--dir-y": cellWave.dirY,
                  } as React.CSSProperties}
                />
              )}

              {val !== 0 ? (
                /* Regular 400 weight Sudoku font matching Flutter Text */
                <span
                  className="text-xl sm:text-[25px] md:text-[27px] lg:text-[29px] leading-none select-none transition-colors"
                  style={{
                    color: cellTextColor,
                    fontWeight: 400,
                    animation: isShaking
                      ? "errorNumberPulse 450ms ease-in-out both"
                      : cellWave
                      ? `waveNumberPop 500ms cubic-bezier(0.34, 1.56, 0.64, 1) ${cellWave.delay}ms both`
                      : undefined,
                  }}
                >
                  {val}
                </span>
              ) : cellCandidates.length > 0 ? (
                /* 3x3 Pencil notes layout with Flutter proportions, selected number highlight & red error for conflicts */
                <div className="w-full h-full p-[1.5px] grid grid-cols-3 grid-rows-3 pointer-events-none">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
                    const hasCandidate = cellCandidates.includes(num);
                    if (!hasCandidate) {
                      return <div key={num} className="flex items-center justify-center" />;
                    }

                    const isSelectedCandidate = selectedVal !== null && selectedVal !== 0 && selectedVal === num;

                    let noteColor = palette.playerText;
                    let noteBg = "transparent";
                    let noteFontWeight = 400;
                    let noteTransform = "scale(1)";

                    if (isSelectedCandidate) {
                      noteBg = isDarkMode ? "#2D4875" : "#CCE5FF";
                      noteColor = isDarkMode ? "#82B8FF" : "#005CBD";
                      noteFontWeight = 700;
                      noteTransform = "scale(1.2)";
                    }

                    return (
                      <div
                        key={num}
                        className="flex items-center justify-center p-[0.5px]"
                      >
                        <span
                          style={{
                            color: noteColor,
                            backgroundColor: noteBg,
                            fontWeight: noteFontWeight,
                            transform: noteTransform,
                            borderRadius: "9999px",
                            transition: "all 120ms ease-out",
                          }}
                          className="w-full h-full flex items-center justify-center text-[9px] sm:text-[10px] md:text-[11px] lg:text-[12px] leading-none select-none"
                        >
                          {num}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};
