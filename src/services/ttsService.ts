import * as Speech from 'expo-speech';

const EN_OPTIONS: Speech.SpeechOptions = {
  language: 'en-US',
  rate: 0.9,
  pitch: 1.0,
};

const KO_OPTIONS: Speech.SpeechOptions = {
  language: 'ko-KR',
  rate: 0.9,
  pitch: 1.0,
};

/** Speak a single English text (legacy) */
export function speak(text: string, onDone?: () => void): void {
  Speech.speak(text, {
    ...EN_OPTIONS,
    onDone,
  });
}

/** Speak Korean text */
export function speakKorean(text: string, onDone?: () => void): void {
  Speech.speak(text, {
    ...KO_OPTIONS,
    onDone,
  });
}

export function stopSpeaking(): void {
  Speech.stop();
}

export function isSpeaking(): Promise<boolean> {
  return Speech.isSpeakingAsync();
}

// ── Repeating prompter: EN → pause → KO → pause → repeat ──

let _repeatTimer: ReturnType<typeof setTimeout> | null = null;
let _isRepeating = false;

/**
 * Start repeating cycle:  English sentence → 1s pause → Korean meaning → 2s pause → repeat
 * Continues until stopRepeating() is called.
 */
export function startRepeating(englishText: string, koreanText: string): void {
  _isRepeating = true;
  playCycle(englishText, koreanText);
}

function playCycle(en: string, ko: string): void {
  if (!_isRepeating) return;

  // Step 1: Speak English
  Speech.speak(en, {
    ...EN_OPTIONS,
    onDone: () => {
      if (!_isRepeating) return;

      // Step 2: 1-second pause, then speak Korean
      _repeatTimer = setTimeout(() => {
        if (!_isRepeating) return;

        Speech.speak(ko, {
          ...KO_OPTIONS,
          onDone: () => {
            if (!_isRepeating) return;

            // Step 3: 2-second pause, then repeat
            _repeatTimer = setTimeout(() => {
              playCycle(en, ko);
            }, 2000);
          },
        });
      }, 1000);
    },
  });
}

/** Stop the repeating cycle */
export function stopRepeating(): void {
  _isRepeating = false;
  if (_repeatTimer) {
    clearTimeout(_repeatTimer);
    _repeatTimer = null;
  }
  Speech.stop();
}
