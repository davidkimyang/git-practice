import SwiftUI
import AVFoundation

// MARK: - Camera Preview (UIViewRepresentable)
//
// Wraps an AVCaptureVideoPreviewLayer inside a UIView so it can be
// embedded in a SwiftUI layout. Uses resizeAspectFill to fill the screen.

struct CameraPreviewView: UIViewRepresentable {

    let session: AVCaptureSession

    func makeUIView(context: Context) -> VideoPreviewUIView {
        let view = VideoPreviewUIView()
        view.previewLayer.session      = session
        view.previewLayer.videoGravity = .resizeAspectFill
        return view
    }

    func updateUIView(_ uiView: VideoPreviewUIView, context: Context) {}
}

// MARK: - VideoPreviewUIView

final class VideoPreviewUIView: UIView {

    override class var layerClass: AnyClass {
        AVCaptureVideoPreviewLayer.self
    }

    var previewLayer: AVCaptureVideoPreviewLayer {
        // swiftlint:disable:next force_cast
        layer as! AVCaptureVideoPreviewLayer
    }
}
