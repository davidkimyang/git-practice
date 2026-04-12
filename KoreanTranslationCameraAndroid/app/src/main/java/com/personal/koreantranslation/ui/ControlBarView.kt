package com.personal.koreantranslation.ui

import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun ControlBarView(
    isRunning: Boolean,
    onToggle: () -> Unit,
    modifier: Modifier = Modifier
) {
    Button(
        onClick  = onToggle,
        shape    = CircleShape,
        colors   = ButtonDefaults.buttonColors(
            containerColor = Color.White.copy(alpha = 0.2f),
            contentColor   = Color.White
        ),
        modifier = modifier.padding(horizontal = 32.dp, vertical = 14.dp)
    ) {
        Icon(
            imageVector = if (isRunning) Icons.Default.Pause else Icons.Default.PlayArrow,
            contentDescription = if (isRunning) "Pause" else "Resume"
        )
        Text(
            text       = if (isRunning) "Pause" else "Resume",
            fontSize   = 16.sp,
            fontWeight = FontWeight.SemiBold,
            modifier   = Modifier.padding(start = 6.dp)
        )
    }
}
