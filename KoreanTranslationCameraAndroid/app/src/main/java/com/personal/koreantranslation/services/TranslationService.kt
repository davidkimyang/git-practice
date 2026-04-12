package com.personal.koreantranslation.services

import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.nl.translate.TranslateLanguage
import com.google.mlkit.nl.translate.Translation
import com.google.mlkit.nl.translate.Translator
import com.google.mlkit.nl.translate.TranslatorOptions
import com.personal.koreantranslation.models.SupportedLanguage

// ---------------------------------------------------------------------------
// TranslationService
//
// Wraps ML Kit's on-device Translation API (Korean → target language).
// Maintains a simple LRU-style cache so repeated camera frames showing the
// same text are returned instantly without hitting the translation model.
//
// Language models are downloaded once from Google's servers (~50 MB each)
// and cached on-device for offline use afterwards.
//
// All callbacks are invoked on the main thread (ML Kit default).
// ---------------------------------------------------------------------------

class TranslationService {

    private var translator: Translator? = null
    private val cache = LinkedHashMap<String, String>(32, 0.75f, true)
    private var lastInputText = ""

    // -----------------------------------------------------------------------
    // Language / session management
    // -----------------------------------------------------------------------

    fun changeLanguage(
        language: SupportedLanguage,
        onReady: () -> Unit,
        onError: (String) -> Unit
    ) {
        translator?.close()
        cache.clear()
        lastInputText = ""

        val options = TranslatorOptions.Builder()
            .setSourceLanguage(TranslateLanguage.KOREAN)
            .setTargetLanguage(language.mlKitCode)
            .build()

        translator = Translation.getClient(options)

        // Download model if not already cached locally.
        val conditions = DownloadConditions.Builder().build()
        translator!!.downloadModelIfNeeded(conditions)
            .addOnSuccessListener { onReady() }
            .addOnFailureListener { e -> onError(e.message ?: "Model download failed") }
    }

    // -----------------------------------------------------------------------
    // Translation
    // -----------------------------------------------------------------------

    fun translate(
        text: String,
        onResult: (String) -> Unit,
        onError: () -> Unit
    ) {
        if (text == lastInputText) return
        lastInputText = text

        cache[text]?.let {
            onResult(it)
            return
        }

        val t = translator ?: run { onError(); return }

        t.translate(text)
            .addOnSuccessListener { translated ->
                cache[text] = translated
                onResult(translated)
            }
            .addOnFailureListener { onError() }
    }

    fun close() {
        translator?.close()
    }
}
