# IssieDocs

אפליקציה המאפשרת לעבוד על מסמכים או דפי עבודה מודפסים באמצעות הקלדה: מצלמים את המסמך ואז ניתן להקליד ולסמן בכל מקום על גבי המסך. ניתן לשמור ולשלוח את המסמך ולארגן בתיקיות לפי נושאים.

פותחה בשיתוף עם חברת סאפ והמרכז לייעוץ טכנולוגי בבית איזי שפירא.

# Build instruction
Based on React-Native, currently only tested on iOS, in future can also run on Android.

## Prerequisites
- Mac OS
- XCode, latest version
- CocoaPods installed (usually `sudo gem install cocoapods`)
- React Native CLI is installed (https://www.npmjs.com/package/react-native-cli)

## Build steps
- Clone the repo: `git clone https://github.com/BeitIssieShapiro/IssieDocs.git`
- Go inside the directory: `cd IssieDocs`
- install dependencies: `npm install`
- Build pods: 
```
cd ios 
pod install
cd ..
```
- build and run using cli: `react-native run-ios --configuration Release --simulator "iPad Pro (9.7-inch)"`
  to see available simulators, run `xcrun simctl list devices`
- Open in XCode:
  Workspace would be under `./IssieDocs/ios/IssieDocs4/` IssieDocs4.xcworkspace



