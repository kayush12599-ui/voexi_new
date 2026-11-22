package com.voexi.arshot.tracking

import android.content.Context
import android.graphics.PointF
import android.util.Log
import androidx.camera.core.ImageProxy
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.facelandmarker.FaceLandmarker
import com.google.mediapipe.tasks.vision.facelandmarker.FaceLandmarkerResult
import kotlin.math.*

/**
 * VOEXI AR SHOT - PRODUCTION FACE TRACKER
 * Powered by MediaPipe 468-point Face Mesh.
 */
class FaceTracker(private val context: Context) {
    private val TAG = "VoexiFaceTracker"
    private var faceLandmarker: FaceLandmarker? = null

    data class TrackingData(
        val faceDetected: Boolean = false,
        val landmarks: List<NormalizedLandmark> = emptyList(),
        val roll: Float = 0f,
        val scale: Float = 1.0f,
        val timestamp: Long = 0
    )

    data class NormalizedLandmark(val x: Float, val y: Float, val z: Float)

    init {
        setupFaceLandmarker()
    }

    private fun setupFaceLandmarker() {
        try {
            val baseOptions = BaseOptions.builder()
                .setModelAssetPath("face_landmarker.task")
                .build()

            val options = FaceLandmarker.FaceLandmarkerOptions.builder()
                .setBaseOptions(baseOptions)
                .setRunningMode(RunningMode.LIVE_STREAM)
                .setResultListener { result, _ -> /* Async handling if needed */ }
                .setNumFaces(1)
                .setMinFaceDetectionConfidence(0.5f)
                .setMinFacePresenceConfidence(0.5f)
                .setMinTrackingConfidence(0.5f)
                .build()

            faceLandmarker = FaceLandmarker.createFromOptions(context, options)
        } catch (e: Exception) {
            Log.e(TAG, "Face Landmarker Init Error: ${e.message}")
        }
    }

    fun analyze(imageProxy: ImageProxy): TrackingData {
        val landmarker = faceLandmarker ?: return TrackingData()

        return try {
            val bitmap = imageProxy.toBitmap()
            val mpImage = BitmapImageBuilder(bitmap).build()
            
            // MediaPipe detection
            val result = landmarker.detect(mpImage)
            processResult(result, imageProxy.imageInfo.getTimestamp())
        } catch (e: Exception) {
            TrackingData()
        }
    }

    private fun processResult(result: FaceLandmarkerResult, timestamp: Long): TrackingData {
        if (result.faceLandmarks().isNullOrEmpty()) {
            return TrackingData(faceDetected = false)
        }

        val landmarks = result.faceLandmarks()[0].map { 
            NormalizedLandmark(it.x(), it.y(), it.z()) 
        }

        // --- POSE ESTIMATION (ROLL & SCALE) ---
        val leftEye = landmarks[33]
        val rightEye = landmarks[263]

        val dx = rightEye.x - leftEye.x
        val dy = rightEye.y - leftEye.y
        
        // Eye distance determines scale
        val eyeDist = sqrt(dx * dx + dy * dy)
        val scale = eyeDist / 0.35f 

        // Z-axis rotation (Roll)
        val roll = atan2(dy, dx) * (180 / PI).toFloat()

        return TrackingData(
            faceDetected = true,
            landmarks = landmarks,
            roll = roll,
            scale = scale,
            timestamp = timestamp
        )
    }

    fun release() {
        faceLandmarker?.close()
        faceLandmarker = null
    }
}
