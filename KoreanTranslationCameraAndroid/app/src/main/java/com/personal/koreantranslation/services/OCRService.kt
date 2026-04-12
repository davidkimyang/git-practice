package com.personal.koreantranslation.services

import androidx.camera.core.ImageProxy
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.korean.KoreanTextRecognizerOptions

// ---------------------------------------------------------------------------
// OCRService
//
// Uses ML Kit's Korean text recognizer to extract Hangul text blocks from a
// camera frame. Only blocks that contain at least one Korean character are
// forwarded; the rest are discarded.
//
// The callback is invoked on the main thread (ML Kit default).
// The caller must NOT close the ImageProxy before this call completes;
// this service closes it internally after recognition finishes.
// ---------------------------------------------------------------------------

class OCRService {

    private val recognizer = TextRecognition.getClient(
        KoreanTextRecognizerOptions.Builder().build()
    )

    fun recognizeKoreanText(imageProxy: ImageProxy, callback: (List<String>) -> Unit) {
        val mediaImage = imageProxy.image
        if (mediaImage == null) {
            imageProxy.close()
            callback(emptyList())
            return
        }

        val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)

        recognizer.process(image)
            .addOnSuccessListener { visionText ->
                val koreanBlocks = visionText.textBlocks
                    .map { it.text }
                    .filter { containsKorean(it) }
                callback(koreanBlocks)
            }
            .addOnFailureListener {
                callback(emptyList())
            }
            .addOnCompleteListener {
                imageProxy.close()
            }
    }

    fun close() {
        recognizer.close()
    }

    // -----------------------------------------------------------------------

    private fun containsKorean(text: String): Boolean = text.any { ch ->
        ch.code in 0xAC00..0xD7A3 ||  // Hangul syllables
        ch.code in 0x1100..0x11FF ||  // Hangul Jamo
        ch.code in 0x3130..0x318F     // Hangul Compatibility Jamo
    }
}
