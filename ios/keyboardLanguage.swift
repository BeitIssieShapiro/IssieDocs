import Foundation
import UIKit
import React

@objc(KeyboardLanguage)
class KeyboardLanguage: RCTEventEmitter {

  private var hasListeners = false

  override init() {
    super.init()
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(inputModeDidChange),
      name: UITextInputMode.currentInputModeDidChangeNotification,
      object: nil
    )
  }

  deinit {
    NotificationCenter.default.removeObserver(self)
  }

  @objc func inputModeDidChange(_ notification: Notification) {
    guard hasListeners else { return }

    // 1. Try to get language from the notification object
    if let mode = notification.object as? UITextInputMode, let lang = mode.primaryLanguage {
        sendEvent(withName: "keyboardLanguageDidChange", body: lang)
        return
    }

    // 2. Fallback: Find the active text field (Strategy B)
    DispatchQueue.main.async { [weak self] in
        guard let self = self else { return }
        
        if let firstResponder = self.findFirstResponder(),
           let mode = firstResponder.textInputMode,
           let lang = mode.primaryLanguage {
            self.sendEvent(withName: "keyboardLanguageDidChange", body: lang)
        }
    }
  }

  @objc
  func getCurrentLanguage(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async { [weak self] in
      // Try active field first, otherwise default to system preference
      if let firstResponder = self?.findFirstResponder(),
         let mode = firstResponder.textInputMode,
         let lang = mode.primaryLanguage {
        resolve(lang)
      } else {
        resolve(UITextInputMode.activeInputModes.first?.primaryLanguage ?? "unknown")
      }
    }
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

  override func startObserving() { hasListeners = true }
  override func stopObserving() { hasListeners = false }
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
