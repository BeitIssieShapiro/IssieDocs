#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(KeyboardLanguage, RCTEventEmitter)

RCT_EXTERN_METHOD(getCurrentLanguage:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject)

@end
