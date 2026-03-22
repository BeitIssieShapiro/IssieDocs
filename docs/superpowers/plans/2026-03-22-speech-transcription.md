# Speech Transcription Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a speech-to-text mic button above the iOS keyboard when editing canvas text elements or table cells, using Apple's SFSpeechRecognizer for real-time on-device transcription.

**Architecture:** Native Swift module (`SpeechTranscription`) handles speech recognition, AVAudioSession, permissions, silence timeout, and sounds. JS side uses React Native's `<InputAccessoryView>` for the toolbar UI with a Reanimated-animated mic button. Text insertion uses a `partialRange` tracking algorithm in `text-element.tsx`.

**Tech Stack:** Swift (SFSpeechRecognizer, AVAudioEngine, AVAudioSession), React Native 0.83 (New Architecture/Fabric), Reanimated 3, ObjC bridge interop.

**Important:** Do NOT run git commands, Xcode builds, or pod install. The user handles all build operations.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `ios/SpeechTranscription.swift` | Create | Native module: speech recognition engine, AVAudioSession, permissions, silence timer, sounds |
| `ios/SpeechTranscription.m` | Create | ObjC bridge for the Swift module |
| `src/transcription-toolbar.tsx` | Create | `<InputAccessoryView>` toolbar with animated mic button |
| `src/use-transcription.ts` | Create | Hook: listens to native events, manages partial text state, exposes `{ isRecording, attachToTextInput }` |
| `src/canvas/text-element.tsx` | Modify | Add `inputAccessoryViewID`, wire transcription hook, integrate partial text insertion |
| `ios/Podfile` | Modify | Uncomment `'SpeechRecognition'` permission |
| `ios/IssieDocs/Info.plist` | Modify | Add `NSSpeechRecognitionUsageDescription` |

---

### Task 1: iOS Configuration — Podfile & Info.plist

**Files:**
- Modify: `ios/Podfile:38`
- Modify: `ios/IssieDocs/Info.plist:84-85`

- [ ] **Step 1: Enable SpeechRecognition permission in Podfile**

In `ios/Podfile`, change line 38 from:
```ruby
  # 'SpeechRecognition',
```
to:
```ruby
   'SpeechRecognition',
```

- [ ] **Step 2: Add speech recognition usage description to Info.plist**

In `ios/IssieDocs/Info.plist`, add the following after the `NSPhotoLibraryUsageDescription` entry (after line 84):
```xml
	<key>NSSpeechRecognitionUsageDescription</key>
	<string>Allow IssieDocs to convert speech to text when editing worksheets</string>
```

---

### Task 2: Native Module — ObjC Bridge

**Files:**
- Create: `ios/SpeechTranscription.m`

- [ ] **Step 1: Create the ObjC bridge file**

Create `ios/SpeechTranscription.m` following the exact pattern of `ios/KeyboardLanguage.m`:

```objc
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(SpeechTranscription, RCTEventEmitter)

RCT_EXTERN_METHOD(startTranscription:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(stopTranscription)
RCT_EXTERN_METHOD(setLanguage:(NSString *)lang)

@end
```

---

### Task 3: Native Module — SpeechTranscription.swift

**Files:**
- Create: `ios/SpeechTranscription.swift`

This is the largest task. The module follows the same `RCTEventEmitter` pattern as `ios/keyboardLanguage.swift`.

- [ ] **Step 1: Create the Swift file with class skeleton and RCT boilerplate**

Create `ios/SpeechTranscription.swift`:

```swift
import Foundation
import Speech
import AVFoundation
import AudioToolbox
import React

@objc(SpeechTranscription)
class SpeechTranscription: RCTEventEmitter {

  private var hasListeners = false
  private var audioEngine = AVAudioEngine()
  private var speechRecognizer: SFSpeechRecognizer?
  private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
  private var recognitionTask: SFSpeechRecognitionTask?
  private var silenceTimer: Timer?
  private var isRecording = false

  private let SILENCE_TIMEOUT: TimeInterval = 10.0

  override init() {
    super.init()
    speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en"))
  }

  // MARK: - React Native Boilerplate

  override func startObserving() { hasListeners = true }
  override func stopObserving() { hasListeners = false }

  override func supportedEvents() -> [String]! {
    return ["onTranscription", "onTranscriptionEnd", "onTranscriptionError"]
  }

  @objc override static func requiresMainQueueSetup() -> Bool { return true }
}
```

