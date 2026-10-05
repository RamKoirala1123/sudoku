class SoundService {
  private _enabled = true;
  private _audioCache: Map<string, HTMLAudioElement> = new Map();

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sudoku_sound_enabled');
      this._enabled = saved !== 'false';
    }
  }

  get isEnabled(): boolean {
    return this._enabled;
  }

  toggle(): boolean {
    this._enabled = !this._enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('sudoku_sound_enabled', String(this._enabled));
    }
    return this._enabled;
  }

  setEnabled(value: boolean) {
    this._enabled = value;
    if (typeof window !== 'undefined') {
      localStorage.setItem('sudoku_sound_enabled', String(this._enabled));
    }
  }

  setMuted(muted: boolean) {
    this.setEnabled(!muted);
  }

  private _play(filename: string, volume = 0.5) {
    if (!this._enabled || typeof window === 'undefined') return;

    try {
      let audio = this._audioCache.get(filename);
      if (!audio) {
        audio = new Audio(`/sounds/${filename}`);
        audio.preload = 'auto';
        this._audioCache.set(filename, audio);
      }
      audio.currentTime = 0;
      audio.volume = volume;
      audio.play().catch(() => {
        // Autoplay may be restricted before user gesture
      });
    } catch {
      // Fallback
    }
  }

  playCellSuccess() {
    this._play('success_cell.mp3', 0.6);
  }

  playSuccess() {
    this.playCellSuccess();
  }

  playCellError() {
    this._play('error_cell.mp3', 0.6);
  }

  playError() {
    this.playCellError();
  }

  playNumberCompleted() {
    this._play('number_completion.mp3', 0.7);
  }

  playCompletion() {
    this._play('number_completion.mp3', 0.8);
  }

  playBoardPlacing() {
    this._play('board_placing.mp3', 0.5);
  }

  playPlace() {
    this.playBoardPlacing();
  }

  playTap() {
    this._play('cell_success.mp3', 0.25);
  }
}

export const soundService = new SoundService();
