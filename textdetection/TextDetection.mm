#import "TextDetection.h"

#import <Vision/Vision.h>

#undef NO
#undef YES

#include <vector>
#include <map>
#include <algorithm>
#include <cmath>
#include <boost/algorithm/string/join.hpp>

#import "opencv2/opencv.hpp"
#import <tesseract/capi.h>


struct Word {
    std::string text;
    cv::Rect rect;
    
    Word(std::string t, cv::Rect r) : text(t), rect(r) {}
};

struct Paragraph {
    std::string text;
    cv::Rect rect;
    
    Paragraph(std::string t, cv::Rect r) : text(t), rect(r) {}
};


@implementation TextDetection

- (void) detectTexts:(NSString *)filePath language:(NSString *)language confidenceThreshold:(NSNumber *)threshold callback:(RCTResponseSenderBlock)callback {
  
  NSURL *imageURL = [NSURL fileURLWithPath:filePath];
  CIImage * image = getImage(imageURL);
  
  
  CGSize imageSize = image.extent.size;
  
  VNImageRequestHandler *handler = [[VNImageRequestHandler alloc] initWithCIImage:image options:@{}];
  
  VNRecognizeTextRequest *request = [[VNRecognizeTextRequest alloc] initWithCompletionHandler:^(VNRequest * _Nonnull request, NSError * _Nullable error) {
    if (error) {
      NSLog(@"Error: %@", error);
    } else {
      NSMutableArray *boundingBoxes = [[NSMutableArray alloc] init];
      
      cv::Mat cvImage;
      //for debug:
      cv::Mat debugMat;
      bool isFirst = true;
      bool useTesserct = ![language isEqualToString:@"eng"];
      
      if (useTesserct) {
        std::string path = [filePath UTF8String];
        cvImage = cv::imread(path);
      }
      
      for (VNRecognizedTextObservation *observation in request.results) {
        VNRecognizedText *topCandidate = [[observation topCandidates:1] firstObject];
        if (topCandidate) {
          NSLog(@"Found text: %@", topCandidate.string);
          NSLog(@"Confidence: %f", topCandidate.confidence);
          NSLog(@"Bounding box: %@", NSStringFromCGRect(observation.boundingBox));
          
          NSString *text = topCandidate.string;
          CGRect boundingBox = observation.boundingBox;
          CGRect rect = CGRectMake(boundingBox.origin.x * imageSize.width,(1 - (boundingBox.origin.y + boundingBox.size.height)) * imageSize.height,boundingBox.size.width * imageSize.width,boundingBox.size.height * imageSize.height);
          if (useTesserct) {
            text = getTesseractText(cvImage, rect, language, debugMat, isFirst);
            isFirst = false;
          }
          
          NSMutableDictionary *elem = [NSMutableDictionary dictionary];
          [elem setObject:@{
            @"x": @(rect.origin.x),
            @"y": @(rect.origin.y),
            @"width": @(rect.size.width),
            @"height": @(rect.size.height)
          } forKey:@"rect"];
          
          [elem setObject:text forKey:@"text"];
          
          [boundingBoxes addObject:elem];
          
          
        }
      }
      
      #ifdef DEBUG
      if (useTesserct && !isFirst) {
        cv::imwrite("/tmp/debug.png", debugMat);
      }
      #endif
      // Return the bounding boxes
      callback(@[boundingBoxes]);
    }
    
  }];
  
  //request.recognitionLevel = VNRequestTrackingLevelAccurate;  // Use accurate for more precise results, but it's slower.
  request.usesLanguageCorrection = (BOOL)0;  // You may want to set this to false to avoid modifying the recognized text.
  request.recognitionLanguages = @[ @"he"];
  
  NSError *performError = nil;
  [handler performRequests:@[request] error:&performError];
  if (performError) {
    NSLog(@"Failed to perform text recognition: %@", performError);
  }
}
  