- [ ] **Step 2: Add `setLanguage` method**

Add below the `init()`:

```swift
  // MARK: - Public Methods

  @objc
  func setLanguage(_ lang: String) {
    let locale: Locale
    switch lang {
    case "he": locale = Locale(identifier: "he-IL")
    case "ar": locale = Locale(identifier: "ar-SA")
    default:   locale = Locale(identifier: "en-US")
    }

    if let recognizer = SFSpeechRecognizer(locale: locale) {
      speechRecognizer = recognizer
    }
    // If locale is unsupported, keep the previous recognizer
  }
```

- [ ] **Step 3: Add permission handling**

Add a private helper method:

```swift
  // MARK: - Permissions

  private func requestPermissions(completion: @escaping (Bool, String?) -> Void) {
    SFSpeechRecognizer.requestAuthorization { authStatus in
      switch authStatus {
      case .authorized:
        AVAudioSession.sharedInstance().requestRecordPermission { allowed in
          if allowed {
            completion(true, nil)
          } else {
            completion(false, "Microphone permission denied")
          }
        }
      case .denied:
        completion(false, "Speech recognition permission denied. Please enable it in Settings.")
      case .restricted:
        completion(false, "Speech recognition is restricted on this device")
      case .notDetermined:
        completion(false, "Speech recognition permission not determined")
      @unknown default:
        completion(false, "Unknown speech recognition authorization status")
      }
    }
  }
```

- [ ] **Step 4: Add `startTranscription` method**

```swift
  @objc
  func startTranscription(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    if isRecording {
      resolve(nil)
      return
    }

    requestPermissions { [weak self] granted, errorMessage in
      guard let self = self else { return }

      if !granted {
        DispatchQueue.main.async {
          if self.hasListeners {
            self.sendEvent(withName: "onTranscriptionError", body: ["message": errorMessage ?? "Permission denied"])
          }
        }
        reject("PERMISSION_DENIED", errorMessage, nil)
        return
      }

      DispatchQueue.main.async {
        self.startRecognition(resolve: resolve, reject: reject)
      }
    }
  }

  private func startRecognition(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    guard let speechRecognizer = speechRecognizer, speechRecognizer.isAvailable else {
      if hasListeners {
        sendEvent(withName: "onTranscriptionError", body: ["message": "Speech recognizer not available"])
      }
      reject("NOT_AVAILABLE", "Speech recognizer not available", nil)
      return
    }

    // Check if another audio session is active (e.g., nitro-sound recording/playback)
    let audioSession = AVAudioSession.sharedInstance()
    if audioSession.isOtherAudioPlaying {
      if hasListeners {
        sendEvent(withName: "onTranscriptionError", body: ["message": "Another audio session is active"])
      }
      reject("AUDIO_CONFLICT", "Another audio session is active", nil)
      return
    }

    // Stop any existing session
    stopRecognitionInternal()

    // Configure audio session
    let audioSession = AVAudioSession.sharedInstance()
    do {
      try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
      try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
    } catch {
      if hasListeners {
        sendEvent(withName: "onTranscriptionError", body: ["message": "Audio session error: \(error.localizedDescription)"])
      }
      reject("AUDIO_SESSION_ERROR", error.localizedDescription, error)
      return
    }

    recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
    guard let recognitionRequest = recognitionRequest else {
      reject("REQUEST_ERROR", "Could not create recognition request", nil)
      return
    }

    recognitionRequest.shouldReportPartialResults = true
    // Privacy: children's app — always require on-device recognition (iOS 16+)
    recognitionRequest.requiresOnDeviceRecognition = true

    recognitionTask = speechRecognizer.recognitionTask(with: recognitionRequest) { [weak self] result, error in
      guard let self = self else { return }

      if let result = result {
        let text = result.bestTranscription.formattedString
        let isFinal = result.isFinal

        // Reset silence timer on each result
        self.resetSilenceTimer()

        if self.hasListeners {
          self.sendEvent(withName: "onTranscription", body: [
            "text": text,
            "isFinal": isFinal
          ])
        }

        if isFinal {
          self.stopRecognitionInternal()
          self.playEndSound()
          if self.hasListeners {
            self.sendEvent(withName: "onTranscriptionEnd", body: [:])
          }
        }
      }

      if let error = error {
        // Don't emit error if we intentionally cancelled
        if self.isRecording {
          if self.hasListeners {
            self.sendEvent(withName: "onTranscriptionError", body: ["message": error.localizedDescription])
          }
          self.stopRecognitionInternal()
          if self.hasListeners {
            self.sendEvent(withName: "onTranscriptionEnd", body: [:])
          }
        }
      }
    }

    // Install audio tap
    let inputNode = audioEngine.inputNode
    let recordingFormat = inputNode.outputFormat(forBus: 0)
    inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { [weak self] buffer, _ in
      self?.recognitionRequest?.append(buffer)
    }

    do {
      audioEngine.prepare()
      try audioEngine.start()
      isRecording = true
      playStartSound()
      startSilenceTimer()
      resolve(nil)
    } catch {
      if hasListeners {
        sendEvent(withName: "onTranscriptionError", body: ["message": "Audio engine error: \(error.localizedDescription)"])
      }
      reject("ENGINE_ERROR", error.localizedDescription, error)
    }
  }
```

