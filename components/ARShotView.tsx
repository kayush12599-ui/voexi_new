import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import Constants from 'expo-constants';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';

const isExpoGo = Constants.appOwnership === 'expo' || Platform.OS === 'web';

let VisionCamera: any = null;
let useCameraDevice: any = () => null;
let useCameraPermission: any = () => ({ hasPermission: false, requestPermission: async () => false });

if (!isExpoGo) {
  try {
    const vc = require('react-native-vision-camera');
    VisionCamera = vc.Camera;
    useCameraDevice = vc.useCameraDevice;
    useCameraPermission = vc.useCameraPermission;
  } catch (e) {
    console.warn("VisionCamera native module not available", e);
  }
}

/**
 * VOEXI AR SHOT - Universal Live Camera Engine
 * Automatically falls back to Expo CameraView if VisionCamera is unavailable.
 */
const ARShotView = forwardRef((props: any, ref) => {
  const device = useCameraDevice ? useCameraDevice(props.facing || 'front') : null;
  const { hasPermission: hasVisionPermission, requestPermission: requestVisionPermission } = useCameraPermission ? useCameraPermission() : { hasPermission: false, requestPermission: async () => false };

  const [expoCameraPermission, requestExpoCameraPermission] = useCameraPermissions();
  const [expoMicPermission, requestExpoMicPermission] = useMicrophonePermissions();

  const visionCameraRef = useRef<any>(null);
  const expoCameraRef = useRef<any>(null);

  const canUseVisionCamera = !isExpoGo && !!VisionCamera && !!device && hasVisionPermission;

  useEffect(() => {
    if (!expoCameraPermission?.granted && requestExpoCameraPermission) {
      requestExpoCameraPermission();
    }
    if (!expoMicPermission?.granted && requestExpoMicPermission) {
      requestExpoMicPermission();
    }
    if (!isExpoGo && !hasVisionPermission && requestVisionPermission) {
      requestVisionPermission();
    }
  }, [expoCameraPermission, expoMicPermission, hasVisionPermission]);

  useImperativeHandle(ref, () => ({
    recordAsync: async (options?: any) => {
      if (canUseVisionCamera && visionCameraRef.current) {
        return new Promise((resolve, reject) => {
          try {
            visionCameraRef.current?.startRecording({
              onRecordingFinished: (video: any) => resolve({ uri: `file://${video.path}` }),
              onRecordingError: (error: any) => reject(error)
            });
          } catch (e) {
            reject(e);
          }
        });
      } else if (expoCameraRef.current) {
        try {
          // Attempt 1: Standard Recording
          const result = await expoCameraRef.current.recordAsync({
            maxDuration: options?.maxDuration || 60,
          });
          return result;
        } catch (err: any) {
          console.warn("[Expo Camera Attempt 1 Failed]:", err?.message);
          try {
            // Attempt 2: Direct Fail-Safe
            const result2 = await expoCameraRef.current.recordAsync();
            return result2;
          } catch (retryErr: any) {
            console.warn("[Expo Camera Attempt 2 Failed]:", retryErr?.message);
            // Attempt 3: Muted Fallback if Audio Pipeline Failed
            const result3 = await expoCameraRef.current.recordAsync({ mute: true, maxDuration: 60 });
            return result3;
          }
        }
      } else {
        throw new Error("Camera view is not ready for recording.");
      }
    },
    stopRecording: async () => {
      if (canUseVisionCamera && visionCameraRef.current) {
        await visionCameraRef.current?.stopRecording();
      } else if (expoCameraRef.current) {
        await expoCameraRef.current?.stopRecording();
      }
    }
  }));

  const isGranted = canUseVisionCamera || expoCameraPermission?.granted;

  if (!isGranted) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.text}>CAMERA ACCESS REQUIRED</Text>
        <Text style={styles.subtext}>Permissions are needed to capture reels and photos.</Text>
        <TouchableOpacity
          style={styles.permButton}
          onPress={() => {
            requestExpoCameraPermission();
            requestExpoMicPermission();
          }}
        >
          <Text style={styles.permButtonText}>GRANT ACCESS</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (canUseVisionCamera) {
    return (
      <View style={props.style || StyleSheet.absoluteFill}>
        <VisionCamera
          ref={visionCameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={true}
          video={true}
          audio={true}
          torch={props.torch === 'on' ? 'on' : 'off'}
          enableZoomGesture={true}
        />
        {props.children}
      </View>
    );
  }

  return (
    <View style={props.style || StyleSheet.absoluteFill}>
      <CameraView
        ref={expoCameraRef}
        style={StyleSheet.absoluteFill}
        facing={props.facing || 'front'}
        mode="video"
        enableTorch={props.torch === 'on'}
      >
        {props.children}
      </CameraView>
    </View>
  );
});

const styles = StyleSheet.create({
  fallback: { flex: 1, backgroundColor: '#020205', justifyContent: 'center', alignItems: 'center', padding: 40 },
  text: { color: '#fff', fontSize: 13, fontWeight: 'bold', letterSpacing: 1.5, textAlign: 'center' },
  subtext: { color: '#888', fontSize: 10, marginTop: 10, textAlign: 'center', fontWeight: 'bold' },
  permButton: { marginTop: 20, backgroundColor: '#00F2FE', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  permButtonText: { color: '#000', fontWeight: 'bold', fontSize: 11, letterSpacing: 1 }
});

export default ARShotView;
