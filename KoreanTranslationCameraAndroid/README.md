# KoreanTranslationCamera — Android

Android version of the Korean sign/menu real-time translation camera app.
Mirrors the iOS version's architecture: CameraManager → OCRService → TranslationService.

## Requirements

| Requirement | Value |
|---|---|
| Platform | Android |
| Min SDK | 26 (Android 8.0 Oreo) |
| Target SDK | 34 (Android 14) |
| Android Studio | Hedgehog (2023.1) or newer |
| Language | Kotlin |
| UI | Jetpack Compose + Material 3 |

---

## Tech Stack

| Concern | Library |
|---|---|
| Camera preview & frame capture | CameraX |
| Korean OCR | ML Kit Text Recognition (Korean model) |
| Translation | ML Kit on-device Translation |
| UI | Jetpack Compose + Material 3 |
| Permissions | Accompanist Permissions |

> **Internet required on first run** — ML Kit downloads the Korean recognizer model and each translation language model (~50 MB each) once, then caches them on-device for offline use.

---

## Architecture

```
KoreanTranslationCameraAndroid/
├── app/src/main/java/com/personal/koreantranslation/
│   ├── MainActivity.kt           Entry point
│   ├── MainViewModel.kt          Coordinates services; exposes Compose state
│   │
│   ├── models/
│   │   └── AppModels.kt          SupportedLanguage, TranslationResult, ModelDownloadState
│   │
│   ├── camera/
│   │   └── CameraManager.kt      CameraX session + ThrottledAnalyzer (0.75 s)
│   │
│   ├── services/
│   │   ├── OCRService.kt         ML Kit Korean text recognition
│   │   └── TranslationService.kt ML Kit translation + result cache
│   │
│   └── ui/
│       ├── MainScreen.kt         Root composable; permission gate + camera overlay
│       ├── LanguageSelectorView.kt  Horizontal language pill row
│       ├── TranslationResultView.kt Frosted result card + loading/hint states
│       ├── ControlBarView.kt     Pause / Resume button
│       ├── PermissionView.kt     Camera permission denied screen
│       └── theme/
│           └── Theme.kt          Dark Material 3 theme
```

### Data flow

```
CameraManager (CameraX ImageAnalysis)
    │  ImageProxy every 0.75 s
    ▼
MainViewModel.processFrame()
    │
    ├─→ OCRService (ML Kit Korean recognizer)
    │       │  List<String> Korean text blocks
    │       ▼
    └─→ TranslationService (ML Kit on-device translation)
                │  TranslationResult
                ▼
           Compose UI (MainScreen)
```

---

## Setup in Android Studio

1. Clone or download this repository.
2. Open the `KoreanTranslationCameraAndroid/` folder in **Android Studio**.
3. Let Gradle sync finish (first sync downloads dependencies).
4. Connect a physical Android device running **Android 8.0+** (camera doesn't work in the Emulator for ML Kit reliably).
5. Run the app (`▶ Run`).
6. Grant camera permission when prompted.
7. On first launch, wait for the language model to download (requires internet, ~50 MB).

---

## Usage

1. Tap a language pill at the top to set the target language.
2. Point the camera at Korean text (restaurant signs, menus, etc.).
3. The translation appears in the dark card at the bottom within ~1 second.
4. Tap **Pause** to freeze scanning; tap **Resume** to continue.

---

## Differences from iOS version

| Aspect | iOS | Android |
|---|---|---|
| Camera | AVFoundation | CameraX |
| OCR | Apple Vision | ML Kit Korean Text Recognition |
| Translation | Apple Translation framework (on-device) | ML Kit on-device Translation |
| Min OS | iOS 17.4 | Android 8.0 (API 26) |
| Model download | Apple handles automatically | ML Kit downloads on first use |
| Translation cache | In-memory dict | LinkedHashMap (LRU-style) |
