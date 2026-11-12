import UIKit
import RNFBAppCheck
import FirebaseCore
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import Firebase

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?
  
  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?
  private var launchTime: Double = 0
  
  
  
  
  func application(
     _ application: UIApplication,
     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
   ) -> Bool {
     // Firebase initialization
     RNFBAppCheckModule.sharedInstance()
     FirebaseApp.configure()
     
     let delegate = ReactNativeDelegate()
     let factory = RCTReactNativeFactory(delegate: delegate)
     delegate.dependencyProvider = RCTAppDependencyProvider()

     reactNativeDelegate = delegate
     reactNativeFactory = factory

     launchTime = Date().timeIntervalSince1970 * 1000 // ms
     return true
   }

  // Called by SceneDelegate: UIKit in the iOS 27 SDK requires the scene lifecycle, so the window
  // and any launch URL only become available once the scene connects.
  func startReactNative(in window: UIWindow, launchURL: URL?) {
     self.window = window

     // Extract and prepare initial URL if exists
     var initialProps: [AnyHashable: Any] = ["nativeStartTime": launchTime]
     if let url = launchURL,
        let tempURL = securelyCopyToTemp(url: url) {
       initialProps["url"] = tempURL.absoluteString
     }

     reactNativeFactory?.startReactNative(
       withModuleName: "IssieDocs",
       in: window,
       initialProperties: initialProps,
       launchOptions: nil
     )

     RNSplashScreen.show()
   }

  func open(url: URL) {
      guard let tempURL = securelyCopyToTemp(url: url) else { return }
      RCTLinkingManager.application(UIApplication.shared, open: tempURL, options: [:])
    }

  private func securelyCopyToTemp(url: URL) -> URL? {
    let hasAccess = url.startAccessingSecurityScopedResource()
    defer {
      if hasAccess {
        url.stopAccessingSecurityScopedResource()
      }
    }

    do {
      let fileName = url.lastPathComponent.removingPercentEncoding ?? url.lastPathComponent
      let sanitizedFileName = fileName.replacingOccurrences(of: "/", with: "-")
      let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(sanitizedFileName)

      if FileManager.default.fileExists(atPath: tempURL.path) {
        try FileManager.default.removeItem(at: tempURL)
      }

      try FileManager.default.copyItem(at: url, to: tempURL)
      print("✅ File copied to temp: \(tempURL.path)")
      return tempURL
    } catch {
      print("❌ Error copying file to temp: \(error)")
      return nil
    }
  }
  
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.startReactNative(in: window, launchURL: connectionOptions.urlContexts.first?.url)
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let url = URLContexts.first?.url,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }
    appDelegate.open(url: url)
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}

