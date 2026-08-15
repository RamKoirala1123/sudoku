# Sudoku Duel

A polished, single-player Sudoku mobile game built with Flutter — architected
so a future 1v1 multiplayer mode can be added without rewriting the Sudoku
engine.

## Running it

```bash
flutter pub get
flutter run
```

Requires Flutter 3.19+ / Dart 3.3+. No backend or account is required — all
data (settings, statistics) is stored locally via `shared_preferences`.

Run the engine tests with:

```bash
flutter test
```

`test/sudoku_engine_test.dart` verifies, for every difficulty, that generated
puzzles are valid, that every given cell matches the solution, and — the
most important correctness property — that **every generated puzzle has
exactly one solution**.

## Architecture

```
lib/
  core/                     # theme, constants — no feature-specific code
  features/
    sudoku/
      domain/
        entities/           # Difficulty, GameStatus, SudokuMove, GameEvent...
        engine/              # SudokuSolver, SudokuGenerator — pure Dart, no Flutter
        game/                 # SudokuGameState (data) + SudokuGameController (ChangeNotifier)
      presentation/
        screens/             # HomeScreen, GameScreen
        widgets/              # Board, cells, number pad, overlays
    statistics/
      domain/ data/ presentation/   # PlayerStatistics model, repo, controller
    settings/
      domain/ data/ presentation/   # AppSettings model, repo, controller
```

**Why it's split this way:** the Sudoku engine (`domain/engine` +
`domain/game`) has zero Flutter/UI imports and doesn't know whether it's
running single-player or multiplayer. It:

- Generates a complete valid board via randomized backtracking.
- Carves cells out one at a time, re-checking after every removal that the
  puzzle still has **exactly one** solution (`SudokuSolver.hasUniqueSolution`).
  Puzzles are never produced by blind cell-removal.
- Represents the board as a flat `List<int>` (81 cells, 0 = empty), the
  representation the spec calls out as multiplayer-sync-friendly.
- Emits `GameEvent`s (`CellSelectedEvent`, `MoveCorrectEvent`, ...) on a
  broadcast stream — today the UI mostly ignores these, but it's the exact
  seam a future `GameConnection`/WebSocket layer would tap into to mirror
  moves between two players, per:

  ```
  Player A → Game Engine → Game Connection → WebSocket Server →
  Game Connection → Game Engine → Player B
  ```

`SudokuGameController` is a plain `ChangeNotifier` — not tied to any single
state-management package's opinions — so swapping Provider for something
else later only touches widgets, not game logic.

## Feature coverage

- 5 difficulty levels (Easy → Extreme), each with a uniquely-solvable
  generated puzzle.
- 9x9 board with given/player/selected/related/same-number/error highlighting.
- Number pad with per-digit exhaustion (disables a digit once all 9 are placed).
- Scoring: +10 correct / −5 incorrect, floor of 0.
- 3-lives system; losing all three ends the game immediately.
- Timer that only runs while `status == playing`.
- Pause (stops timer, disables board), Restart (with optional confirmation),
  Game Over / Victory result screens with full stats.
- Local statistics per difficulty (games played/won/lost, best score, best time).
- Settings: sound, vibration, dark mode, show-mistakes, confirm-restart —
  all persisted locally.
- Light & dark themes with a single shared color-role palette
  (`BoardPalette`) so the board never branches on brightness ad hoc.
