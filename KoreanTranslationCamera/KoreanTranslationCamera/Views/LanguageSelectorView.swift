import SwiftUI

// MARK: - Language Selector
//
// Horizontal row of language pills shown at the top of the screen.
// The active language is highlighted; tapping another pill switches immediately.

struct LanguageSelectorView: View {

    let selectedLanguage: SupportedLanguage
    let onSelect: (SupportedLanguage) -> Void

    var body: some View {
        HStack(spacing: 10) {
            ForEach(SupportedLanguage.allCases) { language in
                LanguagePill(
                    language: language,
                    isSelected: language == selectedLanguage
                ) {
                    onSelect(language)
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(.ultraThinMaterial, in: Capsule())
    }
}

// MARK: - Language Pill

private struct LanguagePill: View {

    let language: SupportedLanguage
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(language.displayName)
                .font(.system(size: 14, weight: isSelected ? .semibold : .regular))
                .foregroundStyle(isSelected ? Color.black : Color.white)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(
                    isSelected ? Color.white : Color.white.opacity(0.15),
                    in: Capsule()
                )
        }
        .buttonStyle(.plain)
        .animation(.easeInOut(duration: 0.15), value: isSelected)
    }
}

#Preview {
    ZStack {
        Color.black.ignoresSafeArea()
        LanguageSelectorView(selectedLanguage: .english) { _ in }
    }
}
