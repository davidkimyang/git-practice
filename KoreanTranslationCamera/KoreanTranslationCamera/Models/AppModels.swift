import Foundation

// MARK: - Supported Target Languages

enum SupportedLanguage: String, CaseIterable, Identifiable {
    case english = "en"
    case japanese = "ja"
    case chinese = "zh-Hans"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .english: return "English"
        case .japanese: return "日本語"
        case .chinese: return "中文"
        }
    }

    var shortName: String {
        switch self {
        case .english: return "EN"
        case .japanese: return "JA"
        case .chinese: return "ZH"
        }
    }
}

// MARK: - Translation Result

struct TranslationResult: Equatable {
    let originalText: String
    let translatedText: String
    let targetLanguage: SupportedLanguage
    let timestamp: Date

    static func == (lhs: TranslationResult, rhs: TranslationResult) -> Bool {
        lhs.originalText == rhs.originalText &&
        lhs.targetLanguage == rhs.targetLanguage
    }
}
