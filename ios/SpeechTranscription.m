#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(SpeechTranscription, RCTEventEmitter)

RCT_EXTERN_METHOD(startTranscription:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(stopTranscription)
RCT_EXTERN_METHOD(setLanguage:(NSString *)lang)
RCT_EXTERN_METHOD(attachToKeyboard)
RCT_EXTERN_METHOD(detachFromKeyboard)
RCT_EXTERN_METHOD(updateFormattingState:(NSDictionary *)state)

@end