CIImage * getImage(NSURL * imageURL) {
  CGImageSourceRef source = CGImageSourceCreateWithURL((CFURLRef)imageURL, NULL);
  NSDictionary *metadata = (__bridge NSDictionary *) CGImageSourceCopyPropertiesAtIndex(source, 0, NULL);
  CFRelease(source);
  
  NSDictionary *tiffDict = [metadata objectForKey:(NSString *)kCGImagePropertyTIFFDictionary];
  int orientationValue = [[tiffDict objectForKey:(NSString *)kCGImagePropertyOrientation] intValue];
  
  
  // rotate if needed
  // Create the rotation transform. The argument is in radians.
  CGFloat angleInRadians;
  
  switch (orientationValue) {
    case 1:
      angleInRadians = 0.0;
      break;
    case 3:
      angleInRadians  = 180.0;
      break;
    case 6:
      angleInRadians = -90.0;
      break;
    case 8:
      angleInRadians = 90.0;
      break;
    default:
      angleInRadians = 0.0;
      break;
  }
  
  angleInRadians = angleInRadians * (M_PI / 180);
  CIImage *image = [CIImage imageWithContentsOfURL:imageURL];
  
  if (angleInRadians != 0) {
    CGAffineTransform rotation = CGAffineTransformMakeRotation(angleInRadians);
    
    // Create the filter and apply it.
    CIFilter *affineTransformFilter = [CIFilter filterWithName:@"CIAffineTransform"];
    [affineTransformFilter setValue:image forKey:kCIInputImageKey];
    [affineTransformFilter setValue:[NSValue valueWithBytes:&rotation objCType:@encode(CGAffineTransform)] forKey:@"inputTransform"];
    
    image = [affineTransformFilter outputImage];
  }
  
  return image;
}

 
  
  
NSString * getTesseractText(cv::Mat cvImage, CGRect rect, NSString *language, cv::Mat &debugMat, bool first) {
  

  cv::Rect cvRect(rect.origin.x, rect.origin.y, rect.size.width, rect.size.height);

  // Crop the image
  cv::Mat cropped = cvImage(cvRect);
//  fourPointsTransform(cvImage, vertices, cropped);
  cv::Mat forOCR = prepareImageForOCR(cropped);
  
  int borderSize = 20;
  cv::copyMakeBorder(forOCR, forOCR, borderSize, borderSize, borderSize, borderSize, cv::BORDER_CONSTANT, cv::Scalar(255,255,255));
  
  cv::Mat forOCR_resized;
  cv::resize(forOCR, forOCR_resized, cv::Size(250,80));
#ifdef DEBUG
  
  if (first) {
    first = false;
    debugMat = forOCR_resized;
  } else {
    cv::Mat tempMat;
    cv::vconcat(debugMat, forOCR_resized, tempMat);  // Concatenate vertically.

    debugMat = tempMat;
  }
#endif
  NSString *dataPathNSTR = [[NSBundle mainBundle] pathForResource:@"tessdata" ofType:nil];
  std::string dataPath = [dataPathNSTR cStringUsingEncoding:NSASCIIStringEncoding];
  
  std::string lang = [language cStringUsingEncoding:NSASCIIStringEncoding];
  
  NSString *text = performOCROnCVImage(forOCR, dataPath, lang);
  if (text != nil && [text length] > 0) {
    text = [text stringByReplacingOccurrencesOfString:@"\n" withString:@""];
    text = [text stringByReplacingOccurrencesOfString:@"|" withString:@""];
    text = [text stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceCharacterSet]];
  } else {
    text = @"";
  }
  return text;
}
  
  
  //------------//