- [ ] **Step 5: Add `stopTranscription` and internal stop**

```swift
  @objc
  func stopTranscription() {
    guard isRecording else { return }
    stopRecognitionInternal()
    playEndSound()
    if hasListeners {
      sendEvent(withName: "onTranscriptionEnd", body: [:])
    }
  }

  private func stopRecognitionInternal() {
    silenceTimer?.invalidate()
    silenceTimer = nil

    if audioEngine.isRunning {
      audioEngine.stop()
      audioEngine.inputNode.removeTap(onBus: 0)
    }

    recognitionRequest?.endAudio()
    recognitionRequest = nil

    recognitionTask?.cancel()
    recognitionTask = nil

    isRecording = false

    // Restore audio session
    try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
  }
```

- [ ] **Step 6: Add silence timer and sounds**

```swift
  // MARK: - Silence Timer

  private func startSilenceTimer() {
    silenceTimer?.invalidate()
    silenceTimer = Timer.scheduledTimer(withTimeInterval: SILENCE_TIMEOUT, repeats: false) { [weak self] _ in
      guard let self = self, self.isRecording else { return }
      self.stopRecognitionInternal()
      self.playEndSound()
      if self.hasListeners {
        self.sendEvent(withName: "onTranscriptionEnd", body: [:])
      }
    }
  }

  private func resetSilenceTimer() {
    if isRecording {
      startSilenceTimer()
    }
  }

  // MARK: - Sounds

  private func playStartSound() {
    AudioServicesPlaySystemSound(1110)
  }

  private func playEndSound() {
    AudioServicesPlaySystemSound(1111)
  }
```

---

### Task 4: JS Hook — `use-transcription.ts`

**Files:**
- Create: `src/use-transcription.ts`

- [ ] **Step 1: Create the transcription hook**

Create `src/use-transcription.ts`:

