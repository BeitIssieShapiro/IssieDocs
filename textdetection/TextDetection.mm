#import "TextDetection.h"


#undef NO
#undef YES

#import "opencv2/opencv.hpp"
#import <tesseract/capi.h>


@implementation TextDetection

- (NSArray *)detectTexts:(NSString *)filePath language:(NSString *)language confidenceThreshold:(NSNumber *)threshold {
 
    // Convert NSString to std::string
    std::string path = [filePath cStringUsingEncoding:NSASCIIStringEncoding];
    
    // Load the image
    cv::Mat image = cv::imread(path);

    // Load pre-trained EAST model
    NSString *modelPathNSTR = [[NSBundle mainBundle] pathForResource:@"tessdata/frozen_east_text_detection" ofType:@"pb"];
    std::string modelPath = [modelPathNSTR cStringUsingEncoding:NSASCIIStringEncoding];
  
    cv::dnn::Net net = cv::dnn::readNet(modelPath);
    
    // Blob from the image
    cv::Mat blob = cv::dnn::blobFromImage(image, 1.0, cv::Size(320, 320), cv::Scalar(123.68, 116.78, 103.94), true, false);
    net.setInput(blob);
    
    // Forward pass
    std::vector<cv::Mat> output;
    std::vector<std::string> outNames(2);
    outNames[0] = "feature_fusion/Conv_7/Sigmoid";
    outNames[1] = "feature_fusion/concat_3";
    net.forward(output, outNames);

  
    cv::Mat scores = output[0];
    cv::Mat geometry = output[1];
    float confThreshold = 0.5;
    float nmsThreshold = 0.5;
    
    // Decode predicted bounding boxes.
    std::vector<cv::RotatedRect> boxes;
    std::vector<float> confidences;
    decodeBoundingBoxes(scores, geometry, confThreshold, boxes, confidences);
    
    std::vector<int> indices;
    cv::dnn::NMSBoxes(boxes, confidences, confThreshold, nmsThreshold, indices);

  
    cv::Point2f ratio((float)image.cols / 320, (float)image.rows / 320);

  
    // Array to store results
    NSMutableArray *results = [[NSMutableArray alloc] init];
    
    //for debug:
    cv::Mat debugMat;
  bool first = true;
  
    // For each text box detected by EAST
    for (size_t i = 0; i < indices.size(); ++i)
    {
      cv::RotatedRect& box = boxes[indices[i]];
      
      cv::Point2f vertices[4];
      box.points(vertices);
      for (int j = 0; j < 4; ++j)
      {
        vertices[j].x *= ratio.x;
        vertices[j].y *= ratio.y;
      }

      cv::Mat cropped;
      fourPointsTransform(image, vertices, cropped);
     
      
      cv::Mat forOCR = cropped ; //prepareImageForOCR(cropped);
      
      if (first) {
        first = false;
        debugMat = cropped;
      } else {
        cv::Mat tempMat;
        cv::vconcat(debugMat, cropped, tempMat);  // Concatenate vertically.
        
        debugMat = tempMat;
      }
      NSString *dataPathNSTR = [[NSBundle mainBundle] pathForResource:@"tessdata" ofType:nil];
      std::string dataPath = [dataPathNSTR cStringUsingEncoding:NSASCIIStringEncoding];
    
      std::string lang = [language cStringUsingEncoding:NSASCIIStringEncoding];

      NSString *text = performOCROnCVImage(forOCR, dataPath, lang);
      if (text != nil && [text length] > 0) {
        cv::Rect boundingRect = box.boundingRect();

        NSDictionary *rectDict = @{
            @"x": @(boundingRect.x * ratio.x),
            @"y": @(boundingRect.y * ratio.y),
            @"width": @(boundingRect.width * ratio.x),
            @"height": @(boundingRect.height * ratio.y)
        };
          NSDictionary *elem = @{@"rect": rectDict, @"text": text};
          [results addObject:elem];
      }
    }

    cv::imwrite("/tmp/debug.png", debugMat);
  
  
  //    for (cv::Rect rect : rects) {
//        // Get sub-image
//        cv::Mat roi = image(rect);
//
//        // Pre-process image for Tesseract
//        // Resize, convert to grayscale, apply thresholding, etc.
//        // This part is omitted for brevity.
//
//        // Convert cv::Mat to UIImage
//        UIImage *roiImage = [UIImage imageWithCVImageBuffer:roi];
//
//        // Initialize Tesseract
//        G8Tesseract *tesseract = [[G8Tesseract alloc] initWithLanguage:@"eng"];
//        tesseract.image = roiImage;
//        [tesseract recognize];
//
//        // Get OCR result
//        NSString *text = [tesseract recognizedText];
//
//        // Convert cv::Rect to CGRect
//        CGRect cgRect = cvRectToCGRect(rect);
//
//        // Store result
//        NSDictionary *result = @{@"rect": [NSValue valueWithCGRect:cgRect], @"text": text};
//        [results addObject:result];
//    }

    return results;
}

