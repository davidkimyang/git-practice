package com.personal.koreantranslation.models

import com.google.mlkit.nl.translate.TranslateLanguage
import java.util.Date

// ---------------------------------------------------------------------------
// Supported target languages
// ---------------------------------------------------------------------------

enum class SupportedLanguage(
    val displayName: String,
    val shortName: String,
    val mlKitCode: String
) {
    ENGLISH("English", "EN", TranslateLanguage.ENGLISH),
    JAPANESE("日本語",  "JA", TranslateLanguage.JAPANESE),
    CHINESE("中文",    "ZH", TranslateLanguage.CHINESE)
}

// ---------------------------------------------------------------------------
// Translation result
// ---------------------------------------------------------------------------

data class TranslationResult(
    val originalText: String,
    val translatedText: String,
    val targetLanguage: SupportedLanguage,
    val timestamp: Date = Date()
)

// ---------------------------------------------------------------------------
// Model download state (ML Kit downloads language packs on first use)
// ---------------------------------------------------------------------------

sealed class ModelDownloadState {
    object Idle        : ModelDownloadState()
    object Downloading : ModelDownloadState()
    object Ready       : ModelDownloadState()
    data class Error(val message: String) : ModelDownloadState()
}
