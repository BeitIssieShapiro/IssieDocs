#import "TextDetection.h"


#undef NO
#undef YES

#import "opencv2/opencv.hpp"
#import <tesseract/capi.h>


@implementation TextDetection

- (NSArray *)detectTexts:(NSString *)filePath language:(NSString *)language confidenceThreshold:(NSNumber *)threshold {
 
    // Convert NSString to std::string
    std::string path = [filePath UTF8String];
    
    // Load the image
    cv::Mat image = cv::imread(path);
  
    int newWidth = (int)(image.cols / 32) * 32;
    int newHeight = (int)(image.rows / 32) * 32;
  
    cv::Point2f ratio((float)image.cols / newWidth, (float)image.rows / newHeight);

    //cv::resize(image, image, cv::Size(newWidth, newHeight));
  
//    image.convertTo(image, CV_32FC3, 1 / 255.0);  // Convert the image from uint8 to float32 and scale values from 0-255 to 0-1
//    image = (image - 0.5) * 2;  // Shift from range 0-1 to -1 to 1

    // Load pre-trained EAST model
    NSString *modelPathNSTR = [[NSBundle mainBundle] pathForResource:@"tessdata/frozen_east_text_detection" ofType:@"pb"];
    std::string modelPath = [modelPathNSTR cStringUsingEncoding:NSASCIIStringEncoding];
  
    cv::dnn::Net net = cv::dnn::readNet(modelPath);
    
    // Blob from the image
    cv::Mat blob = cv::dnn::blobFromImage(image, 1.0, cv::Size(newWidth, newHeight), cv::Scalar(123.68, 116.78, 103.94), true, false);
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

  

  
    // Array to store results
    NSMutableArray *results = [[NSMutableArray alloc] init];
    
    //for debug:
    cv::Mat debugMat;
    bool first = true;
  
    // For each text box detected by EAST
    for (size_t i = 0; i < indices.size(); ++i)
    {
      cv::RotatedRect& box = boxes[indices[i]];
      
      box = expandRotatedRect(box, 2);
      
      cv::Point2f vertices[4];
      box.points(vertices);
      for (int j = 0; j < 4; ++j)
      {
        vertices[j].x *= ratio.x;
        vertices[j].y *= ratio.y;
      }

      cv::Mat cropped_;
      fourPointsTransform(image, vertices, cropped_);
      cv::Mat cropped;
      int borderSize = 20;
      cv::copyMakeBorder(cropped_, cropped, borderSize, borderSize, borderSize, borderSize, cv::BORDER_CONSTANT, cv::Scalar(255,255,255));
      
      cv::Mat forOCR = prepareImageForOCR(cropped);
      cv::Mat forOCR_resized;
      cv::resize(forOCR, forOCR_resized, cv::Size(150,50));

      if (first) {
        first = false;
        debugMat = forOCR_resized;
      } else {
        cv::Mat tempMat;
        cv::vconcat(debugMat, forOCR_resized, tempMat);  // Concatenate vertically.
        
        debugMat = tempMat;
      }
      NSString *dataPathNSTR = [[NSBundle mainBundle] pathForResource:@"tessdata" ofType:nil];
      std::string dataPath = [dataPathNSTR cStringUsingEncoding:NSASCIIStringEncoding];
    
      std::string lang = [language cStringUsingEncoding:NSASCIIStringEncoding];

      NSString *text = performOCROnCVImage(forOCR, dataPath, lang);
      if (text != nil && [text length] > 0) {
        text = [text stringByReplacingOccurrencesOfString:@"\n" withString:@""];
      } else {
        text = @"";
      }
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
    

    cv::imwrite("/tmp/debug.png", debugMat);
  
    return results;
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
//    cv::Mat kernel3 = cv::getStructuringElement(cv::MORPH_RECT, cv::Size(3, 3));
    //cv::Mat kernel2 = cv::getStructuringElement(cv::MORPH_RECT, cv::Size(2, 2));
    cv::Mat kernel3 = cv::Mat::ones(3, 3, CV_8UC1);
    // Convert the input image to grayscale
    cv::Mat grayImage;
    cv::cvtColor(inputImage, grayImage, cv::COLOR_BGR2GRAY);
    
    // Apply Gaussian blur
//    cv::Mat blurredImage;
//    cv::GaussianBlur(grayImage, blurredImage, cv::Size(5, 5), 0);
//
    // Apply adaptive thresholding
    cv::Mat thresholdedImage;
    //cv::adaptiveThreshold(grayImage, thresholdedImage, 255, cv::THRESH_BINARY & cv::THRESH_OTSU , cv::THRESH_BINARY, 3, 5);
    cv::adaptiveThreshold(grayImage, thresholdedImage, 255, cv::ADAPTIVE_THRESH_GAUSSIAN_C, cv::THRESH_BINARY, 3, 5);

//    cv::Mat erodedImage;
//    cv::erode(thresholdedImage, erodedImage, kernel3);
//
//  // Perform dilation
    cv::Mat dilatedImage;
    cv::dilate(thresholdedImage, dilatedImage, kernel3);
//
//
//  cv::Mat openedImage;
//  cv::morphologyEx(thresholdedImage, openedImage, cv::MORPH_OPEN, kernel3);
//    // Perform median filtering
//    cv::Mat medianImage;
//    cv::medianBlur(dilatedImage, medianImage, 3);
//
    cv::Mat resizedImage;
    //cv::copyMakeBorder(grayImage, withBorder, 2,2,2,2, cv::BORDER_CONSTANT, cv::Scalar(0, 0, 0));
  double aspectRatio = (double)grayImage.cols / (double)grayImage.rows;
  int newWidth = 30 * aspectRatio; // calculate new width based on aspect ratio

    cv::resize(grayImage, resizedImage, cv::Size(newWidth, 30));
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

    TessBaseAPISetPageSegMode(tesseract, tesseract::PSM_SINGLE_WORD);

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