cv::Mat prepareImageForOCR(const cv::Mat& inputImage) {
    // Convert the input image to grayscale
    cv::Mat grayImage;
    cv::cvtColor(inputImage, grayImage, cv::COLOR_BGR2GRAY);
    
    // Apply adaptive thresholding
    cv::Mat thresholdedImage;
    cv::adaptiveThreshold(grayImage, thresholdedImage, 255, cv::ADAPTIVE_THRESH_GAUSSIAN_C, cv::THRESH_BINARY, 11, 2);
    
    // Perform dilation
    cv::Mat dilatedImage;
    cv::dilate(thresholdedImage, dilatedImage, cv::Mat(), cv::Point(1, 1), 2);
    
    // Perform erosion
    cv::Mat erodedImage;
    cv::erode(dilatedImage, erodedImage, cv::Mat(), cv::Point(1, 1), 1);
    
    // Denoise the image using a median filter
    cv::Mat denoisedImage;
    cv::medianBlur(erodedImage, denoisedImage, 3);
    
    return denoisedImage;
}

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

//cv::Mat extractRegionFromMat(const cv::Mat& inputMat, const cv::RotatedRect& rotatedRect) {
//    // Convert the RotatedRect to a Rect
//    cv::Rect boundingRect = rotatedRect.boundingRect();
//
//    // Create a mask image of the same size as the input Mat
//    cv::Mat mask(inputMat.size(), CV_8UC1, cv::Scalar(0));
//
//    // Create a region of interest (ROI) mask within the boundingRect
//    cv::Point2f vertices[4];
//    rotatedRect.points(vertices);
//    fillConvexPoly(mask, vertices, 4, cv::Scalar(255));
//
//    // Apply the mask to the input Mat
//    cv::Mat extractedRegion;
//    inputMat.copyTo(extractedRegion, mask);
//
//    // Create a new Mat representing the extracted region
//    cv::Mat extractedMat = extractedRegion(boundingRect);
//
//    return extractedMat;
//}

NSString * performOCROnCVImage(cv::Mat &cvImage, std::string dataPath, std::string lang) {
    // Convert OpenCV cv::Mat to NSData
    NSData *imageData = imageDataFromCVImage(cvImage);

    // Initialize Tesseract engine
    TessBaseAPI* tesseract = TessBaseAPICreate();

    // Set the language for OCR
    TessBaseAPIInit3(tesseract, dataPath.data(), lang.data());

    // Set the image data for OCR
    const unsigned char *imageBytes = (const unsigned char *)imageData.bytes;
    int width = cvImage.cols;
    int height = cvImage.rows;
    int bytesPerPixel = cvImage.elemSize();
    int bytesPerLine = cvImage.step1();

    TessBaseAPISetImage(tesseract, imageBytes, width, height, bytesPerPixel, bytesPerLine);

    // Perform OCR
    TessBaseAPIRecognize(tesseract, NULL);

    // Get the recognized text
    char *recognizedText = TessBaseAPIGetUTF8Text(tesseract);
    NSString *result = [NSString stringWithUTF8String:recognizedText];

    // Clean up
    TessBaseAPIEnd(tesseract);
    TessBaseAPIDelete(tesseract);
    delete[] recognizedText;
    
  return result;
  //return @"abcd";
}

NSData * imageDataFromCVImage(cv::Mat &cvImage) {
    // Create a data buffer with the CV image data
    cv::Mat cvImageRGB;
    cv::cvtColor(cvImage, cvImageRGB, cv::COLOR_BGR2RGB);
    NSData *imageData = [NSData dataWithBytes:cvImageRGB.data length:cvImageRGB.total() * cvImageRGB.elemSize()];
    
    return imageData;
}

/*
for (const cv::RotatedRect& rect : boxes) {
    cv::Rect boundingRect = rect.boundingRect();

    NSDictionary *rectDict = @{
        @"x": @(boundingRect.x),
        @"y": @(boundingRect.y),
        @"width": @(boundingRect.width),
        @"height": @(boundingRect.height)
    };

    NSDictionary *elementDict = @{
        @"rect": rectDict,
        @"text": @"Your text here"
    };

    [resultArray addObject:elementDict];
}
 */

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
