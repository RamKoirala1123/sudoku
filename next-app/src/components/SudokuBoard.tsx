"use client";

import React, { useEffect, useState } from "react";
import { SudokuGameState } from "../lib/types";
import { soundService } from "../lib/sound/soundService";

interface SudokuBoardProps {
  state: SudokuGameState;
  onSelectCell: (index: number) => void;
  isSpectating?: boolean;
}

export const SudokuBoard: React.FC<SudokuBoardProps> = ({
  state,
  onSelectCell,
  isSpectating = false,
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

  return (
    <div className="w-full max-w-[490px] mx-auto select-none aspect-square p-2">
      <div
        className="w-full h-full grid grid-cols-9 grid-rows-9 rounded-[12px] overflow-hidden transition-colors shadow-[0_8px_18px_rgba(0,0,0,0.08)] bg-white dark:bg-[#1B1E29] border-[2.5px] border-[#344861] dark:border-[#7A869E]"
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

          // BoardPalette color resolution (Light vs Dark)
          // Background Color priority:
          // 1. isSelected: #BBDEFB (light) / #32486E (dark)
          // 2. isIncorrect: #FFCDD2 (light) / #4C222B (dark)
          // 3. isSameVal: #CCE5FF (light) / #2E3F5F (dark)
          // 4. isRelated: #E8F0FE (light) / #232A3B (dark)
          let bgClass = "bg-transparent";
          if (isSelected) {
            bgClass = "bg-[#BBDEFB] dark:bg-[#32486E]";
          } else if (isIncorrect) {
            bgClass = "bg-[#FFCDD2] dark:bg-[#4C222B]";
          } else if (isSameVal) {
            bgClass = "bg-[#CCE5FF] dark:bg-[#2E3F5F]";
          } else if (isRelated) {
            bgClass = "bg-[#E8F0FE] dark:bg-[#232A3B]";
          }

          // Text Color priority:
          // isIncorrect: #FF5D6C (light) / #FF8A93 (dark)
          // isGiven: #1E2233 (light) / #F3F4FA (dark)
          // playerText: #0072E3 (light) / #4D9CFF (dark)
          let textClass = "";
          if (isIncorrect) {
            textClass = "text-[#FF5D6C] dark:text-[#FF8A93]";
          } else if (isGiven) {
            textClass = "text-[#1E2233] dark:text-[#F3F4FA]";
          } else {
            textClass = "text-[#0072E3] dark:text-[#4D9CFF]";
          }

          // Exact Flutter Board Borders:
          // Every 3rd cell has thick border (2px), otherwise thin (1px)
          const isRightBoxEdge = (col + 1) % 3 === 0 && col < 8;
          const isBottomBoxEdge = (row + 1) % 3 === 0 && row < 8;
          const isRightThinEdge = (col + 1) % 3 !== 0 && col < 8;
          const isBottomThinEdge = (row + 1) % 3 !== 0 && row < 8;

          return (
            <div
              key={index}
              onClick={() => !isSpectating && onSelectCell(index)}
              className={`relative flex items-center justify-center cursor-pointer transition-colors duration-75 ${bgClass} ${
                isRightBoxEdge ? "border-r-[2px] border-r-[#344861] dark:border-r-[#7A869E]" : ""
              } ${
                isRightThinEdge ? "border-r border-r-[#D6DCED] dark:border-r-[#2E3445]" : ""
              } ${
                isBottomBoxEdge ? "border-b-[2px] border-b-[#344861] dark:border-b-[#7A869E]" : ""
              } ${
                isBottomThinEdge ? "border-b border-b-[#D6DCED] dark:border-b-[#2E3445]" : ""
              }`}
            >
              {val !== 0 ? (
                /* Regular (non-bold) 400 weight Sudoku font */
                <span
                  className={`text-xl sm:text-2xl font-normal leading-none transition-transform duration-100 ${textClass} ${
                    isIncorrect ? "animate-errorShake" : ""
                  }`}
                  style={{ fontWeight: 400 }}
                >
                  {val}
                </span>
              ) : cellCandidates.length > 0 ? (
                /* 3x3 Pencil notes layout with exact Flutter proportions */
                <div className="w-full h-full p-[2px] grid grid-cols-3 grid-rows-3 pointer-events-none">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <div
                      key={num}
                      className="flex items-center justify-center text-[8px] sm:text-[9.5px] leading-none font-normal text-[#0072E3]/90 dark:text-[#4D9CFF]/90"
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
