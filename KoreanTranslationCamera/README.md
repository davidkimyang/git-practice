# KoreanTranslationCamera

A personal-use iOS app that detects Korean text through the live camera feed and translates it into English, Japanese, or Simplified Chinese in near real time.

## Requirements

| Requirement | Value |
|---|---|
| Platform | iPhone only |
| iOS deployment target | **17.4+** |
| Xcode | 15.4+ |
| Swift | 5.10+ |

> **Why iOS 17.4?** The app uses Apple's built-in `Translation` framework (`import Translation`), which was introduced in iOS 17.4. No API key or internet connection is required — language models are downloaded once from Apple's servers and cached on-device.

---

## Features

- **Live camera preview** — full-screen, portrait-locked
- **Korean OCR** via Apple Vision (`VNRecognizeTextRequest`)
- **On-device translation** via Apple Translation framework
- **Target languages** — English · Japanese · Simplified Chinese
- **Frame throttling** — processes one frame every ~0.75 s to avoid flicker
- **Translation cache** — repeated text reuses the last result instantly
- **Pause / Resume** scanning with a single tap
- **Permission handling** — shows a Settings deep-link if camera is denied

---

## Architecture

```
KoreanTranslationCamera/
├── KoreanTranslationCameraApp.swift   Entry point (@main)
├── ContentView.swift                  Root view; wires all layers together
│
├── Models/
│   └── AppModels.swift                SupportedLanguage enum, TranslationResult struct
│
├── Camera/
│   ├── CameraManager.swift            AVCaptureSession, permission, frame throttling
│   └── CameraPreviewView.swift        UIViewRepresentable wrapping AVCaptureVideoPreviewLayer
│
├── Services/
│   ├── OCRService.swift               Vision text recognition (Korean filter)
│   └── TranslationService.swift       Apple Translation session + cache
│
└── Views/
    ├── LanguageSelectorView.swift     Horizontal language pill row (top)
    ├── TranslationResultView.swift    Frosted-glass result card (bottom)
    ├── ControlBarView.swift           Pause / Resume button
    └── PermissionView.swift           Camera permission denied screen
```

### Data flow

```
CameraManager
    │  CVPixelBuffer (every 0.75 s)
    ▼
OCRService                   Vision VNRecognizeTextRequest
    │  [String] Korean text
    ▼
TranslationService           Apple Translation session
    │  TranslationResult
    ▼
ContentView / TranslationResultView
```

---

## Setup in Xcode

1. Clone or download this repository.
2. Open `KoreanTranslationCamera.xcodeproj` in **Xcode 15.4+**.
3. Select your **development team** in *Signing & Capabilities* (required to run on a real device).
4. Change the bundle identifier if needed (`com.personal.KoreanTranslationCamera`).
5. Connect a physical iPhone running **iOS 17.4+** (camera doesn't work in Simulator).
6. Build & Run (`⌘R`).

> **Note:** The first time you select each target language, iOS may download the language model in the background (~100–200 MB per language pair). A network connection is needed for this one-time download.

---

## Usage

1. Grant camera permission when prompted.
2. Select a target language from the pills at the top.
3. Point the camera at Korean text (restaurant signs, menus, etc.).
4. The translation appears in the frosted card at the bottom within ~1 second.
5. Tap **Pause** to freeze scanning; tap **Resume** to continue.

---

## Limitations (MVP)

- Printed text only — no handwriting support
- Portrait orientation only
- No history or save feature
- No offline mode (initial language model download requires internet)
- No document scanning or freeze-frame inspection
