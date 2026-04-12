import SwiftUI

// MARK: - Control Bar
//
// A single Pause / Resume button centred at the bottom of the screen.

struct ControlBarView: View {

    let isRunning: Bool
    let onToggle: () -> Void

    var body: some View {
        Button(action: onToggle) {
            Label(
                isRunning ? "Pause" : "Resume",
                systemImage: isRunning ? "pause.circle.fill" : "play.circle.fill"
            )
            .font(.system(size: 18, weight: .semibold))
            .foregroundStyle(.white)
            .padding(.horizontal, 28)
            .padding(.vertical, 14)
            .background(.ultraThinMaterial, in: Capsule())
        }
        .buttonStyle(.plain)
        .animation(.easeInOut(duration: 0.2), value: isRunning)
    }
}

#Preview {
    ZStack {
        Color.black.ignoresSafeArea()
        ControlBarView(isRunning: true) {}
    }
}
