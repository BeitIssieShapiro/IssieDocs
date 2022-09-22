## fonts
alef
alef_bold
material.ttf

## permission
info.plist
IssieDocs.entitlements

# Launch screen


## change to RCTLinkingManager.mm:
line 17:
`static NSString *savedEvent = nil;`

at startObserving, at its end:
```
if (savedEvent != nil) {
        NSDictionary<NSString *, id> *payload = @{@"url": savedEvent};
        [self sendEventWithName:@"url" body:payload];
        savedEvent = nil;
    }
```

at application:openURL:options
```
    // if event was missed, save it for later firing
    savedEvent = URL.absoluteString;
```
