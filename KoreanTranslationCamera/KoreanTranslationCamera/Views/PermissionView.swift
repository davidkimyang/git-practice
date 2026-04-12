import SwiftUI

// MARK: - Permission Denied View
//
// Shown in place of the camera feed when camera access is not granted.
// Guides the user to open Settings.

struct PermissionView: View {

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "camera.fill")
                .font(.system(size: 52))
                .foregroundStyle(.white.opacity(0.7))

            Text("Camera Access Required")
                .font(.title2.bold())
                .foregroundStyle(.white)

            Text("This app needs camera access to detect Korean text. Please enable it in Settings.")
                .font(.body)
                .foregroundStyle(.white.opacity(0.8))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)

            Button("Open Settings") {
                if let url = URL(string: UIApplication.openSettingsURLString) {
                    UIApplication.shared.open(url)
                }
            }
            .buttonStyle(.borderedProminent)
            .tint(.white)
            .foregroundStyle(.black)
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.black)
    }
}

#Preview {
    PermissionView()
}
