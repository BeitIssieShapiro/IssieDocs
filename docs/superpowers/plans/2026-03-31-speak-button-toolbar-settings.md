# Speak Button & Keyboard Toolbar Settings — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Speak (TTS) button to the iOS keyboard toolbar with word-by-word highlighting, and restructure toolbar settings into a parent/child hierarchy.

**Architecture:** Two new settings (`KB_TEXT_TOOLS`, `KB_SPEAK_DICTATE`) control sub-groups of the keyboard toolbar. The native Swift module gains `AVSpeechSynthesizer` + `NLLanguageRecognizer` for TTS with word-range events. React Native swaps `TextInput` for a highlighted `<Text>` during speech. The `attachToKeyboard` bridge method changes from 1 bool to 2 bools.

**Tech Stack:** Swift (AVSpeechSynthesizer, NLLanguageRecognizer, UIKit), React Native (TypeScript/JSX), Objective-C bridge

---

### Task 1: Add new settings constants and translations

**Files:**
- Modify: `src/settings.js:58-62`
- Modify: `src/lang.js` (he block ~line 144, ar block ~line 315, en block ~line 487)

- [ ] **Step 1: Add `KB_TEXT_TOOLS` and `KB_SPEAK_DICTATE` constants to settings.js**

In `src/settings.js`, after the existing `KB_TOOLBAR` block (line 58-62), add two new setting objects:

```javascript
export const KB_TEXT_TOOLS = {
    name: 'kbTextTools',
    yes: 1,
    no: 2
}

export const KB_SPEAK_DICTATE = {
    name: 'kbSpeakDictate',
    yes: 1,
    no: 2
}
```

- [ ] **Step 2: Add translation keys to all three languages in lang.js**

In the `he` block, after `KeyboardToolbar: 'סרגל כלים במקלדת',` (line 144), add:

```javascript
TextTools: 'כלי עיצוב',
SpeakAndDictate: 'דיבור והכתבה',
```

In the `ar` block, after `KeyboardToolbar: 'شريط أدوات لوحة المفاتيح',` (line 315), add:

```javascript
TextTools: 'أدوات النص',
SpeakAndDictate: 'التحدث والإملاء',
```

In the `en` block, after `KeyboardToolbar: 'Keyboard Toolbar',` (line 487), add:

```javascript
TextTools: 'Text Tools',
SpeakAndDictate: 'Speak and Dictate',
```

- [ ] **Step 3: Commit**

```bash
git add src/settings.js src/lang.js
git commit -m "feat: add KB_TEXT_TOOLS and KB_SPEAK_DICTATE settings and translations"
```

---

### Task 2: Update settings UI with hierarchical checkboxes

**Files:**
- Modify: `src/settings-ui.js:22-28` (imports), `~56-59` (state), `~175-180` (handler), `~335-341` (UI)

- [ ] **Step 1: Add imports for the new settings**

In `src/settings-ui.js`, update the import from `'./settings'` (line 22-28) to include the new constants:

```javascript
import {
    VIEW, EDIT_TITLE, LANGUAGE, TEXT_BUTTON,
    getSetting, getUseColorSetting, FOLDERS_VIEW,
    getFeaturesSetting,
    FEATURES,
    SCROLL_BUTTONS,
    KB_TOOLBAR,
    KB_TEXT_TOOLS,
    KB_SPEAK_DICTATE
} from './settings'
```

- [ ] **Step 2: Add state variables for the new settings**

After the `kbToolbar` state (line 58-59), add:

```javascript
let kbTextToolsSetting = getSetting(KB_TEXT_TOOLS.name, KB_TEXT_TOOLS.no);
const [kbTextTools, setKbTextTools] = useState(kbTextToolsSetting);

let kbSpeakDictateSetting = getSetting(KB_SPEAK_DICTATE.name, KB_SPEAK_DICTATE.yes);
const [kbSpeakDictate, setKbSpeakDictate] = useState(kbSpeakDictateSetting);
```

- [ ] **Step 3: Add handler functions for the new settings**

After the `setKbToolbarHandler` function (line 175-180), add:

