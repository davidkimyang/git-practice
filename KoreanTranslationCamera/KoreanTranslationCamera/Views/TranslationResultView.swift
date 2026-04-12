import SwiftUI

// MARK: - Translation Result View
//
// Shows the detected Korean text and its translation in a frosted-glass card
// anchored to the bottom of the screen. Hidden when there's no result yet.

struct TranslationResultView: View {

    let result: TranslationResult?
    let isTranslating: Bool

    var body: some View {
        Group {
            if let result {
                resultCard(result)
            } else if isTranslating {
                loadingCard
            } else {
                hintCard
            }
        }
        .animation(.easeInOut(duration: 0.25), value: result)
        .animation(.easeInOut(duration: 0.25), value: isTranslating)
    }

    // MARK: - Sub-views

    private func resultCard(_ result: TranslationResult) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            // Original Korean
            VStack(alignment: .leading, spacing: 4) {
                Label("Korean", systemImage: "text.magnifyingglass")
                    .font(.caption2)
                    .foregroundStyle(.secondary)

                Text(result.originalText)
                    .font(.system(size: 15, weight: .regular))
                    .foregroundStyle(.primary)
                    .lineLimit(4)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Divider()

            // Translation
            VStack(alignment: .leading, spacing: 4) {
                Label(result.targetLanguage.displayName, systemImage: "globe")
                    .font(.caption2)
                    .foregroundStyle(.secondary)

                Text(result.translatedText)
                    .font(.system(size: 17, weight: .medium))
                    .foregroundStyle(.primary)
                    .lineLimit(6)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16))
    }

    private var loadingCard: some View {
        HStack(spacing: 10) {
            ProgressView()
                .tint(.white)
            Text("Translating…")
                .font(.subheadline)
                .foregroundStyle(.white)
        }
        .padding(14)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
    }

    private var hintCard: some View {
        Text("Point the camera at Korean text")
            .font(.subheadline)
            .foregroundStyle(.white.opacity(0.8))
            .padding(14)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
    }
}

#Preview {
    ZStack {
        Color.gray.ignoresSafeArea()
        VStack {
            Spacer()
            TranslationResultView(
                result: TranslationResult(
                    originalText: "삼겹살\n된장찌개",
                    translatedText: "Grilled Pork Belly\nDoenjang Stew",
                    targetLanguage: .english,
                    timestamp: Date()
                ),
                isTranslating: false
            )
            .padding()
        }
    }
}
