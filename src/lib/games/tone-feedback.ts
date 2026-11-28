export type GameSoundEvent =
  "start" | "move" | "jump" | "collect" | "success" | "miss" | "gameOver";

export type GameMusicTheme = "adventure" | "night" | "learning";

type ToneNote = {
  frequency: number;
  duration: number;
  delay?: number;
  volume?: number;
};

const EVENT_NOTES: Record<GameSoundEvent, ToneNote[]> = {
  start: [
    { frequency: 392, duration: 0.08, volume: 0.045 },
    { frequency: 523.25, duration: 0.12, delay: 0.08, volume: 0.05 },
  ],
  move: [{ frequency: 294, duration: 0.045, volume: 0.035 }],
  jump: [
    { frequency: 330, duration: 0.07, volume: 0.04 },
    { frequency: 494, duration: 0.1, delay: 0.055, volume: 0.045 },
  ],
  collect: [
    { frequency: 523.25, duration: 0.06, volume: 0.045 },
    { frequency: 659.25, duration: 0.09, delay: 0.06, volume: 0.05 },
  ],
  success: [
    { frequency: 392, duration: 0.08, volume: 0.045 },
    { frequency: 523.25, duration: 0.08, delay: 0.08, volume: 0.045 },
    { frequency: 659.25, duration: 0.14, delay: 0.16, volume: 0.05 },
  ],
  miss: [{ frequency: 220, duration: 0.1, volume: 0.04 }],
  gameOver: [
    { frequency: 247, duration: 0.1, volume: 0.045 },
    { frequency: 196, duration: 0.18, delay: 0.1, volume: 0.05 },
  ],
};

export type GameVoice = {
  wave: OscillatorType;
  /** Pitch multiplier applied to every note. */
  pitch: number;
  /** Semitone steps each note is snapped to (relative to C), so each game has its own scale. */
  scale: number[];
  /** Short motif (semitones above C5) played on start so each game has its own sound signature. */
  motif: number[];
  /** Note length multiplier. */
  length: number;
};

const PENTATONIC = [0, 2, 4, 7, 9];
const MAQAM_HIJAZ = [0, 1, 4, 5, 7, 8, 10];
const MAQAM_BAYATI = [0, 1.5, 3, 5, 7, 8, 10];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const LYDIAN = [0, 2, 4, 6, 7, 9, 11];
const WHOLE = [0, 2, 4, 6, 8, 10];

/** One distinct, free, synthesized sound identity per game (WebAudio only, no audio files). */
export const GAME_VOICES: Record<string, GameVoice> = {
  "zikr-runner": { wave: "square", pitch: 1, scale: PENTATONIC, motif: [0, 4, 7, 12], length: 0.8 },
  "zikr-road": { wave: "sawtooth", pitch: 0.75, scale: MAJOR, motif: [0, 7, 5, 12], length: 0.9 },
  "hilal-fly": { wave: "sine", pitch: 1.5, scale: WHOLE, motif: [12, 9, 6, 2], length: 1.6 },
  "zikr-jump": { wave: "square", pitch: 1.25, scale: MAJOR, motif: [0, 0, 7, 12], length: 0.6 },
  "mosque-adventure": { wave: "triangle", pitch: 1, scale: MAQAM_HIJAZ, motif: [0, 1, 4, 7], length: 1.2 },
  "mosque-cleanup": { wave: "triangle", pitch: 1.1, scale: PENTATONIC, motif: [7, 4, 7, 12], length: 0.9 },
  "zikr-coloring": { wave: "sine", pitch: 1.3, scale: LYDIAN, motif: [0, 4, 9, 14], length: 1.4 },
  "zikr-memory": { wave: "triangle", pitch: 1.2, scale: MAJOR, motif: [4, 0, 4, 9], length: 1.1 },
  "zikr-quiz": { wave: "sine", pitch: 1, scale: MAJOR, motif: [0, 4, 7, 4], length: 1 },
  "letter-lab": { wave: "triangle", pitch: 1.35, scale: PENTATONIC, motif: [9, 12, 9, 14], length: 1 },
  "verse-puzzle": { wave: "sine", pitch: 0.85, scale: MAQAM_BAYATI, motif: [0, 3, 5, 7], length: 1.5 },
  "wudu-challenge": { wave: "sine", pitch: 1.05, scale: LYDIAN, motif: [14, 9, 4, 0], length: 1.3 },
  "good-deeds": { wave: "triangle", pitch: 0.95, scale: MAQAM_HIJAZ, motif: [0, 5, 8, 12], length: 1.2 },
};

