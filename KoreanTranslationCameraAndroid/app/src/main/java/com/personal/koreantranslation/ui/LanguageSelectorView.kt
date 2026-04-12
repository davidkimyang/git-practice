package com.personal.koreantranslation.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.personal.koreantranslation.models.SupportedLanguage

// ---------------------------------------------------------------------------
// Language Selector
//
// Horizontal row of language pills at the top of the screen.
// ---------------------------------------------------------------------------

@Composable
fun LanguageSelectorView(
    selectedLanguage: SupportedLanguage,
    onSelect: (SupportedLanguage) -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .background(
                color = Color.White.copy(alpha = 0.15f),
                shape = RoundedCornerShape(50)
            )
            .padding(horizontal = 8.dp, vertical = 6.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        SupportedLanguage.entries.forEach { language ->
            LanguagePill(
                language     = language,
                isSelected   = language == selectedLanguage,
                onClick      = { onSelect(language) }
            )
        }
    }
}

@Composable
private fun LanguagePill(
    language: SupportedLanguage,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Button(
        onClick = onClick,
        shape   = CircleShape,
        colors  = ButtonDefaults.buttonColors(
            containerColor = if (isSelected) Color.White else Color.Transparent,
            contentColor   = if (isSelected) Color.Black  else Color.White
        ),
        elevation = null
    ) {
        Text(
            text       = language.displayName,
            fontSize   = 14.sp,
            fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal
        )
    }
}
