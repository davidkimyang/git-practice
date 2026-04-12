import Translation
import SwiftUI

// MARK: - Translation Service
//
// Wraps Apple's Translation framework (iOS 17.4+).
//
// The TranslationSession is provided by the .translationTask() SwiftUI modifier
// in ContentView; call setSession(_:) from that closure. The session is reused
// until the target language changes, at which point the configuration refreshes
// and a new session is supplied automatically.
//
// Caches translations by source text to avoid redundant API calls for repeated
// frames showing the same content.

@MainActor
final class TranslationService: ObservableObject {

    @Published var result: TranslationResult?
    @Published var isTranslating = false
    @Published private(set) var targetLanguage: SupportedLanguage = .english

    // Computed configuration consumed by .translationTask() in the view.
    var configuration: TranslationSession.Configuration {
        TranslationSession.Configuration(
            source: Locale.Language(identifier: "ko"),
            target: Locale.Language(identifier: targetLanguage.rawValue)
        )
    }

    // MARK: - Private State

    private var session: TranslationSession?
    private var pendingTask: Task<Void, Never>?
    private var cache: [String: String] = [:]
    private var lastInputKey: String = ""

    // MARK: - Session Management

    func setSession(_ session: TranslationSession) async {
        self.session = session
        // Pre-download language model in the background so first translation
        // is instant rather than delayed by a model download.
        try? await session.prepareTranslation()
    }

    // MARK: - Translation

    func translate(texts: [String]) {
        let cacheKey = texts.joined(separator: "\n")
        guard !cacheKey.isEmpty, cacheKey != lastInputKey else { return }
        lastInputKey = cacheKey

        // Return cached result immediately without hitting the session.
        if let cached = cache[cacheKey] {
            result = TranslationResult(
                originalText: cacheKey,
                translatedText: cached,
                targetLanguage: targetLanguage,
                timestamp: Date()
            )
            return
        }

        // Cancel any in-flight request for stale frames.
        pendingTask?.cancel()

        pendingTask = Task { [weak self] in
            guard let self, let session = self.session else { return }
            self.isTranslating = true

            do {
                let requests  = texts.map { TranslationSession.Request(sourceString: $0) }
                let responses = try await session.translations(from: requests)

                guard !Task.isCancelled else { return }

                let translated = responses.map(\.targetText).joined(separator: "\n")
                self.cache[cacheKey] = translated
                self.result = TranslationResult(
                    originalText: cacheKey,
                    translatedText: translated,
                    targetLanguage: self.targetLanguage,
                    timestamp: Date()
                )
            } catch {
                // On error keep showing previous result; don't clear screen.
            }

            self.isTranslating = false
        }
    }

    // MARK: - Language Switching

    func changeLanguage(to language: SupportedLanguage) {
        guard language != targetLanguage else { return }
        targetLanguage = language

        // Clear state so the view picks up the new .configuration and
        // .translationTask fires a fresh session.
        pendingTask?.cancel()
        session = nil
        cache.removeAll()
        lastInputKey = ""
        result = nil
    }
}
