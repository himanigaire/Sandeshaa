# Sandeshaa Android – React Native CLI

Secure messaging Android app built with React Native CLI (no Expo).

## Architecture

```
SandeshaaAndroid/
├── src/
│   ├── config.ts          ← API endpoints (Render backend)
│   ├── api.ts             ← HTTP client (axios) with auth interceptors
│   ├── crypto.ts          ← E2EE: tweetnacl + react-native-keychain
│   ├── storage.ts         ← Token & data storage (Keychain + AsyncStorage)
│   ├── navigation/
│   │   └── AppNavigator.tsx  ← React Navigation stack
│   └── screens/
│       ├── LoginScreen.tsx
│       ├── RegisterScreen.tsx
│       ├── ChatsScreen.tsx
│       └── ChatScreen.tsx
├── android/               ← Native Android project
├── App.tsx                ← Entry point
└── index.js               ← RN registry
```

## Expo → RN CLI Migration Map

| Expo Package | RN CLI Replacement |
|---|---|
| expo-secure-store | react-native-keychain |
| expo-random | react-native-get-random-values |
| expo-document-picker | react-native-document-picker |
| expo-file-system | react-native-fs |
| expo-router | @react-navigation/native-stack |
| expo-image | React Native Image |
| expo-haptics | (removed – not critical) |

## Prerequisites

1. **Android Studio** – https://developer.android.com/studio
2. **Android SDK** – Platform 34, Build-Tools 34, Emulator, Platform-Tools
3. **Java JDK 17** – Required for Gradle builds
4. **Node.js 18+**

## Setup

### 1. Set environment variables (~/.zshrc)
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### 2. Set SDK path (android/local.properties)
```
sdk.dir=/Users/himani/Library/Android/sdk
```

### 3. Install & Run
```bash
npm install
npx react-native start          # Metro bundler
npx react-native run-android    # Build + install
```

### 4. Release APK
```bash
cd android && ./gradlew assembleRelease
# Output: android/app/build/outputs/apk/release/app-release.apk
```

## Security
- E2EE via NaCl box (tweetnacl)
- Hardware-backed token storage (react-native-keychain → Android Keystore)
- bcrypt password hashing (server-side)
- Messages auto-delete after 7 days, files after 24 hours