```javascript
const setKbTextToolsHandler = (tb) => {
    let obj = {}
    obj[KB_TEXT_TOOLS.name] = tb;
    Settings.set(obj)
    setKbTextTools(tb);
}

const setKbSpeakDictateHandler = (tb) => {
    let obj = {}
    obj[KB_SPEAK_DICTATE.name] = tb;
    Settings.set(obj)
    setKbSpeakDictate(tb);
}
```

- [ ] **Step 4: Replace the single keyboard toolbar checkbox with parent + children**

Replace the keyboard toolbar checkbox block (lines 335-341):

```javascript
{getCheckbox(translate("KeyboardToolbar"),
    () => {
        let newValue = kbToolbar == KB_TOOLBAR.yes ? KB_TOOLBAR.no : KB_TOOLBAR.yes;
        setKbToolbar(newValue);
        setKbToolbarHandler(newValue)
    },
    kbToolbar == KB_TOOLBAR.yes)}
```

With the parent checkbox and two indented child checkboxes:

```javascript
{getCheckbox(translate("KeyboardToolbar"),
    () => {
        let newValue = kbToolbar == KB_TOOLBAR.yes ? KB_TOOLBAR.no : KB_TOOLBAR.yes;
        setKbToolbar(newValue);
        setKbToolbarHandler(newValue)
    },
    kbToolbar == KB_TOOLBAR.yes)}

{kbToolbar == KB_TOOLBAR.yes && getCheckbox(translate("TextTools"),
    () => {
        let newValue = kbTextTools == KB_TEXT_TOOLS.yes ? KB_TEXT_TOOLS.no : KB_TEXT_TOOLS.yes;
        setKbTextTools(newValue);
        setKbTextToolsHandler(newValue)
    },
    kbTextTools == KB_TEXT_TOOLS.yes, 40)}

{kbToolbar == KB_TOOLBAR.yes && getCheckbox(translate("SpeakAndDictate"),
    () => {
        let newValue = kbSpeakDictate == KB_SPEAK_DICTATE.yes ? KB_SPEAK_DICTATE.no : KB_SPEAK_DICTATE.yes;
        setKbSpeakDictate(newValue);
        setKbSpeakDictateHandler(newValue)
    },
    kbSpeakDictate == KB_SPEAK_DICTATE.yes, 40)}
```

- [ ] **Step 5: Update the `getCheckbox` function to support indentation**

Modify the `getCheckbox` function (line 463-479) to accept an optional `indent` parameter:

```javascript
function getCheckbox(name, callback, selected, indent) {
    return <View style={{
        width: '100%', paddingTop: indent ? 10 : 25,
        paddingStart: indent || 15, alignItems: "flex-start"
    }}>
        <TouchableOpacity
            style={{ flexDirection: "row", paddingStart: 0, paddingTop: 15, alignItems: 'center' }}
            onPress={callback}
        >
            <Spacer />
            <View style={styles.box}>
                {selected && <View style={styles.checkedBox} />}
            </View>
            <AppText style={indent ? styles.radioText : styles.SettingsHeaderText}>{name}</AppText>
        </TouchableOpacity>
    </View>
}
```

Child checkboxes use `indent=40` for visual nesting and a smaller font (`radioText` style instead of `SettingsHeaderText`).

- [ ] **Step 6: Commit**

```bash
git add src/settings-ui.js
git commit -m "feat: hierarchical keyboard toolbar settings with text tools and speak/dictate sub-toggles"
```

---

### Task 3: Update the Obj-C bridge for new method signatures

**Files:**
- Modify: `ios/SpeechTranscription.m`

- [ ] **Step 1: Update `attachToKeyboard` bridge signature and add TTS methods**

Replace the entire content of `ios/SpeechTranscription.m`:

```objc
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(SpeechTranscription, RCTEventEmitter)

RCT_EXTERN_METHOD(startTranscription:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(stopTranscription)
RCT_EXTERN_METHOD(setLanguage:(NSString *)lang)
RCT_EXTERN_METHOD(attachToKeyboard:(BOOL)textToolsEnabled speakDictateEnabled:(BOOL)speakDictateEnabled)
RCT_EXTERN_METHOD(detachFromKeyboard)
RCT_EXTERN_METHOD(updateFormattingState:(NSDictionary *)state)
RCT_EXTERN_METHOD(startSpeaking:(NSString *)text fallbackLanguage:(NSString *)fallbackLanguage)
RCT_EXTERN_METHOD(stopSpeaking)

@end
```

