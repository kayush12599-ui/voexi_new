import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';

const ARShotView = forwardRef((props: any, ref) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startWebCamera = async () => {
    try {
      const constraints = {
        video: { facingMode: props.facing === 'back' ? 'environment' : 'user' },
        audio: true,
      };
      const userStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(userStream);
      if (videoRef.current) {
        videoRef.current.srcObject = userStream;
      }
      setHasPermission(true);
    } catch (err) {
      console.warn("Web Camera permission error:", err);
      // Fallback try video only if audio permission fails
      try {
        const videoOnlyStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: props.facing === 'back' ? 'environment' : 'user' },
          audio: false,
        });
        setStream(videoOnlyStream);
        if (videoRef.current) {
          videoRef.current.srcObject = videoOnlyStream;
        }
        setHasPermission(true);
      } catch (videoErr) {
        setHasPermission(false);
      }
    }
  };

  useEffect(() => {
    startWebCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [props.facing]);

  useImperativeHandle(ref, () => ({
    recordAsync: async () => {
      if (!stream) throw new Error("Camera stream not ready on Web");
      return new Promise((resolve, reject) => {
        try {
          recordedChunksRef.current = [];
          const recorder = new MediaRecorder(stream);
          mediaRecorderRef.current = recorder;

          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) recordedChunksRef.current.push(e.data);
          };

          recorder.onstop = () => {
            const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
            const videoUrl = URL.createObjectURL(blob);
            resolve({ uri: videoUrl });
          };

          recorder.start();
        } catch (e) {
          reject(e);
        }
      });
    },
    stopRecording: async () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    },
  }));

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>CAMERA ACCESS REQUIRED ON WEB</Text>
        <Text style={styles.subtext}>Please allow camera and microphone access in your web browser.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={startWebCamera}>
          <Text style={styles.retryBtnText}>GRANT CAMERA ACCESS</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={props.style || StyleSheet.absoluteFill}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: props.facing === 'back' ? 'none' : 'scaleX(-1)',
        }}
      />
      {props.children}
    </View>
  );
});

export default ARShotView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05050D',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    color: '#00F2FE',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtext: {
    color: '#8888AA',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: '#A855F7',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 1,
  },
});
