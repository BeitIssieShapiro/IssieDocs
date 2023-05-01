import { NativeModules } from 'react-native'

const OCR4iOS = NativeModules.OCR4iOS;
const TextDetector = NativeModules.TextDetector;

export function detectTextsInImage(filePath, language, confidenceThreashold, callback, errCallback) {

  //OCR4iOS.detectTextInBackgroundImage(filePath, language, callback);
  console.log("detectTextsInImage from ocr",TextDetector?"ready":"fail" )
  TextDetector.detectTextsInImage(filePath, language, confidenceThreashold, callback, errCallback);
}