- [ ] **Step 2: Commit**

```bash
git add ios/SpeechTranscription.m
git commit -m "feat: update bridge for two-flag attachToKeyboard and add TTS methods"
```

---

### Task 4: Update Swift toolbar to support two-flag visibility and add Speak button

**Files:**
- Modify: `ios/SpeechTranscription.swift`

- [ ] **Step 1: Add new instance variables for speak button and TTS state**

In `SpeechTranscription.swift`, after the `toolbarEnabled` / `showMic` / `isAttached` properties (lines 49-51), add:

```swift
private var textToolsEnabled = true
private var speakDictateEnabled = true
private var speakButton: UIButton?
private var isSpeaking = false
private var speakBlinkTimer: Timer?
```

- [ ] **Step 2: Add the speak button to `createToolbar()`**

In the `createToolbar()` method (line 142-174), after the mic button creation (line 159) and before the formatting buttons (line 162), add the speak button creation:

```swift
// Speak button (TTS)
let speakBtn = UIButton(type: .custom)
speakBtn.setImage(UIImage(systemName: "speaker.wave.2", withConfiguration: UIImage.SymbolConfiguration(pointSize: 18, weight: .medium)), for: .normal)
speakBtn.tintColor = UIColor.systemGreen
speakBtn.backgroundColor = UIColor.white.withAlphaComponent(0.6)
speakBtn.layer.cornerRadius = 8
speakBtn.clipsToBounds = false
speakBtn.layer.shadowColor = UIColor.black.cgColor
speakBtn.layer.shadowOffset = CGSize(width: 0, height: 1)
speakBtn.layer.shadowOpacity = 0.15
speakBtn.layer.shadowRadius = 2
speakBtn.addTarget(self, action: #selector(speakButtonTapped), for: .touchUpInside)
self.speakButton = speakBtn
```

- [ ] **Step 3: Add `speakButtonTapped` handler**

After the `micButtonTapped` method (line 330-340), add:

```swift
@objc private func speakButtonTapped() {
    if isSpeaking {
        if hasListeners {
            sendEvent(withName: "onToolbarAction", body: ["action": "stopSpeaking"])
        }
    } else {
        if hasListeners {
            sendEvent(withName: "onToolbarAction", body: ["action": "speak"])
        }
    }
}
```

- [ ] **Step 4: Update `layoutToolbarButtons` to group buttons by setting**

Replace the `layoutToolbarButtons` method (lines 176-220) to separate buttons into speak/dictate and text-tools groups:

```swift
private func layoutToolbarButtons(in container: UIView) {
    container.subviews.forEach { $0.removeFromSuperview() }

    let btnSize: CGFloat = 34
    let spacing: CGFloat = 8
    let margin: CGFloat = 8
    let btnY: CGFloat = (container.bounds.height - btnSize) / 2
    let containerWidth = container.bounds.width

    var visibleButtons: [UIButton] = []

    // Speak & Dictate group
    if speakDictateEnabled {
        if let micBtn = micIconButton, showMic { visibleButtons.append(micBtn) }
        if let spkBtn = speakButton { visibleButtons.append(spkBtn) }
    }

    // Text tools group
    if textToolsEnabled {
        let formattingButtons: [(UIButton?, Bool)] = [
            (boldButton, showBold),
            (italicButton, showItalic),
            (underlineButton, showUnderline),
            (rtlButton, true),
            (ltrButton, true),
            (fontUpButton, true),
            (fontDownButton, true),
        ]
        for (btn, show) in formattingButtons {
            guard let btn = btn, show else { continue }
            visibleButtons.append(btn)
        }
    }

    if uiRTL {
        var x = containerWidth - margin - btnSize
        for btn in visibleButtons {
            btn.frame = CGRect(x: x, y: btnY, width: btnSize, height: btnSize)
            container.addSubview(btn)
            x -= btnSize + spacing
        }
    } else {
        var x = margin
        for btn in visibleButtons {
            btn.frame = CGRect(x: x, y: btnY, width: btnSize, height: btnSize)
            container.addSubview(btn)
            x += btnSize + spacing
        }
    }
}
```

- [ ] **Step 5: Update `attachToKeyboard` to accept two flags**

Replace the `attachToKeyboard` method (lines 461-520):

