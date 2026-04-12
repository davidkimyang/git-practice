package com.personal.koreantranslation.ui

import android.Manifest
import androidx.camera.view.PreviewView
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.viewmodel.compose.viewModel
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberPermissionState
import com.personal.koreantranslation.MainViewModel
import com.personal.koreantranslation.camera.CameraManager

// ---------------------------------------------------------------------------
// MainScreen — root composable
// ---------------------------------------------------------------------------

@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun MainScreen(viewModel: MainViewModel = viewModel()) {
    val cameraPermission = rememberPermissionState(Manifest.permission.CAMERA)

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        if (cameraPermission.status.isGranted) {
            CameraScreen(viewModel)
        } else {
            PermissionView(
                onRequestPermission = { cameraPermission.launchPermissionRequest() }
            )
        }
    }
}

// ---------------------------------------------------------------------------
// CameraScreen — shown when permission is granted
// ---------------------------------------------------------------------------

@Composable
private fun CameraScreen(viewModel: MainViewModel) {
    val context        = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    val cameraManager = remember {
        CameraManager(context) { imageProxy -> viewModel.processFrame(imageProxy) }
    }

    DisposableEffect(Unit) {
        onDispose { cameraManager.release() }
    }

    Box(modifier = Modifier.fillMaxSize()) {

        // ── Camera preview ──────────────────────────────────────────────────
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory  = { ctx ->
                PreviewView(ctx).apply {
                    implementationMode = PreviewView.ImplementationMode.COMPATIBLE
                    scaleType          = PreviewView.ScaleType.FILL_CENTER
                }.also { previewView ->
                    cameraManager.bindCamera(lifecycleOwner, previewView)
                }
            }
        )

        // ── Overlay ─────────────────────────────────────────────────────────
        Column(
            modifier            = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Top: language selector
            LanguageSelectorView(
                selectedLanguage = viewModel.targetLanguage,
                onSelect         = { viewModel.changeLanguage(it) },
                modifier         = Modifier
                    .statusBarsPadding()
                    .padding(top = 12.dp)
            )

            Spacer(modifier = Modifier.weight(1f))

            // Paused badge
            AnimatedVisibility(
                visible = !viewModel.isRunning,
                enter   = fadeIn(),
                exit    = fadeOut()
            ) {
                Text(
                    text     = "Paused",
                    color    = Color.White,
                    fontSize = 13.sp,
                    modifier = Modifier
                        .background(Color.Black.copy(alpha = 0.5f))
                        .padding(horizontal = 14.dp, vertical = 5.dp)
                )
            }

            // Bottom: translation result card
            TranslationResultView(
                result        = viewModel.translationResult,
                isTranslating = viewModel.isTranslating,
                modelState    = viewModel.modelDownloadState,
                modifier      = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
            )

            // Pause / Resume button
            ControlBarView(
                isRunning = viewModel.isRunning,
                onToggle  = { viewModel.toggleRunning() },
                modifier  = Modifier.padding(bottom = 32.dp, top = 12.dp)
            )
        }
    }
}
