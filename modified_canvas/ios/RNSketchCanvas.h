#import <UIKit/UIKit.h>

@class RCTEventDispatcher;

@interface RNSketchCanvas : UIView

@property (nonatomic, copy) RCTBubblingEventBlock onChange;

- (instancetype)initWithEventDispatcher:(RCTEventDispatcher *)eventDispatcher;

- (BOOL)openSketchFile:(NSString *)filename directory:(NSString*) directory contentMode:(NSString*)mode;
- (void)setCanvasText:(NSArray *)text;
- (NSArray *)getImageIds;
- (NSArray *)getPathIds;

- (void)addOrSetImageOnCanvas:(NSDictionary *)imageOnCanvas;
- (void)clearImages;
- (void)setCanvasImagePosition:(NSDictionary *)imageOnCanvas;
- (void)newPath:(int) pathId strokeColor:(UIColor*) strokeColor strokeWidth:(int) strokeWidth;
- (void)addPath:(int) pathId strokeColor:(UIColor*) strokeColor strokeWidth:(int) strokeWidth points:(NSArray*) points dash: (CGFloat)dash dashGap: (CGFloat)dashGap phase:(double) phase;
- (void)deletePath:(int) pathId;
- (void)deleteImage:(NSString*) imageId;
- (void)addPointX: (float)x Y: (float)y;
- (void)endPath;
- (void)clear;
- (NSString*)saveImageOfType:(NSString*) type folder:(NSString*) folder filename:(NSString*) filename withTransparentBackground:(BOOL) transparent includeImage:(BOOL)includeImage includeText:(BOOL)includeText cropToImageSize:(BOOL)cropToImageSize scaleToSize:(CGSize)scaleToSize;
- (NSString*) transferToBase64OfType: (NSString*) type withTransparentBackground: (BOOL) transparent includeImage:(BOOL)includeImage includeText:(BOOL)includeText cropToImageSize:(BOOL)cropToImageSize;

@end


@interface CanvasText : NSObject

@property (nonatomic) NSString *text;
@property (nonatomic) UIFont *font;
@property (nonatomic) UIColor *fontColor;
@property (nonatomic) CGPoint anchor, position;
@property (nonatomic) NSDictionary *attribute;
@property (nonatomic) BOOL isAbsoluteCoordinate;
@property (nonatomic) BOOL isRlt;
@property (nonatomic) CGRect drawRect;

@end


@interface CanvasImage : NSObject

@property (nonatomic) NSString *id;
@property (nonatomic) UIImage *image;
@property (nonatomic) CGPoint anchor, position;
@property (nonatomic) CGFloat width;
@property (nonatomic) CGFloat height;
@property (nonatomic) CGRect drawRect;

@end
