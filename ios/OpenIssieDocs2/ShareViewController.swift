////
////  ShareViewController.swift
////  OpenIssieDocs2
////
////  Created by Bentolila, Ariel on 06/04/2023.
////
//
//import UIKit
//import Social
//
//class ShareViewController: UIViewController {
//  @objc func openURL(_ url: URL) -> Bool {
//      var responder: UIResponder? = self
//      while responder != nil {
//          if let application = responder as? UIApplication {
//              return application.perform(#selector(openURL(_:)), with: url) != nil
//          }
//          responder = responder?.next
//      }
//      return false
//  }
//
//  var docPath = ""
//  var filePath = ""
//  
//  override func viewDidLoad() {
//      super.viewDidLoad()
//
//      let containerURL = FileManager().containerURL(forSecurityApplicationGroupIdentifier: "group.com.issieshapiro.issiedocs")!
//      docPath = "\(containerURL.path)/share"
//      
//      //  Create directory if not exists
//      do {
//          try FileManager.default.createDirectory(atPath: docPath, withIntermediateDirectories: true, attributes: nil)
//      } catch let error as NSError {
//          print("Could not create the directory \(error)")
//      } catch {
//          fatalError()
//      }
//
//      //  removing previous stored files
//      let files = try! FileManager.default.contentsOfDirectory(atPath: docPath)
//      for file in files {
//          try? FileManager.default.removeItem(at: URL(fileURLWithPath: "\(docPath)/\(file)"))
//      }
//  }
//  
////    // Get the first image from the NSExtensionContext attachments
////    let contentType = "public.url"; //kUTTypeImage as String
////
////    let extensionItems = extensionContext?.inputItems as! [NSExtensionItem]
////  outer:
////    for extensionItem in extensionItems {
////      let attachments = extensionItem.attachments!
////      for attachment in attachments {
////        if attachment.hasItemConformingToTypeIdentifier(contentType) {
////          attachment.loadItem(forTypeIdentifier: contentType, options: nil) { data, error in
////            if let url = data as? URL {
////              self.docPath = url.absoluteString
////            }
////          }
////          break outer
////        }
////      }
////    }
//    
//  private func tryOpenURL(_ url: URL) {
//    var responder: UIResponder? = self
//    while let r = responder {
//        if let application = r as? UIApplication {
//            // Attempt the older "perform" call
//            let selector = NSSelectorFromString("openURL:")
//            if application.responds(to: selector) {
//                application.perform(selector, with: url)
//            }
//            break
//        }
//        responder = r.next
//    }
//  }
//  
//  
//  override func viewDidAppear(_ animated: Bool) {
//    let group = DispatchGroup()
//    
//  outer:
//    for item: Any in self.extensionContext!.inputItems {
//      
//      let inputItem = item as! NSExtensionItem
//      
//      for provider: Any in inputItem.attachments! {
//        let itemProvider = provider as! NSItemProvider
//        var typeIdentifier = ""
//        if (itemProvider.hasRepresentationConforming(toTypeIdentifier:"public.image")) {
//          typeIdentifier = "public.image"
//        } else if (itemProvider.hasRepresentationConforming(toTypeIdentifier:"public.url")) {
//          typeIdentifier = "public.url"
//        } else if (itemProvider.hasRepresentationConforming(toTypeIdentifier:"com.adobe.pdf")) {
//          typeIdentifier = "com.adobe.pdf"
//        }
//        
//        if (typeIdentifier.count > 0) {
//          group.enter()
//          
//          itemProvider.loadItem(forTypeIdentifier: typeIdentifier, options: nil) { data, error in
//            if error == nil {
//              self.saveData(data:data as! NSItemProviderReading)
//            } else {
//              NSLog("\(String(describing: error))")
//            }
//            group.leave()
//          }
//          break outer
//        }
//      }
//    }
//      
//    group.notify(queue: DispatchQueue.main) {
//      // Attempt to open the main app before calling completeRequest
//              if !self.filePath.isEmpty,
//                 let encodedFilePath = self.filePath.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
//                 let appURL = URL(string: "openissiedocs://share?url=\(encodedFilePath)") {
//                 
//                  // Attempt to open via responder chain
//                  self.tryOpenURL(appURL)
//              }
//
//              // Now complete request
//              self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
//      }
//    }
//  
//
//  
//  
//  func saveData(data:NSItemProviderReading) {
//    let url = data as! URL
//    self.filePath = "\(self.docPath)/\(url.pathComponents.last ?? "")"
//    if (url.scheme?.hasPrefix("http") == true) {
//      let task = URLSession.shared.downloadTask(with: url) { (tempURL, response, error) in
//        if let error = error {
//          print("Error downloading file: \(error)")
//          return
//        }
//        
//        guard let tempURL = tempURL else {
//          print("Error saving file")
//          return
//        }
//        
//        do {
//          try FileManager.default.copyItem(at: tempURL, to: URL(fileURLWithPath: self.filePath))
//          print("File downloaded successfully")
//        } catch let error {
//          print("Error saving file: \(error)")
//        }
//      }
//      
//      task.resume()
//    } else {
//      do {
//        try FileManager.default.copyItem(at: url, to: URL(fileURLWithPath: self.filePath))
//        print("File copied successfully")
//      } catch let error {
//        print("Error saving file: \(error)")
//      }
//    }
//  }
//  
//}
import UIKit

