//import Foundation
//import SwiftUI
//
//import libleptonica
//import libtesseract
//
//struct RecognizedRectangle: Equatable {
//    let id = UUID()
//    public var text: String
//    public var boundingBox: CGRect
//    public var confidence: Float
//}
//
//@objc(TextDetector)
//class TextDetector: NSObject {
//    @objc static func requiresMainQueueSetup() -> Bool { return true }
//
//    
//    public private(set) var recognizedRects: [RecognizedRectangle]
//
//    private var tessAPI: OpaquePointer
//    //private var tessPIL: TessPageIteratorLevel
//
//    /// Creates an object for reognizing text in images
//    /// - Parameters:
//    ///     - imgName: Assett name of the image to scan
//    ///     - trainedDataName: The name portion of the trained data file to use, e.g.:
//    ///         pass in `jpn_vert` for the file `jpn_vert.traineddata`.
//    ///     - imgDPI: The image's DPI, default is `72`.
//    ///     - tessPSM: A TessPageSegMode that affects how Tesseract treats/parses the image as a whole.
//    ///         Many valid values, check Tesseract documentation; default is `PSM_AUTO`.
//    ///     - tessPIL: A TessPageIteratorLevel that sets the scope/size of the objects you want recognized.
//    ///         Valid values are: `RIL_BLOCK`, `RIL_PARA`, `RIL_TEXTLINE` (default), `RIL_WORD`, `RIL_SYMBOL`.
//    override init(
////        imgName: String,
////        trainedDataName: String,  // chi_tra, eng, jpn_vert
////        imgDPI: Int32=72,
////        tessPSM: TessPageSegMode=PSM_AUTO,
////        tessPIL: TessPageIteratorLevel=RIL_TEXTLINE
//) {
//        self.recognizedRects = []
//        //self.tessPIL = tessPIL
//        self.tessAPI = TessBaseAPICreate()!
//        
//    }
//    
//    deinit {
//        TessBaseAPIEnd(self.tessAPI)
//        TessBaseAPIDelete(self.tessAPI)
//    }
//
//    /// Get back all recognized text in the entire image, hopefully.  If no text is recognized, get back ** No Text Found! **
////    public func getAllText() -> String {
////        let charPtr: UnsafeMutablePointer<Int8>? = TessBaseAPIGetUTF8Text(self.tessAPI)
////        defer { TessDeleteText(charPtr) }
////
////        if let nncharPtr = charPtr {
////            return String(cString: nncharPtr)
////        } else {
////            return "** No Text Found! **"
////        }
////    }
//
//    /// Get back all recognized objects for the set `tessPIL`
//  @objc public func detectTextsInImage(_ filePath: String, _ language: String, _ confidenceThreashold: NSNumber!, _ callback: RCTResponseSenderBlock, _ errCallback: RCTResponseSenderBlock )-> Void {
//      let trainedDataFolder = Bundle.main.path(forResource: "tessdata", ofType: nil)
//      TessBaseAPIInit2(self.tessAPI, trainedDataFolder, language, OEM_LSTM_ONLY)
//      //let testFile = (trainedDataFolder ?? "")+"/test.jpeg"
//      let uiImg = UIImage(named: filePath)!
//      //var image = pixReadWithHint(filePath, "jpeg")
//      var image = getImage(from: uiImg)
//      if (image == nil) {
//        errCallback(["Image not found"]);
//        return
//      }
//      defer { pixDestroy(&image) }
//
//      TessBaseAPISetImage2(self.tessAPI, image)
////        TessBaseAPISetSourceResolution(self.tessAPI, imgDPI)
//    
//      TessBaseAPISetPageSegMode(self.tessAPI, PSM_SPARSE_TEXT)
//
//      TessBaseAPIRecognize(self.tessAPI, nil)
//
//        guard let iterator = TessBaseAPIGetIterator(self.tessAPI) else {
//          callback([])
//          return
//          
//        }
//        defer { TessPageIteratorDelete(iterator)}
//        
//        var results = [NSDictionary]()
//
//        repeat {
//            // Text
//            let charPtr: UnsafeMutablePointer<Int8>?
//            charPtr = TessResultIteratorGetUTF8Text(iterator, RIL_TEXTLINE)!
//            let textNotTrimmed = String(cString: charPtr!)
//            TessDeleteText(charPtr)
//          let text = textNotTrimmed.trimmingCharacters(in: .whitespacesAndNewlines)
//          if (text.count > 0) {
//            var x1: Int32 = 0
//            var y1: Int32 = 0
//            var x2: Int32 = 0
//            var y2: Int32 = 0
//            TessPageIteratorBoundingBox(iterator, RIL_TEXTLINE, &x1, &y1, &x2, &y2)
//            
//            let width = x2 - x1
//            let height = y2 - y1
//            let cgRect = CGRect(x: CGFloat(x1), y: CGFloat(y1), width: CGFloat(width), height: CGFloat(height))
//            
//            // Confidence
//            let confidence = TessResultIteratorConfidence(iterator, RIL_TEXTLINE)
//            
//            // -> RecognizedRectangle
//            if (confidence >= Float(confidenceThreashold)) {
//                let rect = ["x": x1, "y": y1, "width": width, "height": height] as NSDictionary
//                
//                let result = ["text": text, "rect": rect] as NSDictionary
//                results.append(result)
//
//            }
//          }
//        } while (TessPageIteratorNext(iterator, RIL_TEXTLINE) > 0)
//        
//      
//      callback( [results])
//    }
//    
//    public func setDPI(imgDPI: Int32) {
//        TessBaseAPISetSourceResolution(self.tessAPI, imgDPI)
//    }
//}
//
///// Convert UIImage to format/structure that Leptonica and Tesseract deal with
//public func getImage(from image: UIImage) -> UnsafeMutablePointer<PIX>? {
//    let data = image.pngData()!
//    let rawPointer = (data as NSData).bytes
//    let uint8Pointer = rawPointer.assumingMemoryBound(to: UInt8.self)
//    return pixReadMem(uint8Pointer, data.count)
//}
//
//    
//    
//
