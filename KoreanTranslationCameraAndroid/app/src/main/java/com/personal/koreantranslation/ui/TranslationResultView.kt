package com.personal.koreantranslation.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.personal.koreantranslation.models.ModelDownloadState
import com.personal.koreantranslation.models.TranslationResult

// ---------------------------------------------------------------------------
// Translation Result View
//
// Shows either:
//   • A frosted card with the original Korean + translated text
//   • A loading indicator while translating
//   • A download badge while the ML Kit model is being fetched
//   • A hint when no Korean text has been detected yet
// ---------------------------------------------------------------------------

@Composable
fun TranslationResultView(
    result: TranslationResult?,
    isTranslating: Boolean,
    modelState: ModelDownloadState,
    modifier: Modifier = Modifier
) {
    when {
        modelState is ModelDownloadState.Downloading -> StatusCard(modifier) {
            Row(
                verticalAlignment     = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp)
                Text("Downloading language model…", color = Color.White, fontSize = 14.sp)
            }
        }

        modelState is ModelDownloadState.Error -> StatusCard(modifier) {
            Text("Model error: ${modelState.message}", color = Color(0xFFFF6B6B), fontSize = 13.sp)
        }

        result != null -> ResultCard(result, modifier)

        isTranslating -> StatusCard(modifier) {
            Row(
                verticalAlignment     = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp)
                Text("Translating…", color = Color.White, fontSize = 14.sp)
            }
        }

        else -> StatusCard(modifier) {
            Text(
                "Point the camera at Korean text",
                color    = Color.White.copy(alpha = 0.8f),
                fontSize = 14.sp
            )
        }
    }
}

// ---------------------------------------------------------------------------

@Composable
private fun ResultCard(result: TranslationResult, modifier: Modifier = Modifier) {
    Surface(
        modifier  = modifier.fillMaxWidth(),
        shape     = RoundedCornerShape(16.dp),
        color     = Color.Black.copy(alpha = 0.55f),
        tonalElevation = 0.dp
    ) {
        Column(
            modifier  = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            // Original Korean
            Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(
                    text     = "Korean",
                    color    = Color.White.copy(alpha = 0.55f),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text     = result.originalText,
                    color    = Color.White,
                    fontSize = 15.sp
                )
            }

            HorizontalDivider(color = Color.White.copy(alpha = 0.2f))

            // Translation
            Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(
                    text     = result.targetLanguage.displayName,
                    color    = Color.White.copy(alpha = 0.55f),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text       = result.translatedText,
                    color      = Color.White,
                    fontSize   = 17.sp,
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}

@Composable
private fun StatusCard(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    Surface(
        modifier  = modifier,
        shape     = RoundedCornerShape(12.dp),
        color     = Color.Black.copy(alpha = 0.55f),
        tonalElevation = 0.dp
    ) {
        Row(modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)) {
            content()
        }
    }
}
