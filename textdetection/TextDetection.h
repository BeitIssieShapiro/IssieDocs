#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import <React/RCTBridgeModule.h>

@interface TextDetection : NSObject

- (void) detectTexts:(NSString *)filePath language:(NSString *)language confidenceThreshold:(NSNumber *)threshold callback:(RCTResponseSenderBlock)callback;
 
@end