//    // Convert NSString to std::string
//    std::string path = [filePath UTF8String];
//
//    // Load the image
//    cv::Mat image = cv::imread(path);
//
//    int newWidth = (int)(image.cols / 32) * 32;
//    int newHeight = (int)(image.rows / 32) * 32;
//
//    cv::Point2f ratio((float)image.cols / newWidth, (float)image.rows / newHeight);
//
//    //cv::resize(image, image, cv::Size(newWidth, newHeight));
//
////    image.convertTo(image, CV_32FC3, 1 / 255.0);  // Convert the image from uint8 to float32 and scale values from 0-255 to 0-1
////    image = (image - 0.5) * 2;  // Shift from range 0-1 to -1 to 1
//
//    // Load pre-trained EAST model
//    NSString *modelPathNSTR = [[NSBundle mainBundle] pathForResource:@"tessdata/frozen_east_text_detection" ofType:@"pb"];
//    std::string modelPath = [modelPathNSTR cStringUsingEncoding:NSASCIIStringEncoding];
//
//    cv::dnn::Net net = cv::dnn::readNet(modelPath);
//
//    // Blob from the image
//    cv::Mat blob = cv::dnn::blobFromImage(image, 1.0, cv::Size(newWidth, newHeight), cv::Scalar(123.68, 116.78, 103.94), true, false);
//    net.setInput(blob);
//
//    // Forward pass
//    std::vector<cv::Mat> output;
//    std::vector<std::string> outNames(2);
//    outNames[0] = "feature_fusion/Conv_7/Sigmoid";
//    outNames[1] = "feature_fusion/concat_3";
//    net.forward(output, outNames);
//
//
//    cv::Mat scores = output[0];
//    cv::Mat geometry = output[1];
//    float confThreshold = 0.5;
//    float nmsThreshold = 0.5;
//
//    // Decode predicted bounding boxes.
//    std::vector<cv::RotatedRect> boxes;
//    std::vector<float> confidences;
//    decodeBoundingBoxes(scores, geometry, confThreshold, boxes, confidences);
//
//    std::vector<int> indices;
//    cv::dnn::NMSBoxes(boxes, confidences, confThreshold, nmsThreshold, indices);
//
//
//    std::vector<Word> words;
//
//    //for debug:
//    cv::Mat debugMat;
//    bool first = true;
//
//    // For each text box detected by EAST
//    for (size_t i = 0; i < indices.size(); ++i)
//    {
//      cv::RotatedRect& box = boxes[indices[i]];
//
//      box = expandRotatedRect(box, 2);
//
//      cv::Point2f vertices[4];
//      box.points(vertices);
//      for (int j = 0; j < 4; ++j)
//      {
//        vertices[j].x *= ratio.x;
//        vertices[j].y *= ratio.y;
//      }
//
//      cv::Mat cropped;
//      fourPointsTransform(image, vertices, cropped);
//      cv::Mat forOCR = prepareImageForOCR(cropped);
//
//      int borderSize = 20;
//      cv::copyMakeBorder(forOCR, forOCR, borderSize, borderSize, borderSize, borderSize, cv::BORDER_CONSTANT, cv::Scalar(255,255,255));
//
//      cv::Mat forOCR_resized;
//      cv::resize(forOCR, forOCR_resized, cv::Size(250,80));
//#ifdef DEBUG
//
//      if (first) {
//        first = false;
//        debugMat = forOCR_resized;
//      } else {
//        cv::Mat tempMat;
//        cv::vconcat(debugMat, forOCR_resized, tempMat);  // Concatenate vertically.
//
//        debugMat = tempMat;
//      }
//#endif
//      NSString *dataPathNSTR = [[NSBundle mainBundle] pathForResource:@"tessdata" ofType:nil];
//      std::string dataPath = [dataPathNSTR cStringUsingEncoding:NSASCIIStringEncoding];
//
//      std::string lang = [language cStringUsingEncoding:NSASCIIStringEncoding];
//
//      NSString *text = performOCROnCVImage(forOCR, dataPath, lang);
//      if (text != nil && [text length] > 0) {
//        text = [text stringByReplacingOccurrencesOfString:@"\n" withString:@""];
//        text = [text stringByReplacingOccurrencesOfString:@"|" withString:@""];
//        text = [text stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceCharacterSet]];
//      } else {
//        text = @"";
//      }
//
//      cv::Rect boundingRect = box.boundingRect();
//      words.push_back(Word([text UTF8String] , boundingRect));
//    }
//#ifdef DEBUG
//    cv::imwrite("/tmp/debug.png", debugMat);
//#endif
//
//
//  // Group words into paragraphs
//  bool rtl = ![language isEqualToString:@"eng"]; // Set this to true for right-to-left text
//  std::vector<Paragraph> paragraphs = groupWordsIntoParagraphs(words, rtl);
//
//  // Convert back to your desired NSDictionary structure
//  NSMutableArray *groupedResults = [NSMutableArray array];
//  for (const Paragraph &paragraph : paragraphs) {
//      NSMutableDictionary *paragraphDict = [NSMutableDictionary dictionary];
//      [paragraphDict setObject:@{
//          @"x": @(paragraph.rect.x * ratio.x),
//          @"y": @(paragraph.rect.y * ratio.y),
//          @"width": @(paragraph.rect.width * ratio.x),
//          @"height": @(paragraph.rect.height * ratio.y)
//      } forKey:@"rect"];
//
//      [paragraphDict setObject:[NSString stringWithUTF8String:paragraph.text.c_str()] forKey:@"text"];
//
//      [groupedResults addObject:paragraphDict];
//  }
//  return groupedResults;
//}

