import Vision
import CoreVideo

// MARK: - OCR Service
//
// Uses Apple's Vision framework (VNRecognizeTextRequest) to detect Korean text
// from a CVPixelBuffer. Only results that contain at least one Hangul character
// are forwarded to the caller; everything else is discarded.
//
// The completion handler is always called on the caller's thread (the camera
// frame queue). Callers are responsible for dispatching to the main queue when
// updating UI.

final class OCRService {

    // MARK: - Public Interface

    func recognizeKoreanText(
        in pixelBuffer: CVPixelBuffer,
        completion: @escaping ([String]) -> Void
    ) {
        let request = VNRecognizeTextRequest { request, _ in
            let candidates = (request.results as? [VNRecognizedTextObservation] ?? [])
                .compactMap { $0.topCandidates(1).first?.string }
                .filter { Self.containsKorean($0) }

            completion(candidates)
        }

        // Korean requires .accurate for reasonable recognition quality.
        request.recognitionLanguages = ["ko-KR", "ko"]
        request.recognitionLevel     = .accurate
        request.usesLanguageCorrection = true

        // Portrait orientation: back camera captures in landscape-right.
        let handler = VNImageRequestHandler(
            cvPixelBuffer: pixelBuffer,
            orientation: .right,
            options: [:]
        )
        try? handler.perform([request])
    }

    // MARK: - Helpers

    private static func containsKorean(_ text: String) -> Bool {
        text.unicodeScalars.contains {
            (0xAC00...0xD7A3).contains($0.value) ||  // Hangul syllables
            (0x1100...0x11FF).contains($0.value) ||  // Hangul Jamo
            (0x3130...0x318F).contains($0.value)     // Hangul Compatibility Jamo
        }
    }
}
