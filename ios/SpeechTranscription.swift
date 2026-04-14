import Foundation
import Speech
import AVFoundation
import AudioToolbox
import UIKit
import NaturalLanguage
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

  // MARK: - Native Toolbar

  private var micToolbar: UIView?

  // Formatting buttons
  private var boldButton: UIButton?
  private var italicButton: UIButton?
  private var underlineButton: UIButton?
  private var ltrButton: UIButton?
  private var rtlButton: UIButton?
  private var fontUpButton: UIButton?
  private var fontDownButton: UIButton?

  // Track which styles are available for the current font
  private var showBold = true
  private var showItalic = true
  private var showUnderline = true

  // Current formatting state
  private var isBold = false
  private var isItalic = false
  private var isUnderline = false
  private var isRTL = false
  private var uiRTL = false
  private var kbLanguage = "en"
  private var toolbarEnabled = true
  private var isAttached = false
  private var textToolsEnabled = true
  private var isSpeaking = false

  private var speechSynthesizer = AVSpeechSynthesizer()
  private var currentUtterance: AVSpeechUtterance?

  override init() {
    super.init()
    speechSynthesizer.delegate = self
    speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en"))
  }

  deinit {
    NotificationCenter.default.removeObserver(self)
  }

  // Called from JS when keyboard language changes, to re-evaluate toolbar
  @objc
  func refreshToolbar() {
    guard isAttached else { return }
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
      guard let self = self, self.isAttached else { return }
      self.attachToKeyboard(self.textToolsEnabled, speakDictateEnabled: false)
    }
  }

  // MARK: - React Native Boilerplate

  override func startObserving() { hasListeners = true }
  override func stopObserving() { hasListeners = false }

  override func supportedEvents() -> [String]! {
    return [
      "onTranscription", "onTranscriptionEnd", "onTranscriptionError", "onTranscriptionStart",
      "onToolbarAction",
      "onSpeakingStart", "onSpeakingWord", "onSpeakingEnd",
      "onLowVolume"
    ]
  }

  @objc override static func requiresMainQueueSetup() -> Bool { return true }

  // MARK: - Toolbar Management

  private func createToolbar() -> UIView {
    let barHeight: CGFloat = 44
    let container = UIView(frame: CGRect(x: 0, y: 0, width: UIScreen.main.bounds.width, height: barHeight))
    container.backgroundColor = UIColor(red: 0.82, green: 0.84, blue: 0.86, alpha: 1.0)

    // Formatting buttons
    self.boldButton = makeFormattingButton(systemName: "bold", action: #selector(boldTapped))
    self.italicButton = makeFormattingButton(systemName: "italic", action: #selector(italicTapped))
    self.underlineButton = makeFormattingButton(systemName: "underline", action: #selector(underlineTapped))
    self.ltrButton = makeFormattingButton(systemName: "text.alignleft", action: #selector(ltrTapped))
    self.rtlButton = makeFormattingButton(systemName: "text.alignright", action: #selector(rtlTapped))
    self.fontUpButton = makeFontSizeButton(label: "A", fontSize: 20, action: #selector(fontUpTapped))
    self.fontDownButton = makeFontSizeButton(label: "A", fontSize: 13, action: #selector(fontDownTapped))

    updateFormattingButtons()
    layoutToolbarButtons(in: container)

    return container
  }

  private func layoutToolbarButtons(in container: UIView) {
    container.subviews.forEach { $0.removeFromSuperview() }

    let btnSize: CGFloat = 34
    let minSpacing: CGFloat = 8
    let margin: CGFloat = 8
    let btnY: CGFloat = (container.bounds.height - btnSize) / 2
    let containerWidth = container.bounds.width

    var visibleButtons: [UIButton] = []

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

    let count = CGFloat(visibleButtons.count)
    guard count > 0 else { return }

    let totalButtonsWidth = count * btnSize
    let availableForSpacing = containerWidth - 2 * margin - totalButtonsWidth
    let maxSpacing: CGFloat = 16
    let spacing: CGFloat = count > 1
        ? min(max(availableForSpacing / (count - 1), minSpacing), maxSpacing)
        : minSpacing

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

  private func makeFormattingButton(systemName: String, action: Selector) -> UIButton {
    let btn = UIButton(type: .custom)
    let config = UIImage.SymbolConfiguration(pointSize: 16, weight: .medium)
    let img = UIImage(systemName: systemName, withConfiguration: config)
    btn.setImage(img, for: .normal)
    btn.tintColor = UIColor.label
    btn.frame = CGRect(x: 0, y: 0, width: 34, height: 34)
    btn.backgroundColor = UIColor.white.withAlphaComponent(0.6)
    btn.layer.cornerRadius = 8
    btn.clipsToBounds = false
    btn.layer.shadowColor = UIColor.black.cgColor
    btn.layer.shadowOffset = CGSize(width: 0, height: 1)
    btn.layer.shadowOpacity = 0.15
    btn.layer.shadowRadius = 2
    btn.addTarget(self, action: action, for: .touchUpInside)
    return btn
  }

  private func makeFontSizeButton(label: String, fontSize: CGFloat, action: Selector) -> UIButton {
    let btn = UIButton(type: .custom)
    btn.setTitle(label, for: .normal)
    btn.titleLabel?.font = UIFont.systemFont(ofSize: fontSize, weight: .semibold)
    btn.setTitleColor(UIColor.label, for: .normal)
    btn.frame = CGRect(x: 0, y: 0, width: 34, height: 34)
    btn.backgroundColor = UIColor.white.withAlphaComponent(0.6)
    btn.layer.cornerRadius = 8
    btn.clipsToBounds = false
    btn.layer.shadowColor = UIColor.black.cgColor
    btn.layer.shadowOffset = CGSize(width: 0, height: 1)
    btn.layer.shadowOpacity = 0.15
    btn.layer.shadowRadius = 2
    btn.addTarget(self, action: action, for: .touchUpInside)
    return btn
  }

  private func applySelectedStyle(_ button: UIButton?, selected: Bool) {
    guard let btn = button else { return }
    if selected {
      btn.tintColor = UIColor.systemBlue
      btn.backgroundColor = UIColor.systemBlue.withAlphaComponent(0.2)
      btn.layer.shadowOpacity = 0.25
    } else {
      btn.tintColor = UIColor.label
      btn.backgroundColor = UIColor.white.withAlphaComponent(0.6)
      btn.layer.shadowOpacity = 0.15
    }
  }

  private func updateFormattingButtons() {
    applySelectedStyle(boldButton, selected: isBold)
    applySelectedStyle(italicButton, selected: isItalic)
    applySelectedStyle(underlineButton, selected: isUnderline)
    applySelectedStyle(ltrButton, selected: !isRTL)
    applySelectedStyle(rtlButton, selected: isRTL)
  }

  @objc private func boldTapped() {
    isBold = !isBold
    updateFormattingButtons()
    if hasListeners {
      sendEvent(withName: "onToolbarAction", body: ["action": "bold", "value": isBold])
    }
  }

  @objc private func italicTapped() {
    isItalic = !isItalic
    updateFormattingButtons()
    if hasListeners {
      sendEvent(withName: "onToolbarAction", body: ["action": "italic", "value": isItalic])
    }
  }

  @objc private func underlineTapped() {
    isUnderline = !isUnderline
    updateFormattingButtons()
    if hasListeners {
      sendEvent(withName: "onToolbarAction", body: ["action": "underline", "value": isUnderline])
    }
  }

  @objc private func ltrTapped() {
    isRTL = false
    updateFormattingButtons()
    if hasListeners {
      sendEvent(withName: "onToolbarAction", body: ["action": "rtl", "value": false])
    }
  }

  @objc private func rtlTapped() {
    isRTL = true
    updateFormattingButtons()
    if hasListeners {
      sendEvent(withName: "onToolbarAction", body: ["action": "rtl", "value": true])
    }
  }

  @objc private func fontUpTapped() {
    if hasListeners {
      sendEvent(withName: "onToolbarAction", body: ["action": "fontUp"])
    }
  }

  @objc private func fontDownTapped() {
    if hasListeners {
      sendEvent(withName: "onToolbarAction", body: ["action": "fontDown"])
    }
  }

  // MARK: - Public Methods

  @objc
  func updateFormattingState(_ state: NSDictionary) {
    DispatchQueue.main.async { [weak self] in
      guard let self = self else { return }
      if let bold = state["bold"] as? Bool { self.isBold = bold }
      if let italic = state["italic"] as? Bool { self.isItalic = italic }
      if let underline = state["underline"] as? Bool { self.isUnderline = underline }
      if let rtl = state["rtl"] as? Bool { self.isRTL = rtl }
      self.updateFormattingButtons()

      var needsRelayout = false

      // UI direction
      if let newUIRTL = state["uiRTL"] as? Bool, newUIRTL != self.uiRTL {
        self.uiRTL = newUIRTL
        needsRelayout = true
      }

      // Show/hide bold/italic/underline based on font's available styles
      if let styles = state["availableStyles"] as? [String] {
        let newShowBold = styles.contains("bold")
        let newShowItalic = styles.contains("italic")
        let newShowUnderline = styles.contains("underline")

        if newShowBold != self.showBold || newShowItalic != self.showItalic || newShowUnderline != self.showUnderline {
          self.showBold = newShowBold
          self.showItalic = newShowItalic
          self.showUnderline = newShowUnderline
          needsRelayout = true
        }
      }

      if needsRelayout, let container = self.micToolbar {
        self.layoutToolbarButtons(in: container)
      }
    }
  }

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

    DispatchQueue.main.async { [weak self] in
      guard let self = self else { return }
      self.kbLanguage = lang
      let label: String
      switch lang {
      case "he": label = "א"
      case "ar": label = "أ"
      default:   label = "A"
      }
      self.fontUpButton?.setTitle(label, for: .normal)
      self.fontDownButton?.setTitle(label, for: .normal)
    }
  }

  @objc
  func attachToKeyboard(_ textToolsEnabled: Bool, speakDictateEnabled: Bool) {
    DispatchQueue.main.async { [weak self] in
      guard let self = self else { return }
      self.textToolsEnabled = textToolsEnabled
      self.toolbarEnabled = textToolsEnabled
      self.isAttached = true

      guard let firstResponder = self.findFirstResponder() else {
        NSLog("[SpeechTranscription] attachToKeyboard: no first responder found")
        return
      }

      NSLog("[SpeechTranscription] attachToKeyboard: textTools=%d", textToolsEnabled)

      self.micToolbar = nil

      var accessoryView: UIView? = nil

      if textToolsEnabled {
        let toolbar = self.createToolbar()
        self.micToolbar = toolbar
        accessoryView = toolbar
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

  private func findTextView(in view: UIView) -> UITextView? {
    if let textView = view as? UITextView { return textView }
    for subview in view.subviews {
      if let found = findTextView(in: subview) { return found }
    }
    return nil
  }

  @objc
  func detachFromKeyboard() {
    NSLog("[SpeechTranscription] detachFromKeyboard called, isRecording=%d", isRecording)
    DispatchQueue.main.async { [weak self] in
      guard let self = self else { return }
      self.isAttached = false

      if self.isRecording {
        self.stopTranscription()
      }

      if self.speechSynthesizer.isSpeaking {
        self.speechSynthesizer.stopSpeaking(at: .immediate)
      }

      guard let firstResponder = self.findFirstResponder() else { return }

      if let textField = firstResponder as? UITextField {
        textField.inputAccessoryView = nil
        textField.reloadInputViews()
      } else if let textView = firstResponder as? UITextView {
        textView.inputAccessoryView = nil
        textView.reloadInputViews()
      } else if let view = firstResponder as? UIView {
        if let textView = self.findTextView(in: view) {
          textView.inputAccessoryView = nil
          textView.reloadInputViews()
        }
      }
    }
  }

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

  @objc
  func stopTranscription() {
    guard isRecording else { return }
    stopRecognitionInternal()
    playEndSound()
    if hasListeners {
      sendEvent(withName: "onTranscriptionEnd", body: [:])
    }
  }

  // MARK: - Text-to-Speech

  @objc
  func startSpeaking(_ text: String, fallbackLanguage: String, speechRate: Float) {
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

        // Map detected/fallback language to a language code (e.g. "en", "he", "ar")
        let langCode: String
        if let lang = detectedLang {
            langCode = lang.rawValue  // e.g. "en", "he", "ar"
        } else {
            langCode = fallbackLanguage
        }

        // Find the user's preferred locale for this language from system settings
        // e.g. if device is set to en-GB, prefer "en-GB" over "en-US"
        let voiceLocale: String
        if let preferred = Locale.preferredLanguages.first(where: { $0.hasPrefix(langCode) }) {
            voiceLocale = preferred
        } else {
            // Fallback to common defaults
            switch langCode {
            case "he": voiceLocale = "he-IL"
            case "ar": voiceLocale = "ar-SA"
            default: voiceLocale = "\(langCode)-US"
            }
        }

        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: voiceLocale)
        utterance.rate = speechRate >= 0 ? speechRate : AVSpeechUtteranceDefaultSpeechRate
        utterance.prefersAssistiveTechnologySettings = true

        NSLog("[SpeechTranscription] Speaking with voice: %@, language: %@, quality: %d",
              utterance.voice?.name ?? "nil",
              utterance.voice?.language ?? voiceLocale,
              utterance.voice?.quality.rawValue ?? -1)

        // Configure audio session for playback
        do {
            let audioSession = AVAudioSession.sharedInstance()
            try audioSession.setCategory(.playback, mode: .default, options: .duckOthers)
            try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
        } catch {
            NSLog("[SpeechTranscription] Failed to set audio session for speaking: %@", error.localizedDescription)
        }

        // Check volume level (not reliable on Simulator)
        #if !targetEnvironment(simulator)
        let volume = AVAudioSession.sharedInstance().outputVolume
        if volume < 0.1 && self.hasListeners {
            self.sendEvent(withName: "onLowVolume", body: [:])
        }
        #endif

        self.currentUtterance = utterance
        self.isSpeaking = true
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

  // MARK: - Recognition

  private func startRecognition(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    guard let speechRecognizer = speechRecognizer, speechRecognizer.isAvailable else {
      if hasListeners {
        sendEvent(withName: "onTranscriptionError", body: ["message": "Speech recognizer not available"])
      }
      reject("NOT_AVAILABLE", "Speech recognizer not available", nil)
      return
    }

    let audioSession = AVAudioSession.sharedInstance()
    if audioSession.isOtherAudioPlaying {
      if hasListeners {
        sendEvent(withName: "onTranscriptionError", body: ["message": "Another audio session is active"])
      }
      reject("AUDIO_CONFLICT", "Another audio session is active", nil)
      return
    }

    stopRecognitionInternal()

    do {
      try audioSession.setCategory(.playAndRecord, mode: .measurement, options: [.duckOthers, .defaultToSpeaker])
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
    recognitionRequest.requiresOnDeviceRecognition = true

    recognitionTask = speechRecognizer.recognitionTask(with: recognitionRequest) { [weak self] result, error in
      guard let self = self else { return }

      if let result = result {
        let text = result.bestTranscription.formattedString
        let isFinal = result.isFinal

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

    // Play start sound before installing audio tap (engine suppresses system sounds)
    playStartSound()

    let inputNode = audioEngine.inputNode
    let recordingFormat = inputNode.outputFormat(forBus: 0)
    inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { [weak self] buffer, _ in
      self?.recognitionRequest?.append(buffer)
    }

    do {
      audioEngine.prepare()
      try audioEngine.start()
      isRecording = true
      if hasListeners {
        sendEvent(withName: "onTranscriptionStart", body: [:])
      }
      startSilenceTimer()
      resolve(nil)
    } catch {
      if hasListeners {
        sendEvent(withName: "onTranscriptionError", body: ["message": "Audio engine error: \(error.localizedDescription)"])
      }
      reject("ENGINE_ERROR", error.localizedDescription, error)
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

    try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
  }

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
    AudioServicesPlayAlertSound(1110)
    let generator = UIImpactFeedbackGenerator(style: .medium)
    generator.impactOccurred()
  }

  private func playEndSound() {
    AudioServicesPlayAlertSound(1111)
  }

  // MARK: - Helpers

  private func findFirstResponder() -> UIResponder? {
    return UIApplication.shared.connectedScenes
      .filter({ $0.activationState == .foregroundActive })
      .compactMap({ $0 as? UIWindowScene })
      .first?.windows
      .filter({ $0.isKeyWindow }).first?
      .findFirstResponder()
      ?? UIApplication.shared.keyWindow?.findFirstResponder()
  }
}

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
        }
        if hasListeners {
            sendEvent(withName: "onSpeakingEnd", body: [:])
        }
    }
}
