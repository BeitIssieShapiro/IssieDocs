#import "TextDetectionPlugin.h"
#import "TextDetection.h"  // We will create this header next

@implementation TextDetectionPlugin

RCT_EXPORT_MODULE(TextDetectionPlugin);

#pragma mark - Exported methods
RCT_EXPORT_METHOD(
                  detectTextsInImage:(NSString *)filePath language:(NSString *)language confidenceThreshold:(nonnull NSNumber *)threshold callback:(RCTResponseSenderBlock)callback
                  )
{
    TextDetection *textDetection = [[TextDetection alloc] init];
    NSArray *results = [textDetection detectTexts:filePath language:language confidenceThreshold:threshold];
    if (results.count > 0) {
        callback(@[results]);
    } else {
      callback(@[@[]]);

    }
}

@end
