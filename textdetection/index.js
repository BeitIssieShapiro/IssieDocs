import { NativeModules } from 'react-native'

const { TextDetectionPlugin } = NativeModules;


export function detectTexts(filePath, language, confidenceThreashold, callback) {

  console.log("detectTexts from ocr",TextDetectionPlugin?"ready":"fail" )
  TextDetectionPlugin.detectTextsInImage(filePath, language, confidenceThreashold, callback);
}