bool isWordInSameLineAs(Word word, Word otherWord) {
    float verticalDistance = std::abs(word.rect.y + word.rect.height / 2.0 - (otherWord.rect.y + otherWord.rect.height / 2.0));
    return verticalDistance <= std::max(word.rect.height, otherWord.rect.height) / 2.0;
}

bool isWordNearbyTo(Word word, Word otherWord) {
    float horizontalDistance = word.rect.x - (otherWord.rect.x + otherWord.rect.width);
    return horizontalDistance <= std::max(word.rect.width, otherWord.rect.width);
}

Paragraph mergeWordsIntoParagraph(std::vector<Word> words) {
    cv::Rect paragraphRect = words[0].rect;
    std::vector<std::string> texts;
    texts.push_back(words[0].text);
    
    for (int i = 1; i < words.size(); i++) {
        Word word = words[i];
        cv::Rect wordRect = word.rect;
        
        paragraphRect = paragraphRect | wordRect;
        texts.push_back(word.text);
    }
    
    std::string joinedText = boost::algorithm::join(texts, " ");
    
    std::map<std::string, float> rectDict;
    rectDict["x"] = paragraphRect.x;
    rectDict["y"] = paragraphRect.y;
    rectDict["width"] = paragraphRect.width;
    rectDict["height"] = paragraphRect.height;
    
    Paragraph paragraph( joinedText, paragraphRect);
    
    return paragraph;
}


std::vector<Paragraph> groupWordsIntoParagraphs(std::vector<Word> words, bool rtl) {

    std::sort(words.begin(), words.end(), [&rtl](const Word& a, const Word& b) {
        return rtl ? (a.rect.x > b.rect.x) : (a.rect.x < b.rect.x);
    });

  std::vector<std::vector<Word>> lines;
  std::vector<Word> currentLineWords;
  std::vector<Word> currentParagraphWords;

  int yThreashold = 25;
  int xThreashold = 25;
  int currentX = -1, currentY = -1;
  while (words.size() > 0) {
    yThreashold = words[0].rect.height / 2.0;
    xThreashold = std::max(words[0].rect.width, 40) / 2;
    
    currentLineWords.clear();
    currentX = rtl ? words[0].rect.x :  words[0].rect.x+words[0].rect.width;
    currentY = (words[0].rect.y + words[0].rect.height) / 2.0;
    currentLineWords.push_back(words[0]);
    words.erase(words.begin());
    
    int size = words.size();
    int i =0;
    while (i < size) {
      if (std::abs((words[i].rect.y + words[i].rect.height) / 2.0 - currentY) < yThreashold &&
          ((rtl && currentX - (words[i].rect.x + words[i].rect.width) < xThreashold) ||
           (!rtl && (words[i].rect.x - currentX < xThreashold)))) {
        // same line next word
        currentX = rtl ? words[i].rect.x :  words[i].rect.x+words[i].rect.width;
        currentY = (words[i].rect.y + words[i].rect.height) / 2.0;

        currentLineWords.push_back(words[i]);
        words.erase(words.begin()+i);
        i--;
        size--;
      }
      i++;
    }
    std::vector<Word> line;
    line.insert(line.begin(), currentLineWords.begin(), currentLineWords.end());
              
    lines.push_back(line);
  }
  std::vector<Paragraph> paragraphs;

  for (std::vector<Word> line : lines) {
    paragraphs.push_back(mergeWordsIntoParagraph(line));
  }
        
    return paragraphs;
}