```typescript
import { useEffect, useRef, useState, useCallback } from 'react';
import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { SpeechTranscription } = NativeModules;

const emitter = Platform.OS === 'ios' && SpeechTranscription
  ? new NativeEventEmitter(SpeechTranscription)
  : null;

interface PartialRange {
  start: number;
  length: number;
}

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
  const partialRangeRef = useRef<PartialRange | null>(null);
  const textRef = useRef(text);
  const selectionEndRef = useRef(selectionEnd);

  // Keep refs in sync
  useEffect(() => {
    textRef.current = text;

    // Detect manual typing during dictation: if user typed and the text changed
    // outside our partial range, commit the current partial as-is
    const partial = partialRangeRef.current;
    if (partial && isRecording) {
      const expectedLen = partial.start + partial.length;
      if (text.length !== textRef.current.length && selectionEndRef.current > expectedLen) {
        partialRangeRef.current = null;
      }
    }
  }, [text]);
  useEffect(() => { selectionEndRef.current = selectionEnd; }, [selectionEnd]);

  // Set language when it changes
  useEffect(() => {
    if (Platform.OS !== 'ios' || !SpeechTranscription || !enabled) return;
    SpeechTranscription.setLanguage(language);
  }, [language, enabled]);

  // Listen for transcription events
  useEffect(() => {
    if (Platform.OS !== 'ios' || !emitter || !enabled) return;

    const transcriptionSub = emitter.addListener('onTranscription', (event: { text: string; isFinal: boolean }) => {
      const currentText = textRef.current;
      const partial = partialRangeRef.current;
      let newText: string;

      if (partial) {
        // Replace previous partial
        const before = currentText.substring(0, partial.start);
        const after = currentText.substring(partial.start + partial.length);
        newText = before + event.text + after;
      } else {
        // First partial — insert at cursor
        const insertPos = selectionEndRef.current;
        const before = currentText.substring(0, insertPos);
        const after = currentText.substring(insertPos);
        newText = before + event.text + after;
        partialRangeRef.current = { start: insertPos, length: event.text.length };
      }

      if (partialRangeRef.current) {
        partialRangeRef.current.length = event.text.length;
      }

      if (event.isFinal) {
        partialRangeRef.current = null;
      }

      textRef.current = newText;
      onTextChanged(newText);
    });

    const endSub = emitter.addListener('onTranscriptionEnd', () => {
      setIsRecording(false);
      partialRangeRef.current = null;
    });

    const errorSub = emitter.addListener('onTranscriptionError', (event: { message: string }) => {
      console.warn('Transcription error:', event.message);
      setIsRecording(false);
      partialRangeRef.current = null;
    });

    return () => {
      transcriptionSub.remove();
      endSub.remove();
      errorSub.remove();
    };
  }, [enabled, onTextChanged]);

  // Stop transcription on unmount (cleanup orphaned sessions)
  useEffect(() => {
    if (Platform.OS !== 'ios' || !SpeechTranscription || !enabled) return;
    return () => {
      SpeechTranscription.stopTranscription();
    };
  }, [enabled]);

  const toggleRecording = useCallback(async () => {
    if (Platform.OS !== 'ios' || !SpeechTranscription) return;

    if (isRecording) {
      SpeechTranscription.stopTranscription();
      setIsRecording(false);
    } else {
      try {
        await SpeechTranscription.startTranscription();
        setIsRecording(true);
      } catch (e) {
        console.warn('Failed to start transcription:', e);
        setIsRecording(false);
      }
    }
  }, [isRecording]);

  return { isRecording, toggleRecording };
}
```

---

### Task 5: JS Component — `transcription-toolbar.tsx`

**Files:**
- Create: `src/transcription-toolbar.tsx`

- [ ] **Step 1: Create the InputAccessoryView toolbar component**

Create `src/transcription-toolbar.tsx`:

```tsx
import React from 'react';
import {
  InputAccessoryView,
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  AccessibilityInfo,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  cancelAnimation,
} from 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { MyIcon } from './common/icons';

export const TRANSCRIPTION_TOOLBAR_ID = 'transcription-toolbar';

interface TranscriptionToolbarProps {
  isRecording: boolean;
  onToggle: () => void;
}

export function TranscriptionToolbar({ isRecording, onToggle }: TranscriptionToolbarProps) {
  if (Platform.OS !== 'ios') return null;

  const opacity = useSharedValue(1);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => listener.remove();
  }, []);

  useEffect(() => {
    if (isRecording && !reduceMotion) {
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 1000 }),
          withTiming(1, { duration: 1000 }),
        ),
        -1, // infinite
        false,
      );
    } else {
      cancelAnimation(opacity);
      opacity.value = 1;
    }
  }, [isRecording, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <InputAccessoryView nativeID={TRANSCRIPTION_TOOLBAR_ID}>
      <View style={styles.toolbar}>
        <TouchableOpacity
          onPress={onToggle}
          style={styles.button}
          accessibilityLabel="Dictation"
          accessibilityHint="Double tap to start dictation"
          accessibilityRole="button"
          accessibilityState={{ selected: isRecording }}
        >
          <Animated.View style={animatedStyle}>
            <MyIcon
              info={{
                type: 'Ionicons',
                name: 'mic',
                size: 28,
                color: isRecording ? '#FF3B30' : '#007AFF',
              }}
            />
          </Animated.View>
        </TouchableOpacity>
      </View>
    </InputAccessoryView>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    backgroundColor: '#D1D5DB',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#B0B0B0',
  },
  button: {
    padding: 4,
  },
});
```

