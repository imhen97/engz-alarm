import * as Speech from 'expo-speech';
import type { Voice } from 'expo-speech';
import { VoiceQuality } from 'expo-speech';

// 더 자연스러운 말투: 조금 느린 속도, 기본 피치
const NATURAL_RATE = 0.88;
const NATURAL_PITCH = 1.0;

let preferredEnVoiceId: string | null = null;
let preferredKoVoiceId: string | null = null;
let voicesInitialized = false;

function pickBestVoice(voices: Voice[], lang: string): string | null {
  const langLower = lang.toLowerCase();
  const forLang = voices.filter(
    (v) => v.language?.toLowerCase().startsWith(langLower.split('-')[0])
  );
  const enhanced = forLang.find((v) => v.quality === VoiceQuality.Enhanced);
  if (enhanced) return enhanced.identifier;
  const exact = forLang.find((v) => v.language?.toLowerCase() === langLower);
  if (exact) return exact.identifier;
  return forLang[0]?.identifier ?? null;
}

/**
 * 기기에서 사용 가능한 음성 중 Enhanced(고품질) 또는 해당 언어 기본 음성을 선택해 캐시합니다.
 * 앱 초기화 시 한 번 호출하면 이후 TTS가 더 자연스러운 목소리를 사용합니다.
 */
export async function initPreferredVoices(): Promise<void> {
  if (voicesInitialized) return;
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    if (voices?.length) {
      preferredEnVoiceId = pickBestVoice(voices, 'en-US');
      preferredKoVoiceId = pickBestVoice(voices, 'ko-KR');
    }
  } catch {
    // getAvailableVoicesAsync 미지원 환경 등
  }
  voicesInitialized = true;
}

function getEnOptions(callback?: { onDone?: () => void }): Speech.SpeechOptions {
  return {
    language: 'en-US',
    rate: NATURAL_RATE,
    pitch: NATURAL_PITCH,
    ...(preferredEnVoiceId && { voice: preferredEnVoiceId }),
    ...callback,
  };
}

function getKoOptions(callback?: { onDone?: () => void }): Speech.SpeechOptions {
  return {
    language: 'ko-KR',
    rate: NATURAL_RATE,
    pitch: NATURAL_PITCH,
    ...(preferredKoVoiceId && { voice: preferredKoVoiceId }),
    ...callback,
  };
}

/** 영어 문장 읽기 (자연스러운 속도·음성) */
export function speak(text: string, onDone?: () => void): void {
  Speech.speak(text, getEnOptions({ onDone }));
}

/** 한국어 문장 읽기 */
export function speakKorean(text: string, onDone?: () => void): void {
  Speech.speak(text, getKoOptions({ onDone }));
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
    ...getEnOptions(),
    onDone: () => {
      if (!_isRepeating) return;

      // Step 2: 1-second pause, then speak Korean
      _repeatTimer = setTimeout(() => {
        if (!_isRepeating) return;

        Speech.speak(ko, {
          ...getKoOptions(),
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
