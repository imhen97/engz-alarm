/**
 * Speech recognition service.
 * Uses expo-speech-recognition when available (Development Build),
 * gracefully falls back when unavailable (Expo Go).
 */

type ResultCallback = (text: string) => void;
type ErrorCallback = (error: string) => void;

let _onResult: ResultCallback | null = null;
let _onError: ErrorCallback | null = null;
let _isListening = false;

// Dynamically import to avoid crash in Expo Go
let SpeechModule: any = null;
let _available = false;

try {
  SpeechModule = require('expo-speech-recognition').ExpoSpeechRecognitionModule;
  _available = true;
} catch {
  _available = false;
}

/** Check if speech recognition is available on this device/build */
export function isSpeechRecognitionAvailable(): boolean {
  return _available;
}

/** Request microphone + speech recognition permissions */
export async function requestSpeechPermissions(): Promise<boolean> {
  if (!_available) return false;
  const result = await SpeechModule.requestPermissionsAsync();
  return result.granted;
}

/** Set callbacks for speech results and errors */
export function setSpeechCallbacks(
  onResult: ResultCallback,
  onError: ErrorCallback,
): void {
  _onResult = onResult;
  _onError = onError;
}

/** Start listening for speech (English) */
export async function startListening(): Promise<void> {
  if (!_available) {
    _onError?.('Speech recognition not available (requires Development Build)');
    return;
  }
  if (_isListening) return;

  const granted = await requestSpeechPermissions();
  if (!granted) {
    _onError?.('Microphone permission denied');
    return;
  }

  _isListening = true;

  const resultSub = SpeechModule.addListener(
    'result',
    (event: any) => {
      if (event.isFinal && event.results && event.results.length > 0) {
        const transcript = event.results[0]?.transcript ?? '';
        if (transcript) {
          _onResult?.(transcript);
        }
        cleanup();
      }
    },
  );

  const errorSub = SpeechModule.addListener(
    'error',
    (event: any) => {
      _onError?.(event.error ?? 'Speech recognition error');
      cleanup();
    },
  );

  const endSub = SpeechModule.addListener('end', () => {
    cleanup();
  });

  function cleanup() {
    _isListening = false;
    resultSub.remove();
    errorSub.remove();
    endSub.remove();
  }

  SpeechModule.start({
    lang: 'en-US',
    interimResults: false,
    maxAlternatives: 1,
  });
}

/** Stop listening */
export function stopListening(): void {
  if (_available && _isListening) {
    SpeechModule.stop();
    _isListening = false;
  }
}

/** Check if currently listening */
export function getIsListening(): boolean {
  return _isListening;
}