---

### Task 6: Integrate into `text-element.tsx`

**Files:**
- Modify: `src/canvas/text-element.tsx`

- [ ] **Step 1: Add imports**

At the top of `src/canvas/text-element.tsx`, add new imports after line 7:

```typescript
import { Platform } from "react-native";
import { TRANSCRIPTION_TOOLBAR_ID, TranscriptionToolbar } from "../transcription-toolbar";
import { useTranscription } from "../use-transcription";
```

Note: `Platform` needs to be added to the existing `react-native` import on line 3 instead. Change line 3 from:
```typescript
import { View, Text, TextInput, StyleSheet, LayoutChangeEvent, TextInputProps, ViewProps, ColorValue } from "react-native";
```
to:
```typescript
import { View, Text, TextInput, StyleSheet, LayoutChangeEvent, TextInputProps, ViewProps, ColorValue, Platform } from "react-native";
```

Then add after line 7:
```typescript
import { TRANSCRIPTION_TOOLBAR_ID, TranscriptionToolbar } from "../transcription-toolbar";
import { useTranscription } from "../use-transcription";
```

- [ ] **Step 2: Add `language` prop to TextElementProps**

In the `TextElementProps` interface (around line 13), add a new prop:

```typescript
    language?: string;
```

Add it after `canvasHeight: number;` (line 25), and add `language` to the destructured props (after `handleCursorPositionChange` around line 40):

```typescript
    language
```

- [ ] **Step 3: Wire the transcription hook inside the component**

After the existing `useEffect` blocks (after line 79), add:

```typescript
    const handleTranscriptionText = useCallback((newText: string) => {
        onTextChanged(text.id, newText);
    }, [text.id, onTextChanged]);

    const { isRecording, toggleRecording } = useTranscription({
        text: text.text,
        selectionEnd: selection.end,
        onTextChanged: handleTranscriptionText,
        language: language || 'en',
        enabled: editMode,
    });
```

This also requires importing `useCallback` — update line 2 from:
```typescript
import React, { forwardRef, useEffect, useImperativeHandle, useState } from "react";
```
to:
```typescript
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
```

- [ ] **Step 4: Add `inputAccessoryViewID` to the AnimatedTextInput**

On the `AnimatedTextInput` (line 138), add the `inputAccessoryViewID` prop. Change the opening tag to include:

```typescript
                    <AnimatedTextInput
                        autoCapitalize="none"
                        autoCorrect={false}
                        allowFontScaling={false}
                        multiline
                        autoFocus
                        textAlignVertical="top"
                        {...(Platform.OS === 'ios' ? { inputAccessoryViewID: TRANSCRIPTION_TOOLBAR_ID } : {})}
                        style={[styles.textStyle, style, bgAnimatedStyle,
```

- [ ] **Step 5: Render the TranscriptionToolbar**

At the end of the `editMode` return block, just before the closing `</Animated.View>` (line 181), add the toolbar:

Change:
```typescript
                </>
            </Animated.View>
        );
```
to:
```typescript
                </>
                <TranscriptionToolbar isRecording={isRecording} onToggle={toggleRecording} />
            </Animated.View>
        );
```

---

### Task 7: Pass language from Canvas to TextElement

**Files:**
- Modify: `src/canvas/canvas.tsx:98-142` (CanvasProps interface)
- Modify: `src/canvas/canvas.tsx:847-866` (TextElement rendering)

- [ ] **Step 1: Add `language` prop to CanvasProps**

In `src/canvas/canvas.tsx`, add to the `CanvasProps` interface (after `currentElementType: ElementTypes;` on line 139):

