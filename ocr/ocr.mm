#import "ocr.h"
//#import <tesseract/cpai.h>
#import "capi.h"
#import <leptonica/allheaders.h>
#import <UIKit/UIKit.h>
#import <Foundation/Foundation.h>

@interface RCT_EXTERN_MODULE(TextDetector, NSObject)

RCT_EXTERN_METHOD(detectTextsInImage: (NSString *)filePath : (NSString *)language: (RCTResponseSenderBlock)callback)
@end
/**@implementation OCR


RCT_EXPORT_MODULE(OCR4iOS)


- (Pix *)pixForImage:(UIImage *)image
{
    int width = image.size.width;
    int height = image.size.height;

    CGImage *cgImage = image.CGImage;
    CFDataRef imageData = CGDataProviderCopyData(CGImageGetDataProvider(cgImage));
    const UInt8 *pixels = CFDataGetBytePtr(imageData);

    size_t bitsPerPixel = CGImageGetBitsPerPixel(cgImage);
    size_t bytesPerPixel = bitsPerPixel / 8;
    size_t bytesPerRow = CGImageGetBytesPerRow(cgImage);

    int bpp = MAX(1, (int)bitsPerPixel);
    Pix *pix = pixCreate(width, height, bpp == 24 ? 32 : bpp);
    l_uint32 *data = pixGetData(pix);
    int wpl = pixGetWpl(pix);
    
    void (^copyBlock)(l_uint32 *toAddr, NSUInteger toOffset, const UInt8 *fromAddr, NSUInteger fromOffset) = nil;
    switch (bpp) {
            
#if 0 // BPP1 start. Uncomment this if UIImage can support 1bpp someday
      // Just a reference for the copyBlock
        case 1:
            for (int y = 0; y < height; ++y, data += wpl, pixels += bytesPerRow) {
                for (int x = 0; x < width; ++x) {
                    if (pixels[x / 8] & (0x80 >> (x % 8))) {
                        CLEAR_DATA_BIT(data, x);
                    }
                    else {
                        SET_DATA_BIT(data, x);
                    }
                }
            }
            break;
#endif // BPP1 end
            
        case 8: {
            copyBlock = ^(l_uint32 *toAddr, NSUInteger toOffset, const UInt8 *fromAddr, NSUInteger fromOffset) {
                SET_DATA_BYTE(toAddr, toOffset, fromAddr[fromOffset]);
            };
            break;
        }
            
#if 0 // BPP24 start. Uncomment this if UIImage can support 24bpp someday
      // Just a reference for the copyBlock
        case 24:
            // Put the colors in the correct places in the line buffer.
            for (int y = 0; y < height; ++y, pixels += bytesPerRow) {
                for (int x = 0; x < width; ++x, ++data) {
                    SET_DATA_BYTE(data, COLOR_RED, pixels[3 * x]);
                    SET_DATA_BYTE(data, COLOR_GREEN, pixels[3 * x + 1]);
                    SET_DATA_BYTE(data, COLOR_BLUE, pixels[3 * x + 2]);
                }
            }
            break;
#endif // BPP24 end
            
        case 32: {
            copyBlock = ^(l_uint32 *toAddr, NSUInteger toOffset, const UInt8 *fromAddr, NSUInteger fromOffset) {
                toAddr[toOffset] = (fromAddr[fromOffset] << 24) | (fromAddr[fromOffset + 1] << 16) |
                                   (fromAddr[fromOffset + 2] << 8) | fromAddr[fromOffset + 3];
            };
            break;
        }
            
        default:
            NSLog(@"Cannot convert image to Pix with bpp = %d", bpp); // LCOV_EXCL_LINE
    }
    
    if (copyBlock) {
        switch (image.imageOrientation) {
            case UIImageOrientationUp:
                // Maintain byte order consistency across different endianness.
                for (int y = 0; y < height; ++y, pixels += bytesPerRow, data += wpl) {
                    for (int x = 0; x < width; ++x) {
                        copyBlock(data, x, pixels, x * bytesPerPixel);
                    }
                }
                break;
                
            case UIImageOrientationUpMirrored:
                // Maintain byte order consistency across different endianness.
                for (int y = 0; y < height; ++y, pixels += bytesPerRow, data += wpl) {
                    int maxX = width - 1;
                    for (int x = maxX; x >= 0; --x) {
                        copyBlock(data, maxX - x, pixels, x * bytesPerPixel);
                    }
                }
                break;
                
            case UIImageOrientationDown:
                // Maintain byte order consistency across different endianness.
                pixels += (height - 1) * bytesPerRow;
                for (int y = height - 1; y >= 0; --y, pixels -= bytesPerRow, data += wpl) {
                    int maxX = width - 1;
                    for (int x = maxX; x >= 0; --x) {
                        copyBlock(data, maxX - x, pixels, x * bytesPerPixel);
                    }
                }
                break;
                
            case UIImageOrientationDownMirrored:
                // Maintain byte order consistency across different endianness.
                pixels += (height - 1) * bytesPerRow;
                for (int y = height - 1; y >= 0; --y, pixels -= bytesPerRow, data += wpl) {
                    for (int x = 0; x < width; ++x) {
                        copyBlock(data, x, pixels, x * bytesPerPixel);
                    }
                }
                break;
                
            case UIImageOrientationLeft:
                // Maintain byte order consistency across different endianness.
                for (int x = 0; x < height; ++x, data += wpl) {
                    int maxY = width - 1;
                    for (int y = maxY; y >= 0; --y) {
                        int x0 = y * (int)bytesPerRow + x * (int)bytesPerPixel;
                        copyBlock(data, maxY - y, pixels, x0);
                    }
                }
                break;
                
            case UIImageOrientationLeftMirrored:
                // Maintain byte order consistency across different endianness.
                for (int x = height - 1; x >= 0; --x, data += wpl) {
                    int maxY = width - 1;
                    for (int y = maxY; y >= 0; --y) {
                        int x0 = y * (int)bytesPerRow + x * (int)bytesPerPixel;
                        copyBlock(data, maxY - y, pixels, x0);
                    }
                }
                break;
                
            case UIImageOrientationRight:
                // Maintain byte order consistency across different endianness.
                for (int x = height - 1; x >=0; --x, data += wpl) {
                    for (int y = 0; y < width; ++y) {
                        int x0 = y * (int)bytesPerRow + x * (int)bytesPerPixel;
                        copyBlock(data, y, pixels, x0);
                    }
                }
                break;
                
            case UIImageOrientationRightMirrored:
                // Maintain byte order consistency across different endianness.
                for (int x = 0; x < height; ++x, data += wpl) {
                    for (int y = 0; y < width; ++y) {
                        int x0 = y * (int)bytesPerRow + x * (int)bytesPerPixel;
                        copyBlock(data, y, pixels, x0);
                    }
                }
                break;
                
            default:
                break;  // LCOV_EXCL_LINE
        }
    }

    pixSetYRes(pix, (l_int32)72);
    
    CFRelease(imageData);
    
    return pix;
}

RCT_EXPORT_METHOD(detectTextsInBackgroundImage:(NSString *)filePath :(NSString *)lang :(RCTResponseSenderBlock)callback)
{
    tesseract::TessBaseAPI *tesseract = TessBaseAPICreate(); //V
            
    NSString *trainedDataFolder = [[NSBundle mainBundle] pathForResource:@"tessdata" ofType:nil]; // inDirectory:@"share"];
    tesseract::PageIteratorLevel level = tesseract::RIL_WORD;
    //NSString *testFile = [trainedDataFolder stringByAppendingString:@"/test.png"];
    
    TessBaseAPIInit2(tesseract, [trainedDataFolder cStringUsingEncoding:NSUTF8StringEncoding], [lang cStringUsingEncoding:NSUTF8StringEncoding], TessOcrEngineMode::OEM_LSTM_ONLY); //V
    //Pix *pix = pixRead([filePath UTF8String]);
    
    UIImage *img = [UIImage imageWithContentsOfFile:filePath];
    Pix * pix = [self pixForImage:img];
//    NSData* data = UIImagePNGRepresentation(img);
//    const uint8_t *bytes = (const uint8_t*)[data bytes];
//    Pix *pix = pixReadMem(bytes, data.length);

    
//    int width = pixGetWidth(pix);
//    int height = pixGetHeight(pix);
    
    TessBaseAPISetImage2(tesseract, pix);
//    int xres = pixGetXRes(pix);
    TessBaseAPISetSourceResolution(tesseract, 144);
    TessBaseAPISetPageSegMode(tesseract, tesseract::PageSegMode::PSM_SPARSE_TEXT);

    
    if (TessBaseAPIRecognize(tesseract, NULL) != 0) {
        callback(@[]);
        return ;
    }
    
    const char*text = TessBaseAPIGetUTF8Text(tesseract);

    TessResultIterator* iterator = TessBaseAPIGetIterator(tesseract);
    if (iterator == NULL) {
        // no text found in image
        callback(@[]);
        return;
    }

    NSMutableArray<NSDictionary *> *textArray = [NSMutableArray array];

    do {
      // Get the recognized text and the confidence score for this item
                                     
        const char* recognizedText = TessResultIteratorGetUTF8Text(iterator, level);
        float confidence = TessResultIteratorConfidence(iterator, level);

        if (confidence > 60) {
            // Get the bounding box of this item
            int left, top, right, bottom;
            TessPageIteratorBoundingBox(iterator, level, &left, &top, &right, &bottom);
            //iterator->BoundingBox(TessPageIteratorLevel::RIL_WORD, &left, &top, &right, &bottom);
            
            // Do something with the recognized text, confidence score, and bounding box
            if (recognizedText != NULL) {
                NSString *text = [NSString stringWithUTF8String:recognizedText];
                CGRect rect = CGRectMake(left, top, right - left, bottom - top);
                
                NSDictionary *rectDict = @{
                    @"x": @(rect.origin.x),
                    @"y": @(rect.origin.y),
                    @"width": @(rect.size.width),
                    @"height": @(rect.size.height)
                };
                
                NSDictionary *textRectDict = @{
                    @"text": text,
                    @"rect": rectDict
                };
                
                [textArray addObject:textRectDict];
            }
        }
        
        TessDeleteText(recognizedText);
      
    } while (TessPageIteratorNext(iterator, level));
   
    TessPageIteratorDelete(iterator);
    pixDestroy(&pix);
    TessBaseAPIEnd(tesseract);
    TessBaseAPIDelete(tesseract);
    
    callback(@[textArray]);
}


@end
 */