```swift
@objc
func attachToKeyboard(_ textToolsEnabled: Bool, speakDictateEnabled: Bool) {
    DispatchQueue.main.async { [weak self] in
        guard let self = self else { return }
        self.textToolsEnabled = textToolsEnabled
        self.speakDictateEnabled = speakDictateEnabled
        self.toolbarEnabled = textToolsEnabled || speakDictateEnabled
        self.isAttached = true

        guard let firstResponder = self.findFirstResponder() else {
            NSLog("[SpeechTranscription] attachToKeyboard: no first responder found")
            return
        }

        NSLog("[SpeechTranscription] attachToKeyboard: textTools=%d, speakDictate=%d", textToolsEnabled, speakDictateEnabled)

        let isIssieBoard = self.isIssieBoardKeyboard()

        // Clear previous toolbar references
        self.micToolbar = nil
        self.micFloatingButton = nil
        self.micIconButton = nil
        self.speakButton = nil

        var accessoryView: UIView? = nil

        if textToolsEnabled || speakDictateEnabled {
            self.showMic = isIssieBoard
            let toolbar = self.createToolbar()
            self.micToolbar = toolbar
            accessoryView = toolbar
        } else {
            // Both disabled: show mic-only if IssieBoard, nothing otherwise
            if isIssieBoard {
                let micView = self.createMicOnlyView()
                self.micFloatingButton = micView
                accessoryView = micView
            }
        }

        if let textField = firstResponder as? UITextField {
            textField.inputAccessoryView = accessoryView
            textField.reloadInputViews()
        } else if let textView = firstResponder as? UITextView {
            textView.inputAccessoryView = accessoryView
            textView.reloadInputViews()
        } else if let view = firstResponder as? UIView {
            if let textView = self.findTextView(in: view) {
                textView.inputAccessoryView = accessoryView
                textView.reloadInputViews()
            }
        }
    }
}
```

- [ ] **Step 6: Update `inputModeDidChange` to pass two flags**

In the `inputModeDidChange` method (line 68-75), replace:

```swift
self.attachToKeyboard(self.toolbarEnabled)
```

with:

```swift
self.attachToKeyboard(self.textToolsEnabled, speakDictateEnabled: self.speakDictateEnabled)
```

- [ ] **Step 7: Add speak button blink animation methods**

After the existing `stopBlinkAnimation()` method (line 388-392), add:

```swift
private func updateSpeakAppearance() {
    guard let button = speakButton else { return }
    if isSpeaking {
        button.tintColor = UIColor.systemOrange
        startSpeakBlinkAnimation()
    } else {
        button.tintColor = UIColor.systemGreen
        stopSpeakBlinkAnimation()
        button.alpha = 1.0
    }
}

private func startSpeakBlinkAnimation() {
    stopSpeakBlinkAnimation()
    guard let button = speakButton else { return }
    speakBlinkTimer = Timer.scheduledTimer(withTimeInterval: 0.6, repeats: true) { [weak button] _ in
        guard let imageView = button?.imageView else { return }
        UIView.animate(withDuration: 0.3) {
            imageView.alpha = imageView.alpha > 0.5 ? 0.3 : 1.0
        }
    }
}

private func stopSpeakBlinkAnimation() {
    speakBlinkTimer?.invalidate()
    speakBlinkTimer = nil
    speakButton?.imageView?.alpha = 1.0
}
```

- [ ] **Step 8: Update `supportedEvents` to include TTS events**

Update the `supportedEvents` method (line 82-87) to add the new events:

```swift
override func supportedEvents() -> [String]! {
    return [
        "onTranscription", "onTranscriptionEnd", "onTranscriptionError", "onTranscriptionStart",
        "onToolbarAction",
        "onSpeakingStart", "onSpeakingWord", "onSpeakingEnd"
    ]
}
```

- [ ] **Step 9: Commit**

```bash
git add ios/SpeechTranscription.swift
git commit -m "feat: add speak button to toolbar with two-flag visibility control"
```

---

### Task 5: Add TTS engine to Swift module

**Files:**
- Modify: `ios/SpeechTranscription.swift`

- [ ] **Step 1: Add NaturalLanguage import and AVSpeechSynthesizer**

At the top of `SpeechTranscription.swift`, add after `import UIKit` (line 5):

```swift
import NaturalLanguage
```

