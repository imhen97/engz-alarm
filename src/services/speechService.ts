/**
 * Speech recognition service using expo-speech-recognition.
 * Listens for English speech and returns recognized text.
 */
import {
  ExpoSpeechRecognitionModule,
  type ExpoSpeechRecognitionNativeEventMap,
} from 'expo-speech-recognition';

type ResultCallback = (text: string) => void;
type ErrorCallback = (error: string) => void;

let _onResult: ResultCallback | null = null;
let _onError: ErrorCallback | null = null;
let _isListening = false;

/** Request microphone + speech recognition permissions */
export async function requestSpeechPermissions(): Promise<boolean> {
  const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
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
  if (_isListening) return;

  const granted = await requestSpeechPermissions();
  if (!granted) {
    _onError?.('Microphone permission denied');
    return;
  }

  _isListening = true;

  // Register event listeners
  const resultSub = ExpoSpeechRecognitionModule.addListener(
    'result',
    (event: ExpoSpeechRecognitionNativeEventMap['result']) => {
      if (event.isFinal && event.results && event.results.length > 0) {
        const transcript = event.results[0]?.transcript ?? '';
        if (transcript) {
          _onResult?.(transcript);
        }
        cleanup();
      }
    },
  );

  const errorSub = ExpoSpeechRecognitionModule.addListener(
    'error',
    (event: ExpoSpeechRecognitionNativeEventMap['error']) => {
      _onError?.(event.error ?? 'Speech recognition error');
      cleanup();
    },
  );

  const endSub = ExpoSpeechRecognitionModule.addListener('end', () => {
    cleanup();
  });

  function cleanup() {
    _isListening = false;
    resultSub.remove();
    errorSub.remove();
    endSub.remove();
  }

  // Start recognition
  ExpoSpeechRecognitionModule.start({
    lang: 'en-US',
    interimResults: false,
    maxAlternatives: 1,
  });
}

/** Stop listening */
export function stopListening(): void {
  if (_isListening) {
    ExpoSpeechRecognitionModule.stop();
    _isListening = false;
  }
}

/** Check if currently listening */
export function getIsListening(): boolean {
  return _isListening;
}
