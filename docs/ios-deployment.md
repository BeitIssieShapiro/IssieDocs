# iOS deployment

The deployment command builds a signed Release archive and uploads it to TestFlight using Fastlane, following the approach used by `born2win`.

| Setting | IssieDocs value |
| --- | --- |
| Bundle ID | `com.issieshapiro.issiedoc.IssieDoc` |
| App Store Connect app ID | `1469032311` |
| Apple team | `SKNJT9TD9G` |
| Workspace | `ios/IssieDocs.xcworkspace` |
| Scheme | `IssieDocs` |

## Setup

Use macOS with full Xcode, Node.js matching `package.json`, and Ruby 3.2 or newer. The wrapper selects Homebrew Ruby when installed. Install JavaScript dependencies with `npm ci`.

The command installs its Fastlane and CocoaPods dependencies from `ios/Gemfile.lock` into `vendor/bundle/ios`. It installs pods using the existing `Podfile.lock`.

Add the following settings to the root `.env`, which is ignored by Git.

```dotenv
APPLE_TEAM_ID=SKNJT9TD9G
ASC_KEY_ID=your_key_id
ASC_ISSUER_ID=your_issuer_id
ASC_KEY_PATH=/absolute/path/to/AuthKey_YOUR_KEY_ID.p8
```

The key file can be shared by the Issie applications belonging to this Apple team. Keep it outside the repository. Exported environment variables take precedence over `.env`.

To obtain a team key, open App Store Connect and choose **Users and Access → Integrations → App Store Connect API → Team Keys**. Generate a key with **Admin** access for automatic certificate and provisioning-profile management. Download the `.p8` file, then copy its Key ID and the Issuer ID displayed on the page. Apple permits one download of the private key. The Account Holder may need to request API access first.

## Commands

Check local configuration, Xcode and read access to the app's TestFlight builds.

```sh
npm run deploy:ios -- check
```

Build and upload to TestFlight.

```sh
npm run deploy:ios
```

`npm run deploy:ios:issiedocs` runs the same deployment. Android's existing command is `npm run deploy:android:issiedocs`.

The marketing version comes from the Xcode project's Release settings. To use a different version for this archive, set `IOS_VERSION`.

```sh
IOS_VERSION=1.7.1 npm run deploy:ios
```

The build number is one greater than the larger of the local build number and the latest TestFlight build for the selected version. Fastlane obtains a distribution certificate and provisioning profile, archives the app, and uploads `ios/build/IssieDocs.ipa`. Signing overrides are applied to the app's Release configuration and restored after archiving, including on build failure. Version overrides apply to the archive.

The command finishes after upload. Apple's subsequent processing status appears in App Store Connect under TestFlight.

## Tests

Run the deployment regression tests.

```sh
npm run deploy:ios -- test
```

The tests evaluate the actual lane definitions against a temporary copy of the Xcode project. Signing, build and Apple API actions use recording stubs. Coverage includes app identity, version overrides, build numbering, missing credentials, restoring signing settings after failure, and the read-only check lane. A successful check verifies App Store Connect access. A real archive and upload are required to validate native build and distribution signing end to end.