cv::RotatedRect expandRotatedRect(const cv::RotatedRect& rect, int pixels) {
    // Get the bounding rectangle
    cv::Rect boundingRect = rect.boundingRect();
    
    // Expand the bounding rectangle
    boundingRect.x -= pixels;
    boundingRect.y -= pixels;
    boundingRect.width += 2 * pixels;
    boundingRect.height += 2 * pixels;
    
    // Create a new RotatedRect using the expanded bounding rectangle
    cv::RotatedRect expandedRect = cv::RotatedRect(
        cv::Point2f(boundingRect.x + boundingRect.width / 2.0f, boundingRect.y + boundingRect.height / 2.0f),
        cv::Size2f(boundingRect.width, boundingRect.height),
        rect.angle
    );
    
    return expandedRect;
}

cv::Mat prepareImageForOCR(const cv::Mat& inputImage) {
    // Define the structuring element
    cv::Mat kernel3 = cv::Mat::ones(3, 3, CV_8UC1);
    cv::Mat kernel2 = cv::Mat::ones(2, 2, CV_8UC1);
  
    // Convert the input image to grayscale
    cv::Mat grayImage;
    cv::cvtColor(inputImage, grayImage, cv::COLOR_BGR2GRAY);
    
    // Apply Gaussian blur
    cv::Mat blurredImage;
    cv::GaussianBlur(grayImage, blurredImage, cv::Size(5, 5), 0);
//
    // Apply adaptive thresholding
    cv::Mat thresholdedImage;
    //cv::adaptiveThreshold(grayImage, thresholdedImage, 255, cv::THRESH_BINARY & cv::THRESH_OTSU , cv::THRESH_BINARY, 3, 5);
    cv::adaptiveThreshold(blurredImage, thresholdedImage, 255, cv::ADAPTIVE_THRESH_GAUSSIAN_C, cv::THRESH_BINARY, 7, 5);

    cv::Mat erodedImage;
    cv::erode(thresholdedImage, erodedImage, kernel3);
//
//  // Perform dilation
    cv::Mat dilatedImage;
    cv::dilate(erodedImage, dilatedImage, kernel3);

//
//  cv::Mat openedImage;
//  cv::morphologyEx(thresholdedImage, openedImage, cv::MORPH_OPEN, kernel3);
//    // Perform median filtering
//    cv::Mat medianImage;
//    cv::medianBlur(dilatedImage, medianImage, 3);
//
    cv::Mat resizedImage;
    double aspectRatio = (double)grayImage.cols / (double)grayImage.rows;
    int newWidth = 30 * aspectRatio; // calculate new width based on aspect ratio
    cv::resize(dilatedImage, resizedImage, cv::Size(newWidth, 30));
    return resizedImage;
}

//cv::Mat prepareImageForOCR(const cv::Mat& inputImage) {
//
//    cv::Mat kernel = cv::getStructuringElement(cv::MORPH_RECT, cv::Size(2.5, 2.5));
//
//    // Convert the input image to grayscale
//    cv::Mat grayImage;
//    cv::cvtColor(inputImage, grayImage, cv::COLOR_BGR2GRAY);
//
//    // Apply adaptive thresholding
//    cv::Mat thresholdedImage;
//    cv::adaptiveThreshold(grayImage, thresholdedImage, 255, cv::ADAPTIVE_THRESH_GAUSSIAN_C, cv::THRESH_BINARY, 11, 2);
//
////    // Perform dilation
//    cv::Mat dilatedImage;
//    cv::dilate(thresholdedImage, dilatedImage, kernel, cv::Point(-1, -1), 2);
//
//    // Perform erosion
//    cv::Mat erodedImage;
//    cv::erode(dilatedImage, erodedImage, kernel, cv::Point(-1, -1), 1);
//
//    // Denoise the image using a median filter
//    cv::Mat denoisedImage;
//    cv::medianBlur(erodedImage, denoisedImage, 3);
//
//    return denoisedImage;
//}