Add a new property after `speakBlinkTimer` (added in Task 4):

```swift
private var speechSynthesizer = AVSpeechSynthesizer()
private var currentUtterance: AVSpeechUtterance?
```

- [ ] **Step 2: Set the delegate in `init()`**

In the `init()` method (line 53-62), add after `super.init()` and before `speechRecognizer = ...`:

```swift
speechSynthesizer.delegate = self
```

- [ ] **Step 3: Add the TTS methods**

After the `stopTranscription` method (line 586-597), add the new TTS methods:

```swift
// MARK: - Text-to-Speech

@objc
func startSpeaking(_ text: String, fallbackLanguage: String) {
    DispatchQueue.main.async { [weak self] in
        guard let self = self else { return }
        if text.isEmpty { return }

        // Stop any current speech
        if self.speechSynthesizer.isSpeaking {
            self.speechSynthesizer.stopSpeaking(at: .immediate)
        }

        // Stop any active transcription
        if self.isRecording {
            self.stopTranscription()
        }

        // Detect language
        let recognizer = NLLanguageRecognizer()
        recognizer.processString(text)
        let detectedLang = recognizer.dominantLanguage

        let voiceLocale: String
        if let lang = detectedLang {
            switch lang {
            case .hebrew: voiceLocale = "he-IL"
            case .arabic: voiceLocale = "ar-SA"
            case .english: voiceLocale = "en-US"
            default:
                // Fall back to the UI language
                switch fallbackLanguage {
                case "he": voiceLocale = "he-IL"
                case "ar": voiceLocale = "ar-SA"
                default: voiceLocale = "en-US"
                }
            }
        } else {
            switch fallbackLanguage {
            case "he": voiceLocale = "he-IL"
            case "ar": voiceLocale = "ar-SA"
            default: voiceLocale = "en-US"
            }
        }

        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: voiceLocale)
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate
        self.currentUtterance = utterance
        self.isSpeaking = true
        self.updateSpeakAppearance()
        self.speechSynthesizer.speak(utterance)
    }
}

@objc
func stopSpeaking() {
    DispatchQueue.main.async { [weak self] in
        guard let self = self else { return }
        if self.speechSynthesizer.isSpeaking {
            self.speechSynthesizer.stopSpeaking(at: .immediate)
        }
    }
}
```

- [ ] **Step 4: Add AVSpeechSynthesizerDelegate extension**

At the end of the file, after the closing `}` of the `SpeechTranscription` class (after line 912), add:

```swift
// MARK: - AVSpeechSynthesizerDelegate

extension SpeechTranscription: AVSpeechSynthesizerDelegate {
    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didStart utterance: AVSpeechUtterance) {
        if hasListeners {
            sendEvent(withName: "onSpeakingStart", body: [:])
        }
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, willSpeakRangeOfSpeechString characterRange: NSRange, utterance: AVSpeechUtterance) {
        if hasListeners {
            sendEvent(withName: "onSpeakingWord", body: [
                "location": characterRange.location,
                "length": characterRange.length
            ])
        }
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.isSpeaking = false
            self.currentUtterance = nil
            self.updateSpeakAppearance()
        }
        if hasListeners {
            sendEvent(withName: "onSpeakingEnd", body: [:])
        }
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.isSpeaking = false
            self.currentUtterance = nil
            self.updateSpeakAppearance()
        }
        if hasListeners {
            sendEvent(withName: "onSpeakingEnd", body: [:])
        }
    }
}
```

- [ ] **Step 5: Also stop speaking in `detachFromKeyboard`**

In the `detachFromKeyboard` method, after `self.stopBlinkAnimation()`, add:

```swift
if self.speechSynthesizer.isSpeaking {
    self.speechSynthesizer.stopSpeaking(at: .immediate)
}
self.stopSpeakBlinkAnimation()
```

- [ ] **Step 6: Commit**

```bash
git add ios/SpeechTranscription.swift
git commit -m "feat: add AVSpeechSynthesizer TTS engine with word-range events"
```

---

### Task 6: Update React Native hook and text-element to pass new settings flags

**Files:**
- Modify: `src/use-transcription.ts:13-19` (interface), `~52-53` (attachToKeyboard call)
- Modify: `src/canvas/text-element.tsx:9` (imports), `~89-96` (useTranscription call)

