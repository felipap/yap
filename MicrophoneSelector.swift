import SwiftUI
import AVFoundation

struct MicrophoneSelector: View {
    @ObservedObject var audioManager: AudioManager
    @State private var isExpanded = false

    var body: some View {
        VStack(spacing: 12) {
            HStack {
                Image(systemName: "mic.fill")
                    .foregroundColor(.blue)

                Text("Microphone")
                    .font(.headline)

                Spacer()

                Button(action: {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        isExpanded.toggle()
                    }
                }) {
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .foregroundColor(.secondary)
                        .font(.caption)
                }
            }

            if let selectedDevice = audioManager.selectedDevice {
                HStack {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                        .font(.caption)

                    Text(selectedDevice.localizedName)
                        .font(.subheadline)

                    Spacer()
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Color.secondary.opacity(0.1))
                .cornerRadius(8)
            }

            if isExpanded {
                VStack(spacing: 8) {
                    ForEach(audioManager.availableDevices, id: \.localizedName) { device in
                        Button(action: {
                            audioManager.selectDevice(device)
                            withAnimation(.easeInOut(duration: 0.2)) {
                                isExpanded = false
                            }
                        }) {
                            HStack {
                                Image(systemName: "mic")
                                    .foregroundColor(.secondary)
                                    .font(.caption)

                                Text(device.localizedName)
                                    .font(.subheadline)

                                Spacer()

                                if device.localizedName == audioManager.selectedDevice?.localizedName {
                                    Image(systemName: "checkmark")
                                        .foregroundColor(.blue)
                                        .font(.caption)
                                }
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(Color.secondary.opacity(0.05))
                            .cornerRadius(6)
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                }
                .transition(.opacity.combined(with: .move(edge: .top)))
            }

            Button(action: {
                audioManager.refreshDevices()
            }) {
                HStack {
                    Image(systemName: "arrow.clockwise")
                        .font(.caption)

                    Text("Refresh Devices")
                        .font(.caption)
                }
                .foregroundColor(.blue)
            }
            .buttonStyle(PlainButtonStyle())
        }
        .padding(16)
        .background(Color(NSColor.controlBackgroundColor))
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.secondary.opacity(0.2), lineWidth: 1)
        )
    }
}
