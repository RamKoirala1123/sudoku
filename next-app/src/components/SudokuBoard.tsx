'use client';

import React from 'react';
import { SudokuGameState } from '../lib/types';

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
  const selectedVal = selectedCell !== null ? board[selectedCell] : null;
  const selRow = selectedCell !== null ? Math.floor(selectedCell / 9) : null;
  const selCol = selectedCell !== null ? selectedCell % 9 : null;
  const selBoxRow = selRow !== null ? Math.floor(selRow / 3) * 3 : null;
  const selBoxCol = selCol !== null ? Math.floor(selCol / 3) * 3 : null;

  return (
    <div className="w-full max-w-[490px] mx-auto select-none aspect-square">
      <div className="w-full h-full grid grid-cols-9 grid-rows-9 border-2 border-slate-800 dark:border-slate-300 rounded-lg overflow-hidden bg-white dark:bg-[#181B26] shadow-lg">
        {Array.from({ length: 81 }).map((_, index) => {
          const row = Math.floor(index / 9);
          const col = index % 9;
          const boxRow = Math.floor(row / 3) * 3;
          const boxCol = Math.floor(col / 3) * 3;

          const isSelected = selectedCell === index;
          const isPeer =
            selectedCell !== null &&
            !isSelected &&
            (row === selRow || col === selCol || (boxRow === selBoxRow && boxCol === selBoxCol));
          const val = board[index];
          const isSameVal = selectedVal !== null && selectedVal !== 0 && val === selectedVal;
          const isGiven = puzzle?.givens[index] !== 0;
          const isIncorrect = incorrectCells.includes(index);
          const cellCandidates = candidates[index] ?? [];

          // Border formatting for 3x3 boxes (Sudoku.com style)
          const borderRight =
            col === 2 || col === 5
              ? 'border-r-2 border-slate-700 dark:border-slate-400'
              : col !== 8
              ? 'border-r border-slate-200 dark:border-slate-800'
              : '';
          const borderBottom =
            row === 2 || row === 5
              ? 'border-b-2 border-slate-700 dark:border-slate-400'
              : row !== 8
              ? 'border-b border-slate-200 dark:border-slate-800'
              : '';

          // Background styles
          let bgClass = 'bg-transparent';
          if (isSelected) {
            bgClass = isIncorrect
              ? 'bg-red-500/25 dark:bg-red-900/35'
              : 'bg-indigo-500/25 dark:bg-indigo-500/30';
          } else if (isSameVal) {
            bgClass = 'bg-indigo-500/18 dark:bg-indigo-500/20';
          } else if (isPeer) {
            bgClass = 'bg-slate-100/80 dark:bg-slate-800/40';
          }

          // Number styles (regular font weight as requested)
          let textClass = 'text-slate-900 dark:text-slate-100 font-normal';
          if (isIncorrect) {
            textClass = 'text-red-500 dark:text-red-400 font-medium animate-pulse';
          } else if (isGiven) {
            textClass = 'text-slate-950 dark:text-white font-normal';
          } else if (val !== 0) {
            textClass = 'text-indigo-600 dark:text-indigo-400 font-normal';
          }

          return (
            <div
              key={index}
              onClick={() => !isSpectating && onSelectCell(index)}
              className={`relative flex items-center justify-center cursor-pointer transition-colors duration-100 ${borderRight} ${borderBottom} ${bgClass}`}
              style={{
                fontSize: 'clamp(18px, 4.8vw, 27px)',
              }}
            >
              {val !== 0 ? (
                <span className={textClass}>{val}</span>
              ) : cellCandidates.length > 0 ? (
                // 3x3 Pencil notes layout
                <div className="absolute inset-0 p-0.5 grid grid-cols-3 grid-rows-3 text-[10px] text-slate-400 dark:text-slate-400 font-normal leading-none pointer-events-none select-none">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                    <div key={n} className="flex items-center justify-center">
                      {cellCandidates.includes(n) ? n : ''}
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