export function snapToScale(frequency: number, scale: number[]): number {
  const semitones = 12 * Math.log2(frequency / 261.6256);
  const octave = Math.floor(semitones / 12);
  const inOctave = semitones - octave * 12;
  let best = scale[0];
  for (const step of [...scale, 12]) if (Math.abs(step - inOctave) < Math.abs(best - inOctave)) best = step;
  return 261.6256 * 2 ** ((octave * 12 + best) / 12);
}

export class ToneFeedback {
  private context: AudioContext | null = null;
  private muted = false;
  private music: HTMLAudioElement | null = null;
  private readonly musicUrl: string;

  private voice: GameVoice | null = null;
  private motifPlayed = false;

  constructor(theme: GameMusicTheme = "learning", gameId?: string) {
    this.musicUrl = `/audio/kids-${theme}-theme.mp3`;
    this.voice = gameId ? (GAME_VOICES[gameId] ?? null) : null;
  }

  setMuted(value: boolean) {
    this.muted = value;
    if (value) {
      this.context?.suspend().catch(() => undefined);
      this.music?.pause();
      return;
    }
    this.context?.resume().catch(() => undefined);
    if (this.music && this.music.paused) this.music.play().catch(() => undefined);
  }

  play(frequency: number, duration = 0.08) {
    this.playNotes([{ frequency, duration }]);
  }

  playEvent(event: GameSoundEvent) {
    this.startMusic();
    if (this.voice && !this.motifPlayed) {
      this.motifPlayed = true;
      this.playNotes(
        this.voice.motif.map((step, index) => ({
          frequency: 523.25 * 2 ** (step / 12) * this.voice!.pitch,
          duration: 0.09 * this.voice!.length,
          delay: index * 0.1 * this.voice!.length,
          volume: 0.04,
        }))
      );
    }
    this.playNotes(EVENT_NOTES[event]);
  }

  private startMusic() {
    if (this.muted || typeof window === "undefined") return;
    if (!this.music) {
      this.music = new Audio(this.musicUrl);
      this.music.loop = true;
      this.music.volume = 0.12;
      this.music.preload = "auto";
    }
    if (this.music.paused) this.music.play().catch(() => undefined);
  }

  private playNotes(notes: ToneNote[]) {
    if (this.muted || typeof window === "undefined") return;
    const AudioContextConstructor =
      window.AudioContext ??
      (
        window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;
    if (!AudioContextConstructor) return;
    if (!this.context) this.context = new AudioContextConstructor();

    const context = this.context;
    context.resume().catch(() => undefined);
    const now = context.currentTime;

    for (const note of notes) {
      const startAt = now + (note.delay ?? 0);
      const endAt = startAt + note.duration * (this.voice?.length ?? 1);
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const peak = Math.max(0.01, Math.min(0.08, note.volume ?? 0.06));
      const voice = this.voice;
      oscillator.type = voice?.wave ?? "sine";
      const frequency = voice ? snapToScale(note.frequency * voice.pitch, voice.scale) : note.frequency;
      oscillator.frequency.setValueAtTime(frequency, startAt);
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, endAt);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(startAt);
      oscillator.stop(endAt + 0.02);
    }
  }

  dispose() {
    this.music?.pause();
    this.music = null;
    this.context?.close().catch(() => undefined);
    this.context = null;
  }
}
