package com.personal.koreantranslation

import androidx.camera.core.ImageProxy
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import com.personal.koreantranslation.models.ModelDownloadState
import com.personal.koreantranslation.models.SupportedLanguage
import com.personal.koreantranslation.models.TranslationResult
import com.personal.koreantranslation.services.OCRService
import com.personal.koreantranslation.services.TranslationService

// ---------------------------------------------------------------------------
// MainViewModel
//
// Coordinates CameraManager → OCRService → TranslationService and exposes
// observable state to the Compose UI.
// ---------------------------------------------------------------------------

class MainViewModel : ViewModel() {

    // -- UI state ------------------------------------------------------------
    var targetLanguage   by mutableStateOf(SupportedLanguage.ENGLISH); private set
    var translationResult by mutableStateOf<TranslationResult?>(null);  private set
    var isTranslating    by mutableStateOf(false);                       private set
    var isRunning        by mutableStateOf(true);                        private set
    var modelDownloadState by mutableStateOf<ModelDownloadState>(ModelDownloadState.Idle)
        private set

    // -- Services ------------------------------------------------------------
    private val ocrService         = OCRService()
    private val translationService = TranslationService()

    init {
        loadLanguage(SupportedLanguage.ENGLISH)
    }

    // -----------------------------------------------------------------------
    // Frame processing (called from CameraManager on the analysis thread)
    // -----------------------------------------------------------------------

    fun processFrame(imageProxy: ImageProxy) {
        if (!isRunning || modelDownloadState !is ModelDownloadState.Ready) {
            imageProxy.close()
            return
        }

        ocrService.recognizeKoreanText(imageProxy) { texts ->
            if (texts.isEmpty()) return@recognizeKoreanText

            val combined = texts.joinToString("\n")
            isTranslating = true

            translationService.translate(
                text     = combined,
                onResult = { translated ->
                    translationResult = TranslationResult(
                        originalText   = combined,
                        translatedText = translated,
                        targetLanguage = targetLanguage
                    )
                    isTranslating = false
                },
                onError  = { isTranslating = false }
            )
        }
    }

    // -----------------------------------------------------------------------
    // Language switching
    // -----------------------------------------------------------------------

    fun changeLanguage(language: SupportedLanguage) {
        if (language == targetLanguage) return
        targetLanguage    = language
        translationResult = null
        loadLanguage(language)
    }

    private fun loadLanguage(language: SupportedLanguage) {
        modelDownloadState = ModelDownloadState.Downloading
        translationService.changeLanguage(
            language = language,
            onReady  = { modelDownloadState = ModelDownloadState.Ready },
            onError  = { msg -> modelDownloadState = ModelDownloadState.Error(msg) }
        )
    }

    // -----------------------------------------------------------------------
    // Pause / Resume
    // -----------------------------------------------------------------------

    fun toggleRunning() {
        isRunning = !isRunning
    }

    // -----------------------------------------------------------------------
    // Lifecycle
    // -----------------------------------------------------------------------

    override fun onCleared() {
        super.onCleared()
        ocrService.close()
        translationService.close()
    }
}
