#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(SpeechTranscription, RCTEventEmitter)

RCT_EXTERN_METHOD(startTranscription:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(stopTranscription)
RCT_EXTERN_METHOD(setLanguage:(NSString *)lang)
RCT_EXTERN_METHOD(attachToKeyboard:(BOOL)textToolsEnabled speakDictateEnabled:(BOOL)speakDictateEnabled)
RCT_EXTERN_METHOD(detachFromKeyboard)
RCT_EXTERN_METHOD(refreshToolbar)
RCT_EXTERN_METHOD(updateFormattingState:(NSDictionary *)state)
RCT_EXTERN_METHOD(startSpeaking:(NSString *)text fallbackLanguage:(NSString *)fallbackLanguage speechRate:(float)speechRate)
RCT_EXTERN_METHOD(stopSpeaking)

@end
