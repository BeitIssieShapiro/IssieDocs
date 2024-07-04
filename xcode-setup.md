## fonts
alef
alef_bold
material.ttf

## permission
info.plist
IssieDocs.entitlements

verify AppGroup capability and issiedocs capability is checked

# Launch screen

# Camera kit:
- see if 14 is out (now on beta)
- podspec file needs to point to ios15 

# ViewProps
in node_modules/react-native/index.js
```
get ViewPropTypes(): $FlowFixMe {
    // console.error(
    //   'ViewPropTypes will be removed from React Native, along with all ' +
    //     'other PropTypes. We recommend that you migrate away from PropTypes ' +
    //     'and switch to a type system like TypeScript. If you need to ' +
    //     'continue using ViewPropTypes, migrate to the ' +
    //     "'deprecated-react-native-prop-types' package.",
    // );
    return require('deprecated-react-native-prop-types').ViewPropTypes;
  },
```
## add linking
follow: `https://reactnative.dev/docs/linking`


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

## apply fix to multiline textInput
https://github.com/facebook/react-native/pull/37958/files