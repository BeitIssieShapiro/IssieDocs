# IssieDocs - Development Guide

## Prerequisites

### Required Tools
- **macOS** (for iOS development)
- **Xcode** (latest version)
- **CocoaPods**: `sudo gem install cocoapods`
- **React Native CLI**: Install via npm
- **Node.js**: Version 20 or higher
- **Android Studio** (for Android development)

## Initial Setup

### Clone and Install
```bash
# Clone repository
git clone https://github.com/BeitIssieShapiro/IssieDocs.git
cd IssieDocs

# Install dependencies
npm install

# Install iOS pods
cd ios
pod install
cd ..
```

## Running the Application

### iOS Development
```bash
# Run on iOS simulator
react-native run-ios --configuration Release --simulator "iPad Pro (9.7-inch)"

# List available simulators
xcrun simctl list devices

# Open in Xcode
# Open: ./ios/IssieDocs.xcworkspace
```

### Android Development
```bash
# Run on Android emulator/device
react-native run-android
```

## Build Process

### iOS Build
1. Open `IssieDocs.xcworkspace` in Xcode
2. Select target device/simulator
3. Build and run from Xcode

### Android Build

#### Clean Build (Recommended)
Often necessary for Android builds to work properly:

```bash
cd android

# Delete build artifacts
rm -rf build
rm -rf app/.cxx
rm -rf app/build

# Clean Gradle
./gradlew clean

# Build debug APK
./gradlew assembleDebug
```

#### Release Build
Before building a release, update version in `android/app/build.gradle`:

```gradle
versionCode <code>         // e.g. 5
versionName "<version>"    // e.g. "1.1"
```

Then build:
```bash
./gradlew bundleRelease
```

## NPM Package Patches

### Applying Patches
Patches are automatically applied after `npm install` via `postinstall` script.

### Creating New Patches
When you need to modify an npm package:

```bash
# Make changes to node_modules/<package>
# Then create patch
npx patch-package <package-name> --exclude "android/build"

# Example for PDF thumbnail:
npx patch-package react-native-pdf-thumbnail --exclude "android/build"
```

### Current Patches
Located in `patches/` directory:
1. `@react-navigation+stack+7.6.4.patch` - Header behavior fixes
2. `@dashdoc+react-native-system-sounds+1.1.0.patch` - Compilation fixes
3. `react-native-pdf-thumbnail+1.3.1.patch` - Compilation fixes

## Known Build Issues

### iOS Issues

#### CocoaPods Installation Failure
If `pod install` fails on glog:
- See: https://stackoverflow.com/questions/50448717/os-pod-install-error-module-glog-cannot-be-installed

#### TextInput First Character Issue
Temporary fix in `RCTBackedTextFieldDelegateAdapter.m`:
```objc
- (void)textViewDidChange:(__unused UITextView *)textView
{
  if (_ignoreNextTextInputCall && [_lastStringStateWasUpdatedWith isEqual:_backedTextInputView.attributedText]) {
    _ignoreNextTextInputCall = NO;
    return;
  }
  _textDidChangeIsComing = NO;
  [_backedTextInputView.textInputDelegate textInputDidChange];
}
```

### Android Issues
- Most issues resolved with clean builds
- Always delete build directories when encountering errors
- Version must be bumped for each Play Store upload

## Development Workflow

### Starting Metro Bundler
```bash
npm start
# or
react-native start
```

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

## Creating From Scratch

If starting a new React Native project based on IssieDocs:

```bash
# Initialize new React Native project
npx @react-native-community/cli@latest init IssieDocs

# Copy dependencies to package.json
# Adjust Podfile (setup_permissions, RNLocalize)
# Replace AppDelegate.swift
# Add bridging header with splash.h
# Copy LaunchScreen, fonts, Info.plist, entitlements, assets
```

## Hot Reload & Fast Refresh

React Native Fast Refresh is enabled by default:
- Save files to see changes instantly
- Component state is preserved during refresh
- Errors are displayed in-app

## Debugging

### React Native Debugger
- Shake device/simulator to open developer menu
- Enable "Debug" to connect to Chrome DevTools
- Use React DevTools for component inspection

### Console Logging
```javascript
import { trace } from './src/log';

trace("Debug message", variable);
```

### Xcode Debugging
- Set breakpoints in Swift/Objective-C code
- View native logs in Xcode console

### Android Debugging
- Use Android Studio Logcat
- Filter by "ReactNative" or "IssieDocs"

## File System Structure

### App Data Location
- iOS: App Documents directory
- Android: External storage (with permissions)

### Folder Structure
```
Documents/
├── FolderName/
│   ├── metadata.json        # Folder icon, color
│   ├── DocumentName/
│   │   ├── page1.jpg
│   │   ├── page2.jpg
│   │   ├── metadata.json    # Page elements
│   │   └── thumbnails/
│   │       ├── page1.jpg
│   │       └── page2.jpg
│   └── ...
└── ...
```

## Common Development Tasks

### Adding a New Screen
1. Create component file in `src/`
2. Add screen to Stack Navigator in `src/App.js`
3. Define route params in `src/types.ts`

### Adding a New Canvas Element Type
1. Define type in `src/canvas/types.tsx`
2. Add rendering logic in `src/canvas/canvas-elements.tsx`
3. Update toolbar in `src/editor-toolbar.js`
4. Add undo/redo support in `src/do-queue.js`

### Adding a New Setting
1. Add setting key to `src/settings.js`
2. Add UI in `src/settings-ui.js`
3. Use `Settings.get()` and `Settings.set()` from `src/new-settings.ts`

## Performance Profiling

### React Native Performance Monitor
- Enable via developer menu
- Shows FPS, JS thread performance
- Monitor for dropped frames

### Xcode Instruments
- Profile memory usage
- CPU profiling
- Network activity

## Version Control

### Branch Strategy
- Main branch for stable releases
- Feature branches for development
- Test thoroughly before merging

### Commit Messages
Follow conventional commits format:
```
feat: Add table resizing feature
fix: Resolve text overflow in tables
docs: Update README with Android build steps
```

## Testing

### Unit Tests
- Located in `__tests__/`
- Run with `npm test`
- Use Jest framework

### Manual Testing Checklist
- [ ] Camera capture
- [ ] Text input and editing
- [ ] Drawing with brush and marker
- [ ] Audio recording and playback
- [ ] Image insertion
- [ ] Table creation and editing
- [ ] Multi-page documents
- [ ] Folder management
- [ ] Export/share functionality
- [ ] Backup and restore
- [ ] RTL/LTR language switching

## Troubleshooting

### Metro Bundler Issues
```bash
# Clear cache
npm start -- --reset-cache

# Clean watchman
watchman watch-del-all
```

### iOS Build Issues
```bash
# Clean build
cd ios
rm -rf build
rm -rf Pods
pod install
cd ..
```

### Android Build Issues
```bash
cd android
./gradlew clean
rm -rf .gradle
cd ..
```

### Node Modules Issues
```bash
# Clean reinstall
rm -rf node_modules
rm package-lock.json
npm install
