import SwiftUI
import Translation

// MARK: - Content View
//
// Root view. Composes the camera preview, language selector, translation result
// panel, and pause/resume control. Wires up CameraManager → OCRService →
// TranslationService using closures so each layer stays independent.

struct ContentView: View {

    @StateObject private var cameraManager     = CameraManager()
    @StateObject private var translationService = TranslationService()

    // OCRService is stateless; no need for @StateObject.
    private let ocrService = OCRService()

    var body: some View {
        ZStack {
            cameraBackground
            overlayContent
        }
        .ignoresSafeArea()
        .onAppear(perform: setupCamera)
        .onDisappear { cameraManager.stop() }
        // Start the session as soon as permission is obtained.
        .onChange(of: cameraManager.permissionGranted) { _, granted in
            if granted { cameraManager.start() }
        }
        // .translationTask fires once on appear and again whenever
        // translationService.configuration changes (i.e. language switch).
        .translationTask(translationService.configuration) { session in
            await translationService.setSession(session)
        }
    }

    // MARK: - Camera Background

    @ViewBuilder
    private var cameraBackground: some View {
        if cameraManager.permissionGranted {
            CameraPreviewView(session: cameraManager.captureSession)
                .ignoresSafeArea()
        } else {
            Color.black.ignoresSafeArea()
        }
    }

    // MARK: - Overlay

    private var overlayContent: some View {
        VStack(spacing: 0) {
            if !cameraManager.permissionGranted {
                // Full-screen permission prompt (camera bg is black anyway).
                PermissionView()
            } else {
                // Top: language selector
                LanguageSelectorView(
                    selectedLanguage: translationService.targetLanguage,
                    onSelect: { translationService.changeLanguage(to: $0) }
                )
                .padding(.top, 54)
                .padding(.horizontal, 16)

                Spacer()

                // Paused badge
                if !cameraManager.isRunning {
                    Text("Paused")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(.white)
                        .padding(.vertical, 5)
                        .padding(.horizontal, 14)
                        .background(.ultraThinMaterial, in: Capsule())
                        .padding(.bottom, 10)
                        .transition(.opacity)
                }

                // Bottom: translation result card
                TranslationResultView(
                    result:        translationService.result,
                    isTranslating: translationService.isTranslating
                )
                .padding(.horizontal, 16)

                // Pause / Resume button
                ControlBarView(isRunning: cameraManager.isRunning) {
                    cameraManager.toggleRunning()
                }
                .padding(.top, 12)
                .padding(.bottom, 44)
            }
        }
    }

    // MARK: - Setup

    private func setupCamera() {
        // Capture the TranslationService object directly to avoid capturing
        // the struct (which is recreated on each render).
        let ts = translationService

        cameraManager.onFrame = { pixelBuffer in
            // Called on the camera frame queue; OCR happens here too.
            ocrService.recognizeKoreanText(in: pixelBuffer) { texts in
                guard !texts.isEmpty else { return }
                DispatchQueue.main.async {
                    ts.translate(texts: texts)
                }
            }
        }

        cameraManager.requestPermission()
    }
}

#Preview {
    ContentView()
}
