#import "TextDetection.h"
#import "opencv2/opencv.hpp"

@implementation TextDetection

- (NSArray *)detectTexts:(NSString *)filePath language:(NSString *)language confidenceThreshold:(NSNumber *)threshold {
 
    // Convert NSString to std::string
    std::string path = [filePath cStringUsingEncoding:NSASCIIStringEncoding];
    
    // Load the image
    cv::Mat image = cv::imread(path);

    // Load pre-trained EAST model
    cv::dnn::Net net = cv::dnn::readNet("frozen_east_text_detection.pb");
    
    // Blob from the image
    cv::Mat blob = cv::dnn::blobFromImage(image, 1.0, cv::Size(320, 320), cv::Scalar(123.68, 116.78, 103.94), true, false);
    net.setInput(blob);
    
    // Forward pass
    std::vector<cv::Mat> output;
    std::vector<std::string> outNames(2);
    outNames[0] = "feature_fusion/Conv_7/Sigmoid";
    outNames[1] = "feature_fusion/concat_3";
    net.forward(output, outNames);

    // Post-processing
    // This part is omitted for brevity.
    // Refer to EAST paper or OpenCV EAST text detection example for the complete algorithm.
    
    // Array to store results
    NSMutableArray *results = [[NSMutableArray alloc] init];
    
    // For each text box detected by EAST
    for (cv::Rect rect : rects) {
        // Get sub-image
        cv::Mat roi = image(rect);
        
        // Pre-process image for Tesseract
        // Resize, convert to grayscale, apply thresholding, etc.
        // This part is omitted for brevity.
        
        // Convert cv::Mat to UIImage
        UIImage *roiImage = [UIImage imageWithCVImageBuffer:roi];
        
        // Initialize Tesseract
        G8Tesseract *tesseract = [[G8Tesseract alloc] initWithLanguage:@"eng"];
        tesseract.image = roiImage;
        [tesseract recognize];
        
        // Get OCR result
        NSString *text = [tesseract recognizedText];
        
        // Convert cv::Rect to CGRect
        CGRect cgRect = cvRectToCGRect(rect);
        
        // Store result
        NSDictionary *result = @{@"rect": [NSValue valueWithCGRect:cgRect], @"text": text};
        [results addObject:result];
    }

    return results;
}

@end
