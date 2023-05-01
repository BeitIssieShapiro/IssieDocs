//
//  ocr2.m
//  IssieDocs
//
//  Created by Bentolila, Ariel on 29/04/2023.
//
#import "ocr.h"
#import <Foundation/Foundation.h>

@interface RCT_EXTERN_MODULE(TextDetector, NSObject)

RCT_EXTERN_METHOD(detectTextsInImage: (NSString *)filePath : ( NSString *)language: (nonnull NSNumber*)confidenceThreashold: (RCTResponseSenderBlock)callback : (RCTResponseSenderBlock)errCallback )
@end
