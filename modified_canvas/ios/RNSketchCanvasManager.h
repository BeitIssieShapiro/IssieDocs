#import <React/RCTViewManager.h>
#import "RNSketchCanvas.h"
#import <AVFoundation/AVFoundation.h>


@interface RNSketchCanvasManager : RCTViewManager
@property (nonatomic, strong) AVSpeechSynthesizer *speechSynthesizer;

@end
