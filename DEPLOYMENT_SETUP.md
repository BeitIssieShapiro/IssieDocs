# IssieDocs Setup for Centralized Deployment

IssieDocs has been configured to use the centralized deployment system from `issie-shared`.

## Changes Made

### 1. Added to Signing Configuration
**File**: `issie-shared/android/keys/signing-config.properties`
```properties
issie.main.projects=issieboard,issievoice,issiesays,issiedocs
```

IssieDocs now uses the same keystore as other Issie apps.

### 2. Created Version Properties
**File**: `IssieDocs/android/version.properties`
```properties
issiedocs.versionCode=14
issiedocs.versionName=1.6
```

### 3. Updated build.gradle
**File**: `IssieDocs/android/app/build.gradle`

- Added version properties loader
- Changed versionCode/versionName to read from properties
- Fixed release buildType to use `signingConfigs.release` (not debug!)
- Applied shared signing configuration

### 4. Added Deployment Script
**File**: `IssieDocs/package.json`
```json
"deploy:android:issiedocs": "PROJECT_ROOT=$(pwd) ../issie-shared/android/deploy.sh issiedocs org.issieshapiro.issiedocs"
```

### 5. Fixed jcenter() Deprecation Issue
**Issue**: The `react-native-exception-handler` dependency uses the deprecated `jcenter()` repository that has been removed in newer Gradle versions.

**Fix**: Created a patch-package patch that automatically replaces `jcenter()` with `mavenCentral()` in `node_modules/react-native-exception-handler/android/build.gradle`.

**File**: `patches/react-native-exception-handler+2.10.10.patch`

The patch is automatically applied when running `npm install` via the `postinstall` script.

## Usage

Deploy IssieDocs to Google Play:
```bash
cd /Users/i022021/dev/Issie/IssieDocs
npm run deploy:android:issiedocs
```

This will:
1. ✅ Load signing config from `issie-shared` (same keys as IssieSays)
2. ✅ Read version from `version.properties`
3. ✅ Increment version code to 15
4. ✅ Build signed AAB
5. ✅ Upload to Google Play Internal Track as draft
6. ✅ Commit version bump

## Prerequisites

**Java Development Kit (JDK) Required**

Android builds require Java to be installed. If you see errors like:
```
The operation couldn't be completed. Unable to locate a Java Runtime.
```

You need to install Java. Options:
1. Install OpenJDK via Homebrew: `brew install openjdk@17`
2. Download from Oracle or AdoptOpenJDK
3. Install Android Studio (includes JDK)

After installation, set JAVA_HOME:
```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
```

## Verification

Test the signing configuration:
```bash
cd /Users/i022021/dev/Issie/IssieDocs/android
./gradlew app:signingReport
```

Should show:
```
✅ Loaded signing config for 'issiedocs' from keystore group 'main'
   Keystore: uploadkeystore.jks
```

## Summary

IssieDocs now uses:
- ✅ **Shared Fastlane** from `issie-shared/android/fastlane/`
- ✅ **Shared deployment script** (`deploy.sh`)
- ✅ **Shared signing keys** (same as IssieSays, IssieBoard, IssieVoice)
- ✅ **Centralized signing config** (no per-project keystore paths)
- ✅ **Version management** via `version.properties`
- ✅ **Automated patch** for jcenter() deprecation issue
- ⚠️  **Requires Java** to be installed for builds

No project-specific signing configuration needed!
