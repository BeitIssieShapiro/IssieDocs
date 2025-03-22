#import "RNSketchCanvasManager.h"
#import "RNSketchCanvas.h"
#import <React/RCTEventDispatcher.h>
#import <React/RCTView.h>
#import <React/UIView+React.h>
#import <React/RCTUIManager.h>
//#import <AVFoundation/AVFoundation.h>


@implementation RNSketchCanvasManager


- (instancetype)init {
    self = [super init];
//    if (self) {
//        _speechSynthesizer = [[AVSpeechSynthesizer alloc] init];
//    }
    return self;
}

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup
{
    return YES;
}

-(NSDictionary *)constantsToExport {
    return @{
             @"MainBundlePath": [[NSBundle mainBundle] bundlePath],
             @"NSDocumentDirectory": [NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES) firstObject],
             @"NSLibraryDirectory": [NSSearchPathForDirectoriesInDomains(NSLibraryDirectory, NSUserDomainMask, YES) firstObject],
             @"NSCachesDirectory": [NSSearchPathForDirectoriesInDomains(NSCachesDirectory, NSUserDomainMask, YES) firstObject],
             };
}

#pragma mark - Events

RCT_EXPORT_VIEW_PROPERTY(onChange, RCTBubblingEventBlock);

#pragma mark - Props
RCT_CUSTOM_VIEW_PROPERTY(localSourceImage, NSDictionary, RNSketchCanvas)
{
    RNSketchCanvas *currentView = !view ? defaultView : view;
    NSDictionary *dict = [RCTConvert NSDictionary:json];
    dispatch_async(dispatch_get_main_queue(), ^{
        [currentView openSketchFile:dict[@"filename"]
                          directory:[dict[@"directory"] isEqual: [NSNull null]] ? @"" : dict[@"directory"]
                        contentMode:[dict[@"mode"] isEqual: [NSNull null]] ? @"" : dict[@"mode"]];
    });
}

RCT_CUSTOM_VIEW_PROPERTY(text, NSArray, RNSketchCanvas)
{
    RNSketchCanvas *currentView = !view ? defaultView : view;
    NSArray *arr = [RCTConvert NSArray:json];
    dispatch_async(dispatch_get_main_queue(), ^{
        [currentView setCanvasText:arr];
    });
}


#pragma mark - Lifecycle

- (UIView *)view
{
    return [[RNSketchCanvas alloc] initWithEventDispatcher: self.bridge.eventDispatcher];
}

#pragma mark - Exported methods

RCT_EXPORT_METHOD(clearImages:(nonnull NSNumber *)reactTag)
{

    [self runCanvas:reactTag block:^(RNSketchCanvas *canvas) {
        [canvas clearImages];
    }];
}
RCT_EXPORT_METHOD(addOrSetImageOnCanvas:(nonnull NSNumber *)reactTag canvasImage:(NSDictionary *) canvasImage)
{
    NSDictionary *dict = [RCTConvert NSDictionary:canvasImage];

    [self runCanvas:reactTag block:^(RNSketchCanvas *canvas) {
        [canvas addOrSetImageOnCanvas:dict];
    }];
}


RCT_EXPORT_METHOD(setCanvasImagePosition:(nonnull NSNumber *)reactTag canvasImage:(NSDictionary *) canvasImage)
{
    NSDictionary *dict = [RCTConvert NSDictionary:canvasImage];

    [self runCanvas:reactTag block:^(RNSketchCanvas *canvas) {
        [canvas setCanvasImagePosition:dict];
    }];
}


RCT_EXPORT_METHOD(getPathIds:(nonnull NSNumber *)reactTag :(RCTResponseSenderBlock)callback)
{
    [self runCanvas:reactTag block:^(RNSketchCanvas *canvas) {
        callback(@[[canvas getPathIds]]);
                 
    }];
}

