# Speak Button & Keyboard Toolbar Settings Hierarchy

## Summary

Add a "Speak" button to the iOS keyboard toolbar that reads the current text box aloud with word-by-word highlighting. Restructure the keyboard toolbar settings into a parent/child hierarchy with two sub-groups: "Text Tools" and "Speak and Dictate".

## Settings

### New hierarchy

| Setting | Storage Key | Default | Controls |
|---|---|---|---|
| `KB_TOOLBAR` | `kbToolbar` | ON | Master toggle for the entire keyboard toolbar |
| `KB_TEXT_TOOLS` | `kbTextTools` | OFF | Bold, italic, underline, alignment, font size buttons |
| `KB_SPEAK_DICTATE` | `kbSpeakDictate` | ON | Speak (TTS) and Dictate (mic) buttons |

### Settings UI

The existing single "Keyboard Toolbar" checkbox becomes a parent with two indented child checkboxes:

```
[x] Keyboard Toolbar
    [ ] Text tools
    [x] Speak and Dictate
```

Child checkboxes are disabled/greyed when the parent is OFF.

### Files affected

- `src/settings.js` — add `KB_TEXT_TOOLS` and `KB_SPEAK_DICTATE` constants
- `src/settings-ui.js` — render hierarchical checkboxes
- `src/lang.js` — add translation keys `TextTools`, `SpeakAndDictate`

## Native iOS: Speak Button on Keyboard Toolbar

### Toolbar layout changes (`SpeechTranscription.swift`)

The `attachToKeyboard` method currently receives a single `toolbarEnabled` boolean. It will be updated to receive two flags:

- `textToolsEnabled: Bool` — controls bold/italic/underline/alignment/font-size buttons
- `speakDictateEnabled: Bool` — controls the Speak and Mic buttons

Button grouping on the toolbar:

```
[Mic] [Speak] | [Bold] [Italic] [Underline] [RTL] [LTR] [FontUp] [FontDown]
^-- speak & dictate --^   ^-------------- text tools ----------------^
```

Each group is shown/hidden independently. If both groups are OFF but the master toolbar toggle is ON, the toolbar still appears (empty bar — gives consistent keyboard offset behavior), or could be hidden entirely. Decision: hide the toolbar if both sub-groups are off.

### Speak button

- SF Symbol icon: `speaker.wave.2`
- Tapping sends `onToolbarAction` event with action `"speak"` to React Native
- While speaking, the button icon blinks (UIView alpha animation, 0.3s cycle)
- Tapping again while speaking sends `onToolbarAction` with action `"stopSpeaking"`

## Native iOS: Text-to-Speech Engine

### Implementation in `SpeechTranscription.swift`

Add TTS using `AVSpeechSynthesizer` alongside the existing `SFSpeechRecognizer`:

**New methods exposed to RN:**
- `startSpeaking(text: String, fallbackLanguage: String)` — begins TTS
- `stopSpeaking()` — stops TTS immediately

**Language detection:**
- Use `NLLanguageRecognizer` to auto-detect language from the text content
- Map detected language to speech voice locale (`he` -> `he-IL`, `ar` -> `ar-SA`, `en` -> `en-US`)
- Fall back to the provided `fallbackLanguage` (the app's UI language) if detection confidence is too low

**Events emitted to RN:**
- `onSpeakingStart` — TTS has begun
- `onSpeakingWord { location: Int, length: Int }` — the character range of the word currently being spoken
- `onSpeakingEnd` — TTS finished (naturally or stopped)

**AVSpeechSynthesizerDelegate methods:**
- `speechSynthesizer(_:willSpeakRangeOfSpeechString:utterance:)` — emits `onSpeakingWord`
- `speechSynthesizer(_:didFinish:)` — emits `onSpeakingEnd`
- `speechSynthesizer(_:didStart:)` — emits `onSpeakingStart`

### Bridge update (`SpeechTranscription.m`)

Add `startSpeaking` and `stopSpeaking` to the Objective-C bridge macro.

## React Native: Speaking Flow

### text-element.tsx

**Triggering speech:**

When the toolbar action `"speak"` is received (via `onToolbarAction` event listener):
1. Call `SpeechTranscription.startSpeaking(text.text, uiLanguage)`
2. Enter "speaking mode"

**Speaking mode — TextInput to Text swap:**

While speaking:
- Replace the `<AnimatedTextInput>` with a read-only `<Text>` component
- The `<Text>` renders the full text content, split so the currently spoken word can receive a highlight style (e.g. yellow/orange background)
- Maintain the same font, size, color, alignment, and position as the `TextInput` so there is no visual jump

**Word highlighting:**
- Listen for `onSpeakingWord` events with `{ location, length }`
- Split the text into three spans: before-word, current-word (highlighted), after-word
- Update on each `onSpeakingWord` event

**Ending speech:**
- On `onSpeakingEnd`: exit speaking mode, switch back to `<AnimatedTextInput>`
- On toolbar action `"stopSpeaking"`: call `SpeechTranscription.stopSpeaking()`, which triggers `onSpeakingEnd`

### use-transcription.ts

Update the `attachToKeyboard` call to pass the two new flags instead of the single boolean:
- `SpeechTranscription.attachToKeyboard(textToolsEnabled, speakDictateEnabled)`

## Translations

New keys in `src/lang.js`:

| Key | English | Hebrew | Arabic |
|---|---|---|---|
| `TextTools` | "Text Tools" | "כלי עיצוב" | "أدوات النص" |
| `SpeakAndDictate` | "Speak and Dictate" | "דיבור והכתבה" | "التحدث والإملاء" |

## Scope and constraints

- iOS only (the native keyboard toolbar and TTS are iOS-specific; Android has no keyboard toolbar currently)
- The `NLLanguageRecognizer` requires iOS 12+ (already the minimum for this app)
- `AVSpeechSynthesizer` is available on all supported iOS versions
- On-device voices are used (no network requirement)
- If the text box is empty, the Speak button does nothing
