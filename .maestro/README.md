# Maestro flows (smoke e2e)

The full e2e suite is Detox (`e2e/`). These Maestro flows are a lighter smoke check that
runs on any installed build (no Detox test build):

    maestro test .maestro/                                       # iOS, com.issieshapiro.issiedoc.IssieDoc
    maestro test -e APP_ID=org.issieshapiro.issiedocs .maestro/  # Android

`add-page-to-worksheet.yaml` was in e2e/ before; it keeps real user data (no clearState).

With a **Debug** build the app loads JS from Metro on port 8084, but Maestro launches it without
launch args. Point it at 8084 first:

    xcrun simctl spawn <udid> defaults write com.issieshapiro.issiedoc.IssieDoc RCT_jsLocation localhost:8084   # iOS
    (cd android && ./gradlew :app:assembleDebug -PreactNativeDevServerPort=8084); adb reverse tcp:8084 tcp:8084  # Android

Notes:
- The native splash fades out over the home screen for ~2-3 s and swallows taps; Maestro can't
  see it, so the flows tap `new-page-btn` until the menu shows.
- Maestro matches the iOS accessibility tree. A touchable is one accessibility element whose label
  merges its children (rounded buttons read "Save, "; worksheet rows "<name>, <icon>"), so the flows
  use testIDs for those.
