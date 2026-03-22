import { useEffect, useRef, useState } from 'react';
import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { SpeechTranscription } = NativeModules;

const emitter = Platform.OS === 'ios' && SpeechTranscription
  ? new NativeEventEmitter(SpeechTranscription)
  : null;

interface UseTranscriptionProps {
  text: string;
  selectionEnd: number;
  onTextChanged: (newText: string) => void;
  language: string;
  enabled: boolean;
}

export function useTranscription({
  text,
  selectionEnd,
  onTextChanged,
  language,
  enabled,
}: UseTranscriptionProps) {
  const [isRecording, setIsRecording] = useState(false);
  const textRef = useRef(text);
  const selectionEndRef = useRef(selectionEnd);
  const onTextChangedRef = useRef(onTextChanged);
  // Track what the recognizer has produced so far in this session
  const lastTranscriptRef = useRef('');
  // Track the insertion point where this session started inserting
  const sessionInsertPosRef = useRef<number | null>(null);

  // Keep refs in sync
  useEffect(() => { textRef.current = text; }, [text]);
  useEffect(() => { selectionEndRef.current = selectionEnd; }, [selectionEnd]);
  useEffect(() => { onTextChangedRef.current = onTextChanged; }, [onTextChanged]);

  // Set language when it changes
  useEffect(() => {
    if (Platform.OS !== 'ios' || !SpeechTranscription || !enabled) return;
    SpeechTranscription.setLanguage(language);
  }, [language, enabled]);

  // Attach/detach native toolbar when entering/leaving edit mode
  useEffect(() => {
    if (Platform.OS !== 'ios' || !SpeechTranscription || !enabled) return;

    const timer = setTimeout(() => {
      SpeechTranscription.attachToKeyboard();
    }, 300);

    return () => {
      clearTimeout(timer);
      SpeechTranscription.detachFromKeyboard();
    };
  }, [enabled]);

  // Listen for transcription events
  useEffect(() => {
    if (Platform.OS !== 'ios' || !emitter || !enabled) return;

    const startSub = emitter.addListener('onTranscriptionStart', () => {
      setIsRecording(true);
      sessionInsertPosRef.current = selectionEndRef.current;
      lastTranscriptRef.current = '';
    });

    const transcriptionSub = emitter.addListener('onTranscription', (event: { text: string; isFinal: boolean }) => {
      const currentText = textRef.current;
      const prevTranscript = lastTranscriptRef.current;
      let insertPos = sessionInsertPosRef.current ?? selectionEndRef.current;

      // Detect recognizer reset: if the new text doesn't start with the
      // beginning of the previous transcript, the recognizer started fresh.
      // Commit the previous text and start a new segment after it.
      if (prevTranscript.length > 0 && !event.text.startsWith(prevTranscript.substring(0, Math.min(3, prevTranscript.length)))) {
        // Commit previous: advance insert position past it
        insertPos = insertPos + prevTranscript.length;
        sessionInsertPosRef.current = insertPos;
        // Add a space separator between segments
        const sep = ' ';
        const beforeSep = currentText.substring(0, insertPos);
        const afterSep = currentText.substring(insertPos);
        const textWithSep = beforeSep + sep + afterSep;
        insertPos += sep.length;
        sessionInsertPosRef.current = insertPos;
        textRef.current = textWithSep;
        // Now insert the new text at the new position
        const before = textWithSep.substring(0, insertPos);
        const after = textWithSep.substring(insertPos);
        const newText = before + event.text + after;
        lastTranscriptRef.current = event.text;
        textRef.current = newText;
        onTextChangedRef.current(newText);
      } else {
        // Normal case: replace previous partial with updated text
        const before = currentText.substring(0, insertPos);
        const after = currentText.substring(insertPos + prevTranscript.length);
        const newText = before + event.text + after;
        lastTranscriptRef.current = event.text;
        textRef.current = newText;
        onTextChangedRef.current(newText);
      }

      if (event.isFinal) {
        selectionEndRef.current = insertPos + event.text.length;
        lastTranscriptRef.current = '';
        sessionInsertPosRef.current = null;
      }
    });

    const endSub = emitter.addListener('onTranscriptionEnd', () => {
      const insertPos = sessionInsertPosRef.current;
      const transcript = lastTranscriptRef.current;
      if (insertPos !== null && transcript.length > 0) {
        selectionEndRef.current = insertPos + transcript.length;
      }
      setIsRecording(false);
      lastTranscriptRef.current = '';
      sessionInsertPosRef.current = null;
    });

    const errorSub = emitter.addListener('onTranscriptionError', (event: { message: string }) => {
      console.warn('Transcription error:', event.message);
      setIsRecording(false);
      lastTranscriptRef.current = '';
      sessionInsertPosRef.current = null;
    });

    return () => {
      startSub.remove();
      transcriptionSub.remove();
      endSub.remove();
      errorSub.remove();
    };
  }, [enabled]);

  // Stop transcription on unmount (cleanup orphaned sessions)
  useEffect(() => {
    if (Platform.OS !== 'ios' || !SpeechTranscription || !enabled) return;
    return () => {
      SpeechTranscription.stopTranscription();
    };
  }, [enabled]);

  return { isRecording };
}