RCT_EXPORT_METHOD(getImageIds:(nonnull NSNumber *)reactTag :(RCTResponseSenderBlock)callback)
{
    [self runCanvas:reactTag block:^(RNSketchCanvas *canvas) {
        callback(@[[canvas getImageIds]]);
    }];
}


RCT_EXPORT_METHOD(save:(nonnull NSNumber *)reactTag type:(NSString*) type folder:(NSString*) folder filename:(NSString*) filename withTransparentBackground:(BOOL) transparent includeImage:(BOOL)includeImage includeText:(BOOL)includeText cropToImageSize:(BOOL)cropToImageSize scaleToSize:(CGSize)scaleToSize)
{
    [self runCanvas:reactTag block:^(RNSketchCanvas *canvas) {
        [canvas saveImageOfType:type folder:folder filename:filename withTransparentBackground:transparent includeImage:includeImage includeText:includeText cropToImageSize:cropToImageSize scaleToSize:scaleToSize];
    }];
}

RCT_EXPORT_METHOD(export:(nonnull NSNumber *)reactTag type:(NSString*) type scaleToSize:(CGSize)scaleToSize :(RCTResponseSenderBlock)callback)
{
    NSString* tmpFileName = [NSString stringWithFormat:@"%f%d@", [[NSDate date] timeIntervalSinceReferenceDate],arc4random()%1000];
    
    [self runCanvas:reactTag block:^(RNSketchCanvas *canvas) {
        callback(@[[NSNull null], [canvas saveImageOfType:type folder:@"export-canvas" filename:tmpFileName withTransparentBackground:NO includeImage:YES includeText:YES cropToImageSize:NO scaleToSize:scaleToSize]]);
    }];
}
    


RCT_EXPORT_METHOD(addPoint:(nonnull NSNumber *)reactTag x: (float)x y: (float)y)
{
    [self runCanvas:reactTag block:^(RNSketchCanvas *canvas) {
        [canvas addPointX:x Y:y];
    }];
}

RCT_EXPORT_METHOD(addPath:(nonnull NSNumber *)reactTag pathId: (int) pathId strokeColor: (UIColor*) strokeColor strokeWidth: (int) strokeWidth points: (NSArray*) points dash: (CGFloat)dash dashGap: (CGFloat)dashGap phase:(double) phase)
{
    NSMutableArray *cgPoints = [[NSMutableArray alloc] initWithCapacity: points.count];
    for (NSString *coor in points) {
        NSArray *coorInNumber = [coor componentsSeparatedByString: @","];
        [cgPoints addObject: [NSValue valueWithCGPoint: CGPointMake([coorInNumber[0] floatValue], [coorInNumber[1] floatValue])]];
    }

    [self runCanvas:reactTag block:^(RNSketchCanvas *canvas) {
        [canvas addPath: pathId strokeColor: strokeColor strokeWidth: strokeWidth points: cgPoints dash: dash dashGap:dashGap phase: phase]; 
    }];
}

RCT_EXPORT_METHOD(newPath:(nonnull NSNumber *)reactTag pathId: (int) pathId strokeColor: (UIColor*) strokeColor strokeWidth: (int) strokeWidth)
{
    [self runCanvas:reactTag block:^(RNSketchCanvas *canvas) {
        [canvas newPath: pathId strokeColor: strokeColor strokeWidth: strokeWidth];
    }];
}

RCT_EXPORT_METHOD(deletePath:(nonnull NSNumber *)reactTag pathId: (int) pathId)
{
    [self runCanvas:reactTag block:^(RNSketchCanvas *canvas) {
        [canvas deletePath: pathId];
    }];
}

RCT_EXPORT_METHOD(deleteImage:(nonnull NSNumber *)reactTag imageId: (NSString*) imageId)
{
    [self runCanvas:reactTag block:^(RNSketchCanvas *canvas) {
        [canvas deleteImage: imageId];
    }];
}


