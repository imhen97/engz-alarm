import * as Speech from 'expo-speech';

const TTS_OPTIONS: Speech.SpeechOptions = {
  language: 'en-US',
  rate: 0.9,
  pitch: 1.0,
};

export function speak(text: string, onDone?: () => void): void {
  Speech.speak(text, {
    ...TTS_OPTIONS,
    onDone,
  });
}

export function stopSpeaking(): void {
  Speech.stop();
}

export function isSpeaking(): Promise<boolean> {
  return Speech.isSpeakingAsync();
}