```typescript
    language?: string;
```

And add `language` to the destructured props in the Canvas function (after `currentElementType,` around line 194):

```typescript
    language,
```

- [ ] **Step 2: Pass `language` to TextElement**

In the TextElement rendering section (around line 850-865), add the `language` prop:

Change:
```typescript
                    return <TextElement
                        ref={editMode ? editTextRef : undefined}
                        key={text.id}
                        text={text}
                        editMode={editMode}
                        texts={texts}
                        tables={tables}
                        actualWidth={canvasWidth}
                        ratio={ratio}
                        moveResponder={moveResponder}
                        moveContext={moveContext}
                        onTextChanged={onTextChanged}
                        handleTextLayout={handleTextLayout}
                        handleCursorPositionChange={handleCursorPositionChange}
                        canvasHeight={canvasHeight / ratio}
                    />
```

to:

```typescript
                    return <TextElement
                        ref={editMode ? editTextRef : undefined}
                        key={text.id}
                        text={text}
                        editMode={editMode}
                        texts={texts}
                        tables={tables}
                        actualWidth={canvasWidth}
                        ratio={ratio}
                        moveResponder={moveResponder}
                        moveContext={moveContext}
                        onTextChanged={onTextChanged}
                        handleTextLayout={handleTextLayout}
                        handleCursorPositionChange={handleCursorPositionChange}
                        canvasHeight={canvasHeight / ratio}
                        language={language}
                    />
```

---

### Task 8: Pass language from IssieEditPhoto2 to Canvas

**Files:**
- Modify: `src/IssieEditPhoto2.tsx:32` (import)
- Modify: `src/IssieEditPhoto2.tsx:48-69` (hook near other state declarations)
- Modify: `src/IssieEditPhoto2.tsx:2496-2540` (Canvas props)

- [ ] **Step 1: Add `useKeyboardLanguage` to the existing `./lang` import**

In `src/IssieEditPhoto2.tsx`, change line 32 from:
```typescript
import { fTranslate, isRTL, translate } from './lang';
```
to:
```typescript
import { fTranslate, isRTL, translate, useKeyboardLanguage } from './lang';
```

- [ ] **Step 2: Add the hook call near other state declarations**

Inside the `IssieEditPhoto2` component (after the state declarations around line 69), add:
```typescript
const kbLanguage = useKeyboardLanguage();
```

- [ ] **Step 3: Pass `language` prop to the Canvas component**

In the `<Canvas>` block (lines 2496-2540), add the `language` prop. After `currentElementType={mode2ElementType(mode)}` (line 2539), add:
```typescript
                language={kbLanguage}
```

---

### Task 9: Manual Testing Checklist

This task has no code changes — it documents what to verify after building.

- [ ] **Step 1: Verify build succeeds**

After running `pod install` in the `ios/` folder and building in Xcode, verify the app compiles without errors.

- [ ] **Step 2: Test basic transcription flow**

1. Open a worksheet and tap on a text element to enter edit mode
2. Verify the mic button appears above the keyboard
3. Tap the mic button — verify start sound plays and button blinks red
4. Speak a word — verify text appears at cursor in real-time
5. Tap the mic button again — verify stop sound plays and button returns to blue

- [ ] **Step 3: Test silence timeout**

1. Start transcription by tapping mic
2. Speak a word, then stay silent
3. After ~10 seconds, verify transcription auto-stops (end sound, button returns to blue)

- [ ] **Step 4: Test table cell transcription**

1. Create a table and tap a cell to edit
2. Verify mic button appears above keyboard
3. Dictate text — verify it inserts into the cell

- [ ] **Step 5: Test language switching**

1. Start editing text with Hebrew keyboard — speak Hebrew
2. Switch to English keyboard — speak English
3. Verify transcription language changes accordingly

- [ ] **Step 6: Test permission flow**

1. On first use, verify speech recognition permission dialog appears
2. If denied, verify error is logged (no crash)

- [ ] **Step 7: Test cleanup on blur**

1. Start transcription (mic blinking)
2. Tap outside the text to dismiss keyboard
3. Verify transcription stops cleanly (no orphaned session)
