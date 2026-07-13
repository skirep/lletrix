import { useState, useCallback, useRef } from 'react';
import { WebSpeechEngine } from '../speech';
import type { SpeechEngine } from '../speech';

export function useSpeechRecognition(engine?: SpeechEngine) {
  const engineRef = useRef<SpeechEngine>(engine ?? new WebSpeechEngine());
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported] = useState(() => engineRef.current.isSupported());

  const start = useCallback(() => {
    setTranscript('');
    setError(null);
    setIsListening(true);
    const e = engineRef.current;
    e.onResult = (result) => {
      setTranscript(result.transcript);
      if (result.isFinal) {
        setIsListening(false);
      }
    };
    e.onError = (err) => {
      setError(err);
      setIsListening(false);
    };
    e.onEnd = () => {
      setIsListening(false);
    };
    e.start({ language: 'ca-ES', continuous: false, interimResults: true });
  }, []);

  const stop = useCallback(() => {
    engineRef.current.stop();
    setIsListening(false);
  }, []);

  return { transcript, isListening, error, isSupported, start, stop, setTranscript };
}
