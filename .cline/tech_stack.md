# IssieDocs - Technology Stack

## Core Framework
- **React Native**: 0.82.1
- **React**: 19.1.1
- **TypeScript**: 5.8.3
- **Node.js**: >=20

## Navigation & UI
- **@react-navigation/native**: ^7.1.20
- **@react-navigation/stack**: ^7.6.4 (with custom patches)
- **react-native-gesture-handler**: ^2.29.1
- **react-native-reanimated**: ^4.1.5
- **react-native-safe-area-context**: ^5.5.2
- **react-native-screens**: ^4.18.0
- **@react-native-material/core**: ^1.3.7

## Canvas & Graphics
- **@shopify/react-native-skia**: ^2.3.12 - Main canvas rendering engine
- **react-native-svg**: ^15.15.0 - SVG support
- **react-native-view-shot**: ^4.0.3 - Screenshot capabilities

## File System & Storage
- **react-native-fs**: ^2.20.0 - File operations
- **react-native-mmkv**: ^4.0.0 - Fast key-value storage
- **react-native-blob-util**: ^0.23.2 - Blob handling
- **react-native-zip-archive**: ^7.0.2 - ZIP operations for backup/restore

## Media & Camera
- **react-native-camera-kit**: ^16.1.3 - Camera integration
- **react-native-image-picker**: ^8.2.1 - Image selection
- **@bam.tech/react-native-image-resizer**: ^3.0.11 - Image optimization
- **@react-native-community/image-editor**: ^4.3.0 - Image editing
- **react-native-pdf-thumbnail**: ^1.3.1 - PDF thumbnail generation

## Audio
- **react-native-nitro-modules**: ^0.31.6
- **react-native-nitro-sound**: ^0.2.9 - Audio recording/playback
- **@dashdoc/react-native-system-sounds**: ^1.1.1 - System sounds

## PDF & Documents
- **@react-pdf/pdfkit**: ^4.0.4 - PDF generation
- **@react-native-documents/picker**: 11.0.0 - Document picking

## Internationalization
- **react-native-localize**: ^3.6.0 - Language/locale detection
- **text-encoding-polyfill**: ^0.6.7 - Text encoding support

## Utilities
- **react-native-uuid**: ^2.0.3 - UUID generation
- **react-native-share**: ^12.2.1 - Native sharing
- **react-native-permissions**: ^5.4.4 - Permission handling
- **react-native-popup-menu**: ^0.18.0 - Context menus
- **react-native-flash-message**: ^0.4.2 - Toast messages

## UI Components
- **@react-native-vector-icons/*** - Multiple icon sets (AntDesign, FontAwesome6, Ionicons, Material)
- **@react-native-community/slider**: ^5.1.1 - Slider component
- **react-native-circular-progress**: ^1.4.1 - Progress indicators
- **react-native-linear-gradient**: ^2.8.3 - Gradient backgrounds
- **react-native-wheel-color-picker**: ^1.3.1 - Color picker
- **react-native-progress**: ^5.0.1 - Progress components

## Development Tools
- **@babel/core**: ^7.25.2
- **@react-native/metro-config**: 0.82.1
- **@react-native/eslint-config**: 0.82.1
- **eslint**: ^8.19.0
- **prettier**: 2.8.8
- **jest**: ^29.6.3
- **patch-package**: ^8.0.1 - NPM package patching

## Patched Dependencies
The following packages have custom patches applied:
1. **@react-navigation/stack**: Header behavior customization for IssieDocs header
2. **@dashdoc/react-native-system-sounds**: Compilation error fixes
3. **react-native-pdf-thumbnail**: Compilation error fixes

## Platform-Specific
### iOS
- **CocoaPods** for dependency management
- Swift-based AppDelegate
- Custom fonts: Alef (Hebrew), DroidSans, Verdana

### Android
- Gradle build system
- Custom build configurations
