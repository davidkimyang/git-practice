import AVFoundation
import UIKit

// MARK: - Camera Manager
//
// Manages the AVCaptureSession lifecycle, permission requests, and
// throttled frame delivery. onFrame is called at most once per frameInterval.

class CameraManager: NSObject, ObservableObject {

    @Published var permissionGranted = false
    @Published var isRunning = false

    let captureSession = AVCaptureSession()

    /// Called on the camera frame queue with the latest pixel buffer.
    /// Throttled to frameInterval (default 0.75s) to avoid over-processing.
    var onFrame: ((CVPixelBuffer) -> Void)?

    private let sessionQueue = DispatchQueue(label: "camera.session.queue", qos: .userInitiated)
    private let frameQueue  = DispatchQueue(label: "camera.frame.queue",   qos: .userInteractive)

    private var lastFrameTime: Date = .distantPast
    private let frameInterval: TimeInterval = 0.75

    // MARK: - Permission & Setup

    func requestPermission() {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            DispatchQueue.main.async { self.permissionGranted = true }
            setupCapture()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { granted in
                DispatchQueue.main.async { self.permissionGranted = granted }
                if granted { self.setupCapture() }
            }
        default:
            DispatchQueue.main.async { self.permissionGranted = false }
        }
    }

    private func setupCapture() {
        sessionQueue.async { [weak self] in
            guard let self else { return }

            self.captureSession.beginConfiguration()
            self.captureSession.sessionPreset = .hd1280x720

            guard
                let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
                let input  = try? AVCaptureDeviceInput(device: device),
                self.captureSession.canAddInput(input)
            else {
                self.captureSession.commitConfiguration()
                return
            }

            self.captureSession.addInput(input)

            let output = AVCaptureVideoDataOutput()
            output.videoSettings = [
                kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA
            ]
            output.setSampleBufferDelegate(self, queue: self.frameQueue)
            output.alwaysDiscardsLateVideoFrames = true

            if self.captureSession.canAddOutput(output) {
                self.captureSession.addOutput(output)
            }

            self.captureSession.commitConfiguration()
        }
    }

    // MARK: - Playback Control

    func start() {
        sessionQueue.async { [weak self] in
            guard let self, !self.captureSession.isRunning else { return }
            self.captureSession.startRunning()
            DispatchQueue.main.async { self.isRunning = true }
        }
    }

    func stop() {
        sessionQueue.async { [weak self] in
            guard let self, self.captureSession.isRunning else { return }
            self.captureSession.stopRunning()
            DispatchQueue.main.async { self.isRunning = false }
        }
    }

    func toggleRunning() {
        isRunning ? stop() : start()
    }
}

// MARK: - AVCaptureVideoDataOutputSampleBufferDelegate

extension CameraManager: AVCaptureVideoDataOutputSampleBufferDelegate {

    func captureOutput(
        _ output: AVCaptureOutput,
        didOutput sampleBuffer: CMSampleBuffer,
        from connection: AVCaptureConnection
    ) {
        let now = Date()
        guard now.timeIntervalSince(lastFrameTime) >= frameInterval else { return }
        lastFrameTime = now

        guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        onFrame?(pixelBuffer)
    }
}
