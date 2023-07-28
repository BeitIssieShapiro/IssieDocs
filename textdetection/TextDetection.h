#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>

@interface TextDetection : NSObject

- (NSArray *)detectTexts:(NSString *)filePath language:(NSString *)language confidenceThreshold:(NSNumber *)threshold;
 
@end
