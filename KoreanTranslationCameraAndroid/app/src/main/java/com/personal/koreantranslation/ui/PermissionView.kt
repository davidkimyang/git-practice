package com.personal.koreantranslation.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun PermissionView(
    onRequestPermission: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier  = modifier.fillMaxSize().padding(32.dp),
        verticalArrangement   = Arrangement.Center,
        horizontalAlignment   = Alignment.CenterHorizontally
    ) {
        Icon(
            imageVector        = Icons.Default.CameraAlt,
            contentDescription = null,
            tint               = Color.White.copy(alpha = 0.7f),
            modifier           = Modifier.size(64.dp)
        )

        Text(
            text       = "Camera Access Required",
            color      = Color.White,
            fontSize   = 20.sp,
            fontWeight = FontWeight.Bold,
            modifier   = Modifier.padding(top = 20.dp)
        )

        Text(
            text      = "This app needs camera access to detect and translate Korean text.",
            color     = Color.White.copy(alpha = 0.8f),
            fontSize  = 15.sp,
            textAlign = TextAlign.Center,
            modifier  = Modifier.padding(top = 12.dp, bottom = 28.dp)
        )

        Button(
            onClick = onRequestPermission,
            colors  = ButtonDefaults.buttonColors(
                containerColor = Color.White,
                contentColor   = Color.Black
            )
        ) {
            Text("Grant Permission", fontWeight = FontWeight.SemiBold)
        }
    }
}