- [ ] **Step 1: Update `useTranscription` interface and `attachToKeyboard` call**

In `src/use-transcription.ts`, replace the interface (lines 13-19):

```typescript
interface UseTranscriptionProps {
  text: string;
  selectionEnd: number;
  onTextChanged: (newText: string) => void;
  language: string;
  enabled: boolean;
  textToolsEnabled: boolean;
  speakDictateEnabled: boolean;
}
```

Update the destructuring (line 29):

```typescript
export function useTranscription({
  text,
  selectionEnd,
  onTextChanged,
  language,
  enabled,
  textToolsEnabled,
  speakDictateEnabled,
}: UseTranscriptionProps) {
```

Update the `attachToKeyboard` call (line 53):

```typescript
SpeechTranscription.attachToKeyboard(textToolsEnabled, speakDictateEnabled);
```

Update the dependency array for the attach/detach effect (line 60):

```typescript
}, [enabled, textToolsEnabled, speakDictateEnabled]);
```

- [ ] **Step 2: Update text-element.tsx to import new settings and pass them**

In `src/canvas/text-element.tsx`, update the import (line 9):

```typescript
import { getSetting, KB_TOOLBAR, KB_TEXT_TOOLS, KB_SPEAK_DICTATE } from "../settings";
```

Replace the `useTranscription` call (lines 89-96):

```typescript
const kbToolbarOn = getSetting(KB_TOOLBAR.name, KB_TOOLBAR.yes) === KB_TOOLBAR.yes;
const { isRecording } = useTranscription({
    text: text.text,
    selectionEnd: selection.end,
    onTextChanged: handleTranscriptionText,
    language: language || 'en',
    enabled: editMode,
    textToolsEnabled: kbToolbarOn && getSetting(KB_TEXT_TOOLS.name, KB_TEXT_TOOLS.no) === KB_TEXT_TOOLS.yes,
    speakDictateEnabled: kbToolbarOn && getSetting(KB_SPEAK_DICTATE.name, KB_SPEAK_DICTATE.yes) === KB_SPEAK_DICTATE.yes,
});
```

- [ ] **Step 3: Commit**

```bash
git add src/use-transcription.ts src/canvas/text-element.tsx
git commit -m "feat: pass textToolsEnabled and speakDictateEnabled flags through to native toolbar"
```

---

### Task 7: Add speaking mode with word highlighting to text-element

**Files:**
- Modify: `src/canvas/text-element.tsx`

- [ ] **Step 1: Add speaking state and event listeners**

In `text-element.tsx`, add new imports at line 2 (add `useMemo` to the existing import):

```typescript
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react";
```

After the `useTranscription` call (~line 96), add speaking state and the toolbar action + TTS event listeners:

```typescript
const [isSpeaking, setIsSpeaking] = useState(false);
const [highlightRange, setHighlightRange] = useState<{ location: number; length: number } | null>(null);

// Listen for toolbar speak action and TTS events
useEffect(() => {
    if (Platform.OS !== 'ios' || !editMode) return;

    const { NativeModules: NM, NativeEventEmitter } = require('react-native');
    const { SpeechTranscription: ST } = NM;
    if (!ST) return;

    const em = new NativeEventEmitter(ST);

    const toolbarSub = em.addListener('onToolbarAction', (event: { action: string }) => {
        if (event.action === 'speak') {
            if (text.text.length > 0) {
                ST.startSpeaking(text.text, language || 'en');
            }
        } else if (event.action === 'stopSpeaking') {
            ST.stopSpeaking();
        }
    });

    const startSub = em.addListener('onSpeakingStart', () => {
        setIsSpeaking(true);
        setHighlightRange(null);
    });

    const wordSub = em.addListener('onSpeakingWord', (event: { location: number; length: number }) => {
        setHighlightRange({ location: event.location, length: event.length });
    });

    const endSub = em.addListener('onSpeakingEnd', () => {
        setIsSpeaking(false);
        setHighlightRange(null);
    });

    return () => {
        toolbarSub.remove();
        startSub.remove();
        wordSub.remove();
        endSub.remove();
    };
}, [editMode, text.text, language]);
```

Also add `Platform` to the imports from react-native (line 3):

```typescript
import { View, Text, TextInput, StyleSheet, LayoutChangeEvent, TextInputProps, ViewProps, ColorValue, Platform } from "react-native";
```

