"use client";

import React, { useEffect, useState } from "react";
import { SudokuGameState } from "../lib/types";
import { soundService } from "../lib/sound/soundService";

interface SudokuBoardProps {
  state: SudokuGameState;
  onSelectCell: (index: number) => void;
  isSpectating?: boolean;
  isDarkMode?: boolean;
}

export const SudokuBoard: React.FC<SudokuBoardProps> = ({
  state,
  onSelectCell,
  isSpectating = false,
  isDarkMode = false,
}) => {
  const { board, puzzle, selectedCell, candidates, incorrectCells } = state;
  const [hasPlayedInitialSound, setHasPlayedInitialSound] = useState(false);

  // Play board placing sound once on board mount
  useEffect(() => {
    if (!hasPlayedInitialSound && puzzle) {
      soundService.playBoardPlacing();
      setHasPlayedInitialSound(true);
    }
  }, [puzzle, hasPlayedInitialSound]);

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

  return (
    <div className="w-full max-w-[490px] mx-auto select-none aspect-square p-2">
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

          // Cell Background color priority
          let cellBg = "transparent";
          if (isSelected) {
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
          if (isIncorrect) {
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
              }}
              className="relative flex items-center justify-center cursor-pointer transition-colors duration-75 select-none"
            >
              {val !== 0 ? (
                /* Regular 400 weight Sudoku font matching Flutter Text */
                <span
                  className={`text-xl sm:text-2xl leading-none transition-transform duration-100 ${
                    isIncorrect ? "animate-errorShake" : ""
                  }`}
                  style={{
                    color: cellTextColor,
                    fontWeight: 400,
                  }}
                >
                  {val}
                </span>
              ) : cellCandidates.length > 0 ? (
                /* 3x3 Pencil notes layout with exact Flutter proportions */
                <div className="w-full h-full p-[2px] grid grid-cols-3 grid-rows-3 pointer-events-none">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <div
                      key={num}
                      style={{
                        color: palette.playerText,
                        opacity: 0.9,
                      }}
                      className="flex items-center justify-center text-[8px] sm:text-[9.5px] leading-none font-normal"
                    >
                      {cellCandidates.includes(num) ? num : ""}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};