void fourPointsTransform(const cv::Mat& frame, cv::Point2f vertices[4], cv::Mat& result)
{
  const cv::Size outputSize = cv::Size(100, 32);
  cv::Point2f targetVertices[4] = {
    cv::Point(0, outputSize.height - 1),
    cv::Point(0, 0), cv::Point(outputSize.width - 1, 0),
    cv::Point(outputSize.width - 1, outputSize.height - 1),
  };
  
  cv::Mat rotationMatrix = getPerspectiveTransform(vertices, targetVertices);
  warpPerspective(frame, result, rotationMatrix, outputSize);
}


NSString * performOCROnCVImage(cv::Mat &cvImage, std::string dataPath, std::string lang) {
    // Initialize Tesseract engine
    TessBaseAPI* tesseract = TessBaseAPICreate();

    // Set the language for OCR
    TessBaseAPIInit2(tesseract, dataPath.data(), lang.data(), tesseract::OEM_LSTM_ONLY);

    TessBaseAPISetPageSegMode(tesseract, tesseract::PSM_SINGLE_LINE);

    TessBaseAPISetImage(tesseract, (uchar*)cvImage.data, cvImage.size().width, cvImage.size().height, cvImage.channels(), cvImage.step1());
  

    // Perform OCR
    TessBaseAPIRecognize(tesseract, NULL);

    // Get the recognized text
    NSString *result = @"";
    char *recognizedText = TessBaseAPIGetUTF8Text(tesseract);
    if (recognizedText != NULL) {
      result = [NSString stringWithUTF8String:recognizedText];
      delete[] recognizedText;
    }
    // Clean up
    TessBaseAPIEnd(tesseract);
    TessBaseAPIDelete(tesseract);
    
    return result;
}

void decodeBoundingBoxes(const cv::Mat& scores, const cv::Mat& geometry, float scoreThresh, std::vector<cv::RotatedRect>& detections, std::vector<float>& confidences)
{
  detections.clear();
  CV_Assert(scores.dims == 4); CV_Assert(geometry.dims == 4); CV_Assert(scores.size[0] == 1);
  CV_Assert(geometry.size[0] == 1); CV_Assert(scores.size[1] == 1); CV_Assert(geometry.size[1] == 5);
  CV_Assert(scores.size[2] == geometry.size[2]); CV_Assert(scores.size[3] == geometry.size[3]);
  const int height = scores.size[2];
  const int width = scores.size[3];
  for (int y = 0; y < height; ++y)
  {
    const float* scoresData = scores.ptr<float>(0, 0, y);
    const float* x0_data = geometry.ptr<float>(0, 0, y);
    const float* x1_data = geometry.ptr<float>(0, 1, y);
    const float* x2_data = geometry.ptr<float>(0, 2, y);
    const float* x3_data = geometry.ptr<float>(0, 3, y);
    const float* anglesData = geometry.ptr<float>(0, 4, y);
    for (int x = 0; x < width; ++x)
    {
      float score = scoresData[x];
      if (score < scoreThresh)
      continue;
      // Decode a prediction.
      // Multiple by 4 because feature maps are 4 time less than input image.
      float offsetX = x * 4.0f, offsetY = y * 4.0f;
      float angle = anglesData[x];
      float cosA = std::cos(angle);
      float sinA = std::sin(angle);
      float h = x0_data[x] + x2_data[x];
      float w = x1_data[x] + x3_data[x];
      cv::Point2f offset(offsetX + cosA * x1_data[x] + sinA * x2_data[x],
      offsetY - sinA * x1_data[x] + cosA * x2_data[x]);
      cv::Point2f p1 = cv::Point2f(-sinA * h, -cosA * h) + offset;
      cv::Point2f p3 = cv::Point2f(-cosA * w, sinA * w) + offset;
      cv::RotatedRect r(0.5f * (p1 + p3), cv::Size2f(w, h), -angle * 180.0f / (float)CV_PI);
      detections.push_back(r);
      confidences.push_back(score);
    }
  }
}


@end