RCT_EXPORT_METHOD(endPath:(nonnull NSNumber *)reactTag)
{
    [self runCanvas:reactTag block:^(RNSketchCanvas *canvas) {
        [canvas endPath];
    }];
}

RCT_EXPORT_METHOD(clear:(nonnull NSNumber *)reactTag)
{
    [self runCanvas:reactTag block:^(RNSketchCanvas *canvas) {
        [canvas clear];
    }];
}

RCT_EXPORT_METHOD(detectTextsInBackgroundImage:(nonnull NSNumber *)reactTag :(RCTResponseSenderBlock)callback)
{
    [self runCanvas:reactTag block:^(RNSketchCanvas *canvas) {
        callback(@[[canvas detectTextsInBackgroundImage]]);
    }];
}

RCT_REMAP_METHOD(measureText,
                 measureTextWithReactTag:(nonnull NSNumber *)reactTag
                 text:(NSString *)text
                 maxWidth:(CGFloat)maxWidth
                 attributes:(NSDictionary *)attributes
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
    [self runCanvas:reactTag block:^(RNSketchCanvas *canvas) {
        NSDictionary *size = [canvas measureText:text maxWidth:maxWidth attributes:attributes];
        resolve(size);
    }];
}


RCT_EXPORT_METHOD(readoutText:(nonnull NSString *) text)
{
    if ([text length] > 0) {
        // Initialize the synthesizer
        //AVSpeechSynthesizer *synthesizer = [[AVSpeechSynthesizer alloc] init];
        
        // Create an utterance object with the text to be read out
        AVSpeechUtterance *utterance = [AVSpeechUtterance speechUtteranceWithString:text];
        
        // Create a language tagger and analyze the text
        NSLinguisticTagger *tagger = [[NSLinguisticTagger alloc] initWithTagSchemes:@[NSLinguisticTagSchemeLanguage] options:0];
        [tagger setString:text];
        NSString *language = [tagger tagAtIndex:0 scheme:NSLinguisticTagSchemeLanguage tokenRange:nil sentenceRange:nil];
        
        if (language != nil) {
            
            if ([language isEqualToString:@"en"]) {
                utterance.voice = [AVSpeechSynthesisVoice voiceWithLanguage:@"en-US"];
            } else if ([language isEqualToString:@"he"]) {
                utterance.voice = [AVSpeechSynthesisVoice voiceWithLanguage:@"he-IL"];
            } else if ([language isEqualToString:@"ar"]) {
                utterance.voice = [AVSpeechSynthesisVoice voiceWithLanguage:@"ar-SA"];
            }

            // Speak the utterance using the synthesizer
            //[synthesizer speakUtterance:utterance];
            [self.speechSynthesizer speakUtterance:utterance];
        }
    }
}


RCT_EXPORT_METHOD(transferToBase64:(nonnull NSNumber *)reactTag type: (NSString*) type withTransparentBackground:(BOOL) transparent includeImage:(BOOL)includeImage includeText:(BOOL)includeText cropToImageSize:(BOOL)cropToImageSize :(RCTResponseSenderBlock)callback)
{
    [self runCanvas:reactTag block:^(RNSketchCanvas *canvas) {
        callback(@[[NSNull null], [canvas transferToBase64OfType: type withTransparentBackground: transparent includeImage:includeImage includeText:includeText cropToImageSize:cropToImageSize]]);
    }];
}

#pragma mark - Utils

- (void)runCanvas:(nonnull NSNumber *)reactTag block:(void (^)(RNSketchCanvas *canvas))block {
    [self.bridge.uiManager addUIBlock:
     ^(__unused RCTUIManager *uiManager, NSDictionary<NSNumber *, RNSketchCanvas *> *viewRegistry){

         RNSketchCanvas *view = viewRegistry[reactTag];
         if (!view || ![view isKindOfClass:[RNSketchCanvas class]]) {
             // RCTLogError(@"Cannot find RNSketchCanvas with tag #%@", reactTag);
             return;
         }

         block(view);
     }];
}

@end
