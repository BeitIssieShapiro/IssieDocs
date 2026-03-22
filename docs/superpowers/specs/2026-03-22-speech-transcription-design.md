# Speech Transcription Button — Design Spec

## Overview

Add a speech-to-text button above the iOS keyboard that appears when editing text elements or table cells on the canvas. Uses Apple's `SFSpeechRecognizer` for real-time on-device transcription. iOS only.

## Target Audience

Children with disabilities — UX decisions (10s silence timeout, toggle vs hold, audio cues) reflect this.

## Architecture: Hybrid — Native Speech Engine + JS Toolbar

Speech recognition logic lives in a Swift native module. The toolbar UI uses React Native's `<InputAccessoryView>` component (Fabric-safe). This avoids fragile runtime `inputAccessoryView` assignment on Fabric-backed TextInputs.

## Native Module: `SpeechTranscription`

### Files

- `ios/SpeechTranscription.swift` — main module
- `ios/SpeechTranscription.m` — ObjC bridge (`RCT_EXTERN_MODULE`)

### Responsibilities

- Manages `SFSpeechRecognizer`, `SFSpeechAudioBufferRecognitionRequest`, `AVAudioEngine`
- Handles speech recognition start/stop lifecycle
- Manages `AVAudioSession` configuration, coordinating with existing `react-native-nitro-sound` usage
- Plays system sounds on start/stop
- Uses on-device recognition (`requiresOnDeviceRecognition = true`) for privacy (children's app, iOS 16+)
- Emits events to JS with transcription results

### Methods (exposed to JS)

| Method | Description |
|--------|-------------|
| `startTranscription()` | Requests permissions if needed, configures AVAudioSession, starts SFSpeechRecognizer + AVAudioEngine |
| `stopTranscription()` | Stops recognition, restores AVAudioSession, plays end sound |
| `setLanguage(lang: String)` | Sets `SFSpeechRecognizer` locale (he/ar/en) |

### Events (emitted to JS)

| Event | Payload | Description |
|-------|---------|-------------|
| `onTranscription` | `{ text: string, isFinal: boolean }` | Real-time partial and final results |
| `onTranscriptionEnd` | `{}` | Recognition stopped (manual, silence timeout, or system limit) |
| `onTranscriptionError` | `{ message: string }` | Permission denied, unsupported language, etc. |

### AVAudioSession Coordination

- Before starting: check if `nitro-sound` is actively recording/playing. If so, emit `onTranscriptionError` — don't fight over the audio session.
- On start: configure `AVAudioSession` category `.record` with mode `.measurement`
- On stop: deactivate recording session with `.notifyOthersOnDeactivation` so `nitro-sound` can resume cleanly
- If the recognition task is interrupted by the system (e.g., phone call), handle gracefully via the `SFSpeechRecognitionTask` delegate

### Silence Handling

- After the last partial result, start/restart a 10-second timer
- If no new speech in 10 seconds, auto-stop recognition
- Timer resets on each new partial result
- On auto-stop: play end sound, emit `onTranscriptionEnd`

### Permission Handling

- On first `startTranscription()`: request `SFSpeechRecognizer.requestAuthorization()` and check `AVAudioSession.recordPermission`
- Microphone permission already granted (app uses it for audio recording)
- If speech recognition denied: emit `onTranscriptionError`, JS shows alert directing to Settings
- If `SFSpeechRecognizer(locale:)` returns nil: fall back to device default locale
- If `isAvailable` is false (no network for server recognition, on-device not available): emit error

### 1-Minute System Limit

- Apple imposes ~60s max per recognition task
- If the system terminates the task, treat it like a silence timeout: emit final result + `onTranscriptionEnd`
- The user can tap the button again to start a new session

## JS Integration: `<InputAccessoryView>` Toolbar

### Toolbar Component

- Use React Native's `<InputAccessoryView nativeID="transcription-toolbar">` component
- Renders a small toolbar bar with a single mic button
- The `TextInput` in `text-element.tsx` gets `inputAccessoryViewID="transcription-toolbar"` (iOS only)

### Mic Button (JS component)

- **Idle state:** mic icon in system blue
- **Recording state:** mic icon turns red, slow blink animation (Reanimated `withRepeat`/`withTiming`, 1s cycle)
- **Accessibility:** `accessibilityLabel="Dictation"`, `accessibilityHint="Double tap to start dictation"`, reduce blink when `AccessibilityInfo.isReduceMotionEnabled`
- **Toggle:** tap calls `SpeechTranscription.startTranscription()` or `stopTranscription()`
- **Start/stop sounds** are played by the native module

### Integration in `text-element.tsx`

- Add `inputAccessoryViewID="transcription-toolbar"` to the `AnimatedTextInput` (line 138), wrapped in `Platform.OS === 'ios'` check
- Listen for `onTranscription` events via a `useEffect` that sets up a `NativeEventEmitter` listener when `editMode` is `true`
- On `editMode` going `false` (component unmounts the TextInput): cleanup calls `SpeechTranscription.stopTranscription()` to prevent orphaned sessions
- Call `SpeechTranscription.setLanguage(currentLang)` when `editMode` becomes `true` and when keyboard language changes

### Partial Text Insertion Algorithm

Track a `partialRange: { start: number, length: number } | null` in the component:

1. **First partial** (`isFinal: false`, `partialRange` is null):
   - Record `insertPos = selection.end`
   - Insert `text` at `insertPos`
   - Set `partialRange = { start: insertPos, length: text.length }`
   - Call `onTextChanged(id, newFullText)`

2. **Subsequent partials** (`isFinal: false`, `partialRange` is set):
   - Replace characters from `partialRange.start` to `partialRange.start + partialRange.length` with new `text`
   - Update `partialRange.length = text.length`
   - Call `onTextChanged(id, newFullText)`

3. **Final result** (`isFinal: true`):
   - Same replace as step 2 (with the final text)
   - Set `partialRange = null` (ready for next utterance)
   - Update selection to end of inserted text

If user types manually during dictation (detected by selection changing outside the partial range), commit the current partial as-is and reset `partialRange`.

### Language Sync

- The existing `useKeyboardLanguage()` hook tracks keyboard language (he/ar/en)
- Pass language to `TextElement` as a prop from `canvas.tsx`
- Call `SpeechTranscription.setLanguage()` when language changes via `useEffect`

### Android

- `inputAccessoryViewID` prop is iOS-only (ignored on Android)
- `SpeechTranscription` native module calls wrapped in `Platform.OS === 'ios'` checks
- The `<InputAccessoryView>` component only renders on iOS

## Configuration Changes

### Podfile

Uncomment `SpeechRecognition` in `setup_permissions`:
```ruby
'SpeechRecognition',
```

### Info.plist

Add:
```xml
<key>NSSpeechRecognitionUsageDescription</key>
<string>Allow IssieDocs to convert speech to text when editing worksheets</string>
```