class ShareViewController: UIViewController {
    
   @objc func openURL(_ url: URL) -> Bool {
       var responder: UIResponder? = self
       while responder != nil {
           if let application = responder as? UIApplication {
               return application.perform(#selector(openURL(_:)), with: url) != nil
           }
           responder = responder?.next
       }
       return false
   }
  
    // MARK: - View Lifecycle
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        view.backgroundColor = .systemBackground  // or .clear if you want a transparent background

        // -- Example UI: A single "Approve" button in the center --
//        let approveButton = UIButton(type: .system)
//        approveButton.setTitle("Approve", for: .normal)
//        approveButton.titleLabel?.font = UIFont.boldSystemFont(ofSize: 18)
//        approveButton.addTarget(self, action: #selector(onApproveTapped), for: .touchUpInside)
//        
//        approveButton.translatesAutoresizingMaskIntoConstraints = false
//        view.addSubview(approveButton)
//        
//        NSLayoutConstraint.activate([
//            approveButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
//            approveButton.centerYAnchor.constraint(equalTo: view.centerYAnchor)
//        ])
//        
        // If you want to skip the button entirely and process right away:
         handleSharedItems()
         openMainAppIfPossible()
         self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
    }
    
    // MARK: - Action Handlers
    
//    @objc private func onApproveTapped() {
//        // Process the incoming share items
//        handleSharedItems()
//        
//        // If you absolutely must attempt opening your main app (not recommended):
//        // openMainAppIfPossible()
//        
//        // Dismiss the share extension
//        self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
//    }
    
    // MARK: - Handle Shared Items
    
    private func handleSharedItems() {
        guard let extensionItems = extensionContext?.inputItems as? [NSExtensionItem] else { return }
        
        for item in extensionItems {
            if let attachments = item.attachments {
                for provider in attachments {
                    // Check for PDFs or other UTIs you want to handle
                    if provider.hasItemConformingToTypeIdentifier("com.adobe.pdf") {
                        provider.loadItem(forTypeIdentifier: "com.adobe.pdf", options: nil) { (data, error) in
                            if let error = error {
                                print("Error loading PDF: \(error)")
                                return
                            }
                            if let url = data as? URL {
                                // Save or copy the file
                                self.saveFileToAppGroup(fileURL: url)
                            }
                        }
                        // If you only expect one item, you can return after the first
                    }
                    // else if provider.hasItemConformingToTypeIdentifier("public.image") { ... }
                    // else if provider.hasItemConformingToTypeIdentifier("public.url")   { ... }
                }
            }
        }
    }
    
    // MARK: - Save to App Group (Optional Example)
    
    private func saveFileToAppGroup(fileURL: URL) {
        // Example of storing in an App Group container:
        let appGroupID = "group.com.yourcompany.yourapp"
        guard let containerURL = FileManager.default
            .containerURL(forSecurityApplicationGroupIdentifier: appGroupID) else {
            print("Unable to access App Group folder.")
            return
        }
        
        let shareDirectory = containerURL.appendingPathComponent("share", isDirectory: true)
        
        // Create the directory if needed
        do {
            try FileManager.default.createDirectory(at: shareDirectory,
                                                    withIntermediateDirectories: true,
                                                    attributes: nil)
        } catch {
            print("Error creating directory: \(error)")
        }
        
        // Copy the file into the share folder
        let destinationURL = shareDirectory.appendingPathComponent(fileURL.lastPathComponent)
        
        // Remove old file if exists
        try? FileManager.default.removeItem(at: destinationURL)
        
        do {
            try FileManager.default.copyItem(at: fileURL, to: destinationURL)
            print("File copied to: \(destinationURL)")
        } catch {
            print("Error copying shared file: \(error)")
        }
        
        // You might set a flag in shared UserDefaults to notify the main app
        let sharedDefaults = UserDefaults(suiteName: appGroupID)
        sharedDefaults?.set(true, forKey: "hasNewShare")
        sharedDefaults?.synchronize()
    }
    
    // MARK: - (Optional) Attempt to Open Main App
    
    private func openMainAppIfPossible() {
        // This is strongly discouraged by Apple; may be blocked or lead to rejection.
        guard let url = URL(string: "openissiedocs://share?url=something") else { return }
        openURL(url)
      
//        // Attempt the old "responder chain" hack
//        var responder: UIResponder? = self
//        while let r = responder {
//          if([r respondsToSelector:@selector(openURL:)] == YES)
//                  {
//                      [responder performSelector:@selector(openURL:) withObject:[NSURL URLWithString:urlString]];
//                  }
//          
//          
//            if let application = r as? UIApplication {
//                // 'openURL:' is deprecated; might be ignored on modern iOS.
//                application.perform(Selector(("openURL:")), with: url)
//                break
//            }
//            responder = r.next
//        }
    }
  
  
}
