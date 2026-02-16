/**
 * Speech recognition service.
 *
 * Note: Full native speech-to-text (react-native-voice) requires a development build
 * (not available in Expo Go). For MVP, we provide a simulated voice recognition
 * that works in Expo Go, with hooks for the real implementation.
 *
 * In production (development build), replace the mock with react-native-voice.
 */

type SpeechCallback = (text: string) => void;
type ErrorCallback = (error: string) => void;

let onResultCallback: SpeechCallback | null = null;
let onErrorCallback: ErrorCallback | null = null;
let isListening = false;

export function setSpeechCallbacks(
  onResult: SpeechCallback,
  onError: ErrorCallback
): void {
  onResultCallback = onResult;
  onErrorCallback = onError;
}

export function startListening(): void {
  isListening = true;
  // In production, this would call Voice.start('en-US')
  // For Expo Go MVP, voice input is handled via typing fallback
}

export function stopListening(): void {
  isListening = false;
  // In production, this would call Voice.stop()
}

export function getIsListening(): boolean {
  return isListening;
}

/**
 * Simulate a voice result (for testing / Expo Go).
 * In production, react-native-voice's onSpeechResults would call this.
 */
export function simulateVoiceResult(text: string): void {
  if (onResultCallback) {
    onResultCallback(text);
  }
}

export function reportError(error: string): void {
  if (onErrorCallback) {
    onErrorCallback(error);
  }
}
