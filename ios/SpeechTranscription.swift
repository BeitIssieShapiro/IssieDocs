import Foundation
import Speech
import AVFoundation
import AudioToolbox
import UIKit
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

  private var micToolbar: UIToolbar?
  private var micButton: UIBarButtonItem?
  private var micIconButton: UIButton?
  private var blinkTimer: Timer?

  override init() {
    super.init()
    speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en"))
  }

  // MARK: - React Native Boilerplate

  override func startObserving() { hasListeners = true }
  override func stopObserving() { hasListeners = false }

  override func supportedEvents() -> [String]! {
    return ["onTranscription", "onTranscriptionEnd", "onTranscriptionError", "onTranscriptionStart"]
  }

  @objc override static func requiresMainQueueSetup() -> Bool { return true }

  // MARK: - Toolbar Management

  private func createToolbar() -> UIToolbar {
    let toolbar = UIToolbar(frame: CGRect(x: 0, y: 0, width: UIScreen.main.bounds.width, height: 44))
    toolbar.barStyle = .default
    toolbar.sizeToFit()

    let button = UIButton(type: .system)
    button.setImage(UIImage(systemName: "mic.fill"), for: .normal)
    button.tintColor = UIColor.systemBlue
    button.frame = CGRect(x: 0, y: 0, width: 44, height: 44)
    button.addTarget(self, action: #selector(micButtonTapped), for: .touchUpInside)
    self.micIconButton = button

    let barButton = UIBarButtonItem(customView: button)
    self.micButton = barButton

    let flex = UIBarButtonItem(barButtonSystemItem: .flexibleSpace, target: nil, action: nil)
    toolbar.items = [barButton, flex]

    return toolbar
  }

  @objc private func micButtonTapped() {
    NSLog("[SpeechTranscription] micButtonTapped, isRecording=%d, toolbar=%@, items=%d",
          isRecording,
          String(describing: micToolbar),
          micToolbar?.items?.count ?? 0)
    if isRecording {
      stopTranscription()
    } else {
      startTranscriptionFromToolbar()
    }
  }

  private func startTranscriptionFromToolbar() {
    if isRecording { return }

    requestPermissions { [weak self] granted, errorMessage in
      guard let self = self else { return }

      if !granted {
        DispatchQueue.main.async {
          if self.hasListeners {
            self.sendEvent(withName: "onTranscriptionError", body: ["message": errorMessage ?? "Permission denied"])
          }
        }
        return
      }

      DispatchQueue.main.async {
        self.startRecognitionInternal()
      }
    }
  }

  private func updateMicAppearance() {
    guard let button = micIconButton else { return }

    if isRecording {
      button.tintColor = UIColor.systemRed
      startBlinkAnimation()
    } else {
      button.tintColor = UIColor.systemBlue
      stopBlinkAnimation()
      button.alpha = 1.0
    }
  }

  private func startBlinkAnimation() {
    stopBlinkAnimation()
    guard let button = micIconButton else { return }
    // Animate only the button's imageView, keeping the button itself fully tappable
    blinkTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak button] _ in
      guard let imageView = button?.imageView else { return }
      UIView.animate(withDuration: 1.0) {
        imageView.alpha = imageView.alpha > 0.5 ? 0.3 : 1.0
      }
    }
  }

  private func stopBlinkAnimation() {
    blinkTimer?.invalidate()
    blinkTimer = nil
    micIconButton?.imageView?.alpha = 1.0
  }

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
  }

  @objc
  func attachToKeyboard() {
    DispatchQueue.main.async { [weak self] in
      guard let self = self else { return }

      guard let firstResponder = self.findFirstResponder() else {
        NSLog("[SpeechTranscription] attachToKeyboard: no first responder found")
        return
      }

      NSLog("[SpeechTranscription] attachToKeyboard: firstResponder type = %@", String(describing: type(of: firstResponder)))

      if self.micToolbar == nil {
        self.micToolbar = self.createToolbar()
      }

      // Try to set inputAccessoryView via common text input types and KVC fallback
      if let textField = firstResponder as? UITextField {
        textField.inputAccessoryView = self.micToolbar
        textField.reloadInputViews()
        NSLog("[SpeechTranscription] attached to UITextField, accessoryView=%@", String(describing: textField.inputAccessoryView))
      } else if let textView = firstResponder as? UITextView {
        textView.inputAccessoryView = self.micToolbar
        textView.reloadInputViews()
        NSLog("[SpeechTranscription] attached to UITextView, accessoryView=%@", String(describing: textView.inputAccessoryView))
      } else if let view = firstResponder as? UIView {
        // RN Fabric may use a wrapper; look for a UITextView child
        if let textView = self.findTextView(in: view) {
          NSLog("[SpeechTranscription] attachToKeyboard: found child UITextView in %@", String(describing: type(of: view)))
          textView.inputAccessoryView = self.micToolbar
          textView.reloadInputViews()
        } else {
          NSLog("[SpeechTranscription] attachToKeyboard: no UITextView found in view hierarchy")
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

      if self.isRecording {
        self.stopTranscription()
      }

      self.stopBlinkAnimation()

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
    DispatchQueue.main.async { [weak self] in
      self?.updateMicAppearance()
    }
    if hasListeners {
      sendEvent(withName: "onTranscriptionEnd", body: [:])
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

  /// Called from the native toolbar button tap (no promise)
  private func startRecognitionInternal() {
    guard let speechRecognizer = speechRecognizer, speechRecognizer.isAvailable else {
      if hasListeners {
        sendEvent(withName: "onTranscriptionError", body: ["message": "Speech recognizer not available"])
      }
      return
    }

    let audioSession = AVAudioSession.sharedInstance()
    if audioSession.isOtherAudioPlaying {
      if hasListeners {
        sendEvent(withName: "onTranscriptionError", body: ["message": "Another audio session is active"])
      }
      return
    }

    stopRecognitionInternal()

    // Play start sound BEFORE switching audio session to record mode
    // Use completion handler to ensure sound finishes first
    AudioServicesPlaySystemSoundWithCompletion(1110) { [weak self] in
      DispatchQueue.main.async {
        self?.continueStartRecognition()
      }
    }
  }

  private func continueStartRecognition() {
    guard let speechRecognizer = speechRecognizer else { return }

    let audioSession = AVAudioSession.sharedInstance()
    do {
      try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
      try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
    } catch {
      if hasListeners {
        sendEvent(withName: "onTranscriptionError", body: ["message": "Audio session error: \(error.localizedDescription)"])
      }
      return
    }

    recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
    guard let recognitionRequest = recognitionRequest else { return }

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
          DispatchQueue.main.async {
            self.updateMicAppearance()
          }
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
          DispatchQueue.main.async {
            self.updateMicAppearance()
          }
          if self.hasListeners {
            self.sendEvent(withName: "onTranscriptionEnd", body: [:])
          }
        }
      }
    }

    let inputNode = audioEngine.inputNode
    let recordingFormat = inputNode.outputFormat(forBus: 0)
    inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { [weak self] buffer, _ in
      self?.recognitionRequest?.append(buffer)
    }

    do {
      audioEngine.prepare()
      try audioEngine.start()
      isRecording = true
      startSilenceTimer()
      updateMicAppearance()
      if hasListeners {
        sendEvent(withName: "onTranscriptionStart", body: [:])
      }
    } catch {
      if hasListeners {
        sendEvent(withName: "onTranscriptionError", body: ["message": "Audio engine error: \(error.localizedDescription)"])
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
          DispatchQueue.main.async {
            self.updateMicAppearance()
          }
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
          DispatchQueue.main.async {
            self.updateMicAppearance()
          }
          if self.hasListeners {
            self.sendEvent(withName: "onTranscriptionEnd", body: [:])
          }
        }
      }
    }

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
      updateMicAppearance()
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
      DispatchQueue.main.async {
        self.updateMicAppearance()
      }
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
