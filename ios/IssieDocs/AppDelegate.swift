import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?
  
  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?
  
  
  
  
  func application(
     _ application: UIApplication,
     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
   ) -> Bool {
     let delegate = ReactNativeDelegate()
     let factory = RCTReactNativeFactory(delegate: delegate)
     delegate.dependencyProvider = RCTAppDependencyProvider()

     reactNativeDelegate = delegate
     reactNativeFactory = factory

     window = UIWindow(frame: UIScreen.main.bounds)

     let launchTime = Date().timeIntervalSince1970 * 1000 // ms

     // Extract and prepare initial URL if exists
     var initialProps: [AnyHashable: Any] = ["nativeStartTime": launchTime]
     if let url = launchOptions?[.url] as? URL,
        let tempURL = securelyCopyToTemp(url: url) {
       initialProps["url"] = tempURL.absoluteString
     }

     factory.startReactNative(
       withModuleName: "IssieDocs",
       in: window,
       initialProperties: initialProps,
       launchOptions: launchOptions
     )

     RNSplashScreen.show()
     return true
   }
  
  
  func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
      guard let tempURL = securelyCopyToTemp(url: url) else { return false }
      return RCTLinkingManager.application(app, open: tempURL, options: options)
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