- [ ] **Step 2: Build the highlighted text spans**

After the speaking state/effects, add a memoized highlighted text builder:

```typescript
const highlightedTextSpans = useMemo(() => {
    if (!isSpeaking || !highlightRange) {
        return <Text style={[styles.textStyle, style]}>{text.text}</Text>;
    }
    const { location, length } = highlightRange;
    const before = text.text.substring(0, location);
    const word = text.text.substring(location, location + length);
    const after = text.text.substring(location + length);
    return (
        <Text style={[styles.textStyle, style]}>
            {before}
            <Text style={{ backgroundColor: '#FFD700' }}>{word}</Text>
            {after}
        </Text>
    );
}, [isSpeaking, highlightRange, text.text, style]);
```

- [ ] **Step 3: Replace TextInput with highlighted Text while speaking**

In the edit mode render (the `<>` fragment containing `AnimatedTextInput`, starting around line 155), wrap the `AnimatedTextInput` with a conditional that shows the highlighted `<Text>` when speaking:

Replace the `AnimatedTextInput` block:

```jsx
<AnimatedTextInput
    disableKeyboardShortcuts={true}
    autoCapitalize="none"
    autoCorrect={false}
    allowFontScaling={false}
    multiline
    autoFocus
    textAlignVertical="top"
    style={[styles.textStyle, style, bgAnimatedStyle,
    !table && widthStyle,
    table && { width: posStyle.width },
    !table && { minWidth: Math.max(text.fontSize * ratio, 20 / ratio) }
    ]}
    value={text.text}
    onChange={(tic) => onTextChanged(text.id, tic.nativeEvent.text)}
    onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
/>
```

With:

```jsx
{isSpeaking ? (
    <Animated.View style={[bgAnimatedStyle,
        !table && widthStyle,
        table && { width: posStyle.width },
        !table && { minWidth: Math.max(text.fontSize * ratio, 20 / ratio) }
    ]}>
        {highlightedTextSpans}
    </Animated.View>
) : (
    <AnimatedTextInput
        disableKeyboardShortcuts={true}
        autoCapitalize="none"
        autoCorrect={false}
        allowFontScaling={false}
        multiline
        autoFocus
        textAlignVertical="top"
        style={[styles.textStyle, style, bgAnimatedStyle,
        !table && widthStyle,
        table && { width: posStyle.width },
        !table && { minWidth: Math.max(text.fontSize * ratio, 20 / ratio) }
        ]}
        value={text.text}
        onChange={(tic) => onTextChanged(text.id, tic.nativeEvent.text)}
        onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
    />
)}
```

- [ ] **Step 4: Stop speaking on unmount or when leaving edit mode**

After the speaking event listeners effect, add a cleanup effect:

```typescript
useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const { NativeModules: NM } = require('react-native');
    const { SpeechTranscription: ST } = NM;
    if (!ST) return;

    return () => {
        ST.stopSpeaking();
    };
}, [editMode]);
```

- [ ] **Step 5: Commit**

```bash
git add src/canvas/text-element.tsx
git commit -m "feat: add speaking mode with word-by-word highlighting in text element"
```

---

### Task 8: Verify build and test manually

- [ ] **Step 1: Install pods (if needed)**

```bash
cd ios && pod install && cd ..
```

- [ ] **Step 2: Build the iOS app**

Run: `npx react-native run-ios` or build via Xcode.

Expected: App builds without errors.

- [ ] **Step 3: Manual testing checklist**

1. Open Settings — verify "Keyboard Toolbar" has two sub-checkboxes: "Text Tools" (off by default), "Speak and Dictate" (on by default)
2. Toggle parent off — sub-checkboxes should hide
3. Toggle parent on — sub-checkboxes reappear with their previous state
4. Edit a text element — keyboard toolbar should show Mic + Speak buttons (if Speak and Dictate is on) but NOT bold/italic/etc (if Text Tools is off)
5. Enable Text Tools — bold/italic/underline/alignment/font buttons appear
6. Tap Speak button — text is read aloud, speak button blinks, text switches to highlighted view
7. Tap Speak button again while speaking — speech stops, text switches back to TextInput
8. Test with Hebrew, Arabic, and English text to verify language auto-detection
9. Test that transcription (mic) still works as before
