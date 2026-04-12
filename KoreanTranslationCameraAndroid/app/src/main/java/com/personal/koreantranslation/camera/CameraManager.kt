package com.personal.koreantranslation.camera

import android.content.Context
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import java.util.concurrent.Executors

// ---------------------------------------------------------------------------
// CameraManager
//
// Wraps CameraX setup. Delivers throttled frames (≈0.75 s apart) to onFrame.
// Call bindCamera() once from the Composable, release() on disposal.
// ---------------------------------------------------------------------------

class CameraManager(
    private val context: Context,
    private val onFrame: (ImageProxy) -> Unit
) {
    private val analysisExecutor = Executors.newSingleThreadExecutor()
    private var cameraProvider: ProcessCameraProvider? = null

    fun bindCamera(lifecycleOwner: LifecycleOwner, previewView: PreviewView) {
        val future = ProcessCameraProvider.getInstance(context)

        future.addListener({
            cameraProvider = future.get()

            val preview = Preview.Builder()
                .build()
                .also { it.setSurfaceProvider(previewView.surfaceProvider) }

            val imageAnalysis = ImageAnalysis.Builder()
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build()
                .also { analysis ->
                    analysis.setAnalyzer(analysisExecutor, ThrottledAnalyzer(onFrame))
                }

            try {
                cameraProvider?.unbindAll()
                cameraProvider?.bindToLifecycle(
                    lifecycleOwner,
                    CameraSelector.DEFAULT_BACK_CAMERA,
                    preview,
                    imageAnalysis
                )
            } catch (e: Exception) {
                // Camera binding failed (e.g. no back camera on the device)
                e.printStackTrace()
            }
        }, ContextCompat.getMainExecutor(context))
    }

    fun release() {
        cameraProvider?.unbindAll()
        analysisExecutor.shutdown()
    }
}

// ---------------------------------------------------------------------------
// ThrottledAnalyzer
//
// Passes at most one frame every INTERVAL_MS to the callback; everything else
// is closed immediately to avoid blocking the camera pipeline.
// ---------------------------------------------------------------------------

private class ThrottledAnalyzer(
    private val onFrame: (ImageProxy) -> Unit
) : ImageAnalysis.Analyzer {

    private var lastAnalysisTimeMs = 0L
    private val intervalMs = 750L

    override fun analyze(image: ImageProxy) {
        val now = System.currentTimeMillis()
        if (now - lastAnalysisTimeMs < intervalMs) {
            image.close()
            return
        }
        lastAnalysisTimeMs = now
        onFrame(image)   // caller is responsible for closing the proxy
    }
}
