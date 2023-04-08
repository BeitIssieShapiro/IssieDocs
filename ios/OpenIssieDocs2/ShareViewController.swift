//
//  ShareViewController.swift
//  OpenIssieDocs2
//
//  Created by Bentolila, Ariel on 06/04/2023.
//

import UIKit
import Social

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

  var docPath = ""
  var filePath = ""
  
  override func viewDidLoad() {
      super.viewDidLoad()

      let containerURL = FileManager().containerURL(forSecurityApplicationGroupIdentifier: "group.com.issieshapiro.issiedocs")!
      docPath = "\(containerURL.path)/share"
      
      //  Create directory if not exists
      do {
          try FileManager.default.createDirectory(atPath: docPath, withIntermediateDirectories: true, attributes: nil)
      } catch let error as NSError {
          print("Could not create the directory \(error)")
      } catch {
          fatalError()
      }

      //  removing previous stored files
      let files = try! FileManager.default.contentsOfDirectory(atPath: docPath)
      for file in files {
          try? FileManager.default.removeItem(at: URL(fileURLWithPath: "\(docPath)/\(file)"))
      }
  }
  
//    // Get the first image from the NSExtensionContext attachments
//    let contentType = "public.url"; //kUTTypeImage as String
//
//    let extensionItems = extensionContext?.inputItems as! [NSExtensionItem]
//  outer:
//    for extensionItem in extensionItems {
//      let attachments = extensionItem.attachments!
//      for attachment in attachments {
//        if attachment.hasItemConformingToTypeIdentifier(contentType) {
//          attachment.loadItem(forTypeIdentifier: contentType, options: nil) { data, error in
//            if let url = data as? URL {
//              self.docPath = url.absoluteString
//            }
//          }
//          break outer
//        }
//      }
//    }
    
  override func viewDidAppear(_ animated: Bool) {
    let group = DispatchGroup()
    
  outer:
    for item: Any in self.extensionContext!.inputItems {
      
      let inputItem = item as! NSExtensionItem
      
      for provider: Any in inputItem.attachments! {
        let itemProvider = provider as! NSItemProvider
        var typeIdentifier = ""
        if (itemProvider.hasRepresentationConforming(toTypeIdentifier:"public.image")) {
          typeIdentifier = "public.image"
        } else if (itemProvider.hasRepresentationConforming(toTypeIdentifier:"public.url")) {
          typeIdentifier = "public.url"
        } else if (itemProvider.hasRepresentationConforming(toTypeIdentifier:"com.adobe.pdf")) {
          typeIdentifier = "com.adobe.pdf"
        }
        
        if (typeIdentifier.count > 0) {
          group.enter()
          
          itemProvider.loadItem(forTypeIdentifier: typeIdentifier, options: nil) { data, error in
            if error == nil {
              self.saveData(data:data as! NSItemProviderReading)
            } else {
              NSLog("\(String(describing: error))")
            }
            group.leave()
          }
          break outer
        }
      }
    }
      
    group.notify(queue: DispatchQueue.main) {
      self.dismiss(animated: false) {
        if (self.filePath.count > 0) {
          if let encodedFilePath = self.filePath.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) {
            
            let url = URL(string: "openissiedocs://share?url=" + encodedFilePath)
            if (url != nil) {
              self.openURL(url!)
            }
          }
        }

        self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
      }
    }
  }
  
  
  func saveData(data:NSItemProviderReading) {
    let url = data as! URL
    self.filePath = "\(self.docPath)/\(url.pathComponents.last ?? "")"
    if (url.scheme?.hasPrefix("http") == true) {
      let task = URLSession.shared.downloadTask(with: url) { (tempURL, response, error) in
        if let error = error {
          print("Error downloading file: \(error)")
          return
        }
        
        guard let tempURL = tempURL else {
          print("Error saving file")
          return
        }
        
        do {
          try FileManager.default.copyItem(at: tempURL, to: URL(fileURLWithPath: self.filePath))
          print("File downloaded successfully")
        } catch let error {
          print("Error saving file: \(error)")
        }
      }
      
      task.resume()
    } else {
      do {
        try FileManager.default.copyItem(at: url, to: URL(fileURLWithPath: self.filePath))
        print("File copied successfully")
      } catch let error {
        print("Error saving file: \(error)")
      }
    }
  }
  
}
