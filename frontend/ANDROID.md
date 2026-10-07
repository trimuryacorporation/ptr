# Trimurya Participant Android app

This app includes participant OTP sign-in, profile/settings, project pairing, shared recording controls, topics and recording save/share. Admin login and admin routes are absent from the participant entry point.

## Install and connect

Copy artifacts/Trimurya-Participant.apk to your Android phone and install it. This is a debug-signed APK for direct testing, not a Play Store release.

On first launch, enter the backend server address, such as https://api.example.com or http://192.168.1.10:5000 for same-Wi-Fi testing. Do not enter localhost or the frontend port 5173. Connection settings on the login screen lets you change this address.

Restart the backend yourself to load the native CORS and refresh-token support. The build process does not launch app servers.

Allow microphone access when entering a recording room. Keep the app in the foreground during recording. The download button opens Android's save/share chooser.

## Rebuild

From the repository root in PowerShell:

    powershell -ExecutionPolicy Bypass -File scripts/build-participant-apk.ps1

The script uses portable JDK and SDK tools in .android-tools. They are ignored by Git. Android project files are under frontend/android, and frontend/capacitor.config.json packages dist-participant.

Official references: [Capacitor Android](https://capacitorjs.com/docs/android), [Android command-line tools](https://developer.android.com/studio), [Adoptium JDK](https://adoptium.net/installation/ci-scripts).
