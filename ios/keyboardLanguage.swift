import Foundation
import UIKit
import React

@objc(KeyboardLanguage)
class KeyboardLanguage: RCTEventEmitter {

  private var hasListeners = false
  private var lastKnownLanguage: String?
  private var pendingLanguage: String?
  private var debounceWorkItem: DispatchWorkItem?

  override init() {
    super.init()
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(inputModeDidChange),
      name: UITextInputMode.currentInputModeDidChangeNotification,
      object: nil
    )
    // Also listen for keyboard appearing — catches the initial open where
    // inputModeDidChange doesn't fire (keyboard didn't switch, it's the default)
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(keyboardDidShow),
      name: UIResponder.keyboardDidShowNotification,
      object: nil
    )
  }

  deinit {
    NotificationCenter.default.removeObserver(self)
  }

  @objc func inputModeDidChange(_ notification: Notification) {
    // Extract language from notification or first responder
    var detectedLang: String?

    if let mode = notification.object as? UITextInputMode, let lang = mode.primaryLanguage {
      detectedLang = lang
      NSLog("[KBLang] notification.object lang: %@", lang)
    } else {
      NSLog("[KBLang] notification.object is nil or not UITextInputMode (object: %@)", String(describing: notification.object))
    }

    // Debounce: wait 150ms before emitting, to filter out spurious notifications
    // from reloadInputViews() and let the keyboard state settle
    debounceWorkItem?.cancel()
    let workItem = DispatchWorkItem { [weak self] in
      guard let self = self else { return }

      let lang: String
      if let detected = detectedLang {
        lang = detected
        NSLog("[KBLang] debounce: using notification lang: %@", lang)
      } else if let firstResponder = self.findFirstResponder(),
                let mode = firstResponder.textInputMode,
                let frLang = mode.primaryLanguage {
        lang = frLang
        NSLog("[KBLang] debounce: using firstResponder lang: %@, responder: %@", lang, String(describing: type(of: firstResponder)))
      } else {
        NSLog("[KBLang] debounce: no lang found (firstResponder: %@, textInputMode: %@)",
              String(describing: self.findFirstResponder()),
              String(describing: self.findFirstResponder()?.textInputMode))
        return
      }

      NSLog("[KBLang] debounce: lastKnown=%@, new=%@, hasListeners=%d",
            self.lastKnownLanguage ?? "nil", lang, self.hasListeners)

      // Only emit/store if language actually changed
      if lang != self.lastKnownLanguage {
        self.lastKnownLanguage = lang
        if self.hasListeners {
          NSLog("[KBLang] EMITTING language: %@", lang)
          self.sendEvent(withName: "keyboardLanguageDidChange", body: lang)
        } else {
          NSLog("[KBLang] QUEUING language (no listeners): %@", lang)
          // Store for emission when JS subscribes
          self.pendingLanguage = lang
        }
      } else {
        NSLog("[KBLang] debounce: same as lastKnown, skipping emit")
      }
    }
    debounceWorkItem = workItem
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.15, execute: workItem)
  }

  @objc func keyboardDidShow(_ notification: Notification) {
    // When keyboard appears, detect language from the first responder.
    // This catches the case where the keyboard opens for the first time
    // (no inputModeDidChange fires because it didn't switch).
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
      guard let self = self else { return }

      guard let firstResponder = self.findFirstResponder(),
            let mode = firstResponder.textInputMode,
            let lang = mode.primaryLanguage else {
        NSLog("[KBLang] keyboardDidShow: no firstResponder or textInputMode")
        return
      }

      NSLog("[KBLang] keyboardDidShow: detected lang=%@, lastKnown=%@, hasListeners=%d",
            lang, self.lastKnownLanguage ?? "nil", self.hasListeners)

      if lang != self.lastKnownLanguage {
        self.lastKnownLanguage = lang
        if self.hasListeners {
          NSLog("[KBLang] keyboardDidShow: EMITTING language: %@", lang)
          self.sendEvent(withName: "keyboardLanguageDidChange", body: lang)
        } else {
          self.pendingLanguage = lang
        }
      }
    }
  }

  @objc
  func getCurrentLanguage(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async { [weak self] in
      if let lang = self?.detectFromFirstResponder() {
        NSLog("[KBLang] getCurrentLanguage: from firstResponder: %@", lang)
        resolve(lang)
      } else if let lastKnown = self?.lastKnownLanguage {
        NSLog("[KBLang] getCurrentLanguage: from lastKnown: %@", lastKnown)
        resolve(lastKnown)
      } else {
        // No first responder yet (keyboard not open) — retry after a short delay
        // to avoid returning a wrong fallback that later gets corrected mid-scroll
        NSLog("[KBLang] getCurrentLanguage: no firstResponder, retrying in 300ms")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in
          if let lang = self?.detectFromFirstResponder() {
            NSLog("[KBLang] getCurrentLanguage retry: from firstResponder: %@", lang)
            resolve(lang)
          } else if let lastKnown = self?.lastKnownLanguage {
            NSLog("[KBLang] getCurrentLanguage retry: from lastKnown: %@", lastKnown)
            resolve(lastKnown)
          } else {
            let fallback = UITextInputMode.activeInputModes.first?.primaryLanguage ?? "en"
            NSLog("[KBLang] getCurrentLanguage retry: fallback to activeInputModes.first: %@", fallback)
            resolve(fallback)
          }
        }
      }
    }
  }

  private func detectFromFirstResponder() -> String? {
    guard let firstResponder = findFirstResponder(),
          let mode = firstResponder.textInputMode,
          let lang = mode.primaryLanguage else { return nil }
    lastKnownLanguage = lang
    return lang
  }

  // --- Helpers ---

  func findFirstResponder() -> UIResponder? {
    return UIApplication.shared.connectedScenes
        .filter({$0.activationState == .foregroundActive})
        .compactMap({$0 as? UIWindowScene})
        .first?.windows
        .filter({$0.isKeyWindow}).first?
        .findFirstResponder()
        ?? UIApplication.shared.keyWindow?.findFirstResponder()
  }

  // --- React Native Boilerplate ---

  override func startObserving() {
    hasListeners = true
    NSLog("[KBLang] startObserving called")
    // Emit any language detected before JS subscribed
    if let pending = pendingLanguage {
      NSLog("[KBLang] startObserving: emitting pending language: %@", pending)
      pendingLanguage = nil
      sendEvent(withName: "keyboardLanguageDidChange", body: pending)
    }
  }
  override func stopObserving() {
    hasListeners = false
    NSLog("[KBLang] stopObserving called")
  }
  override func supportedEvents() -> [String]! { return ["keyboardLanguageDidChange"] }
  @objc override static func requiresMainQueueSetup() -> Bool { return true }
}

extension UIView {
    func findFirstResponder() -> UIResponder? {
        if self.isFirstResponder { return self }
        for subview in self.subviews {
            if let responder = subview.findFirstResponder() { return responder }
        }
        return nil
    }
}
