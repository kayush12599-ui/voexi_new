package com.voexi.arshot.core

import android.content.Context
import android.graphics.SurfaceTexture
import android.opengl.GLES11Ext
import android.opengl.GLES20
import android.util.Log
import android.view.Surface
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import com.voexi.arshot.models.ArEffect
import com.voexi.arshot.rendering.ArRenderer
import com.voexi.arshot.tracking.FaceTracker
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * VOEXI AR SHOT - PRODUCTION CORE ENGINE
 * Orchestrates CameraX, MediaPipe Tracking, and OpenGL Rendering.
 */
class ArEngine(private val context: Context) {
    private val TAG = "VoexiArEngine"
    private var cameraProvider: ProcessCameraProvider? = null
    private val analysisExecutor: ExecutorService = Executors.newSingleThreadExecutor()
    
    private val faceTracker = FaceTracker(context)
    private val renderer = ArRenderer(context)
    
    private var currentEffect: ArEffect? = null
    @Volatile
    private var trackingData = FaceTracker.TrackingData()
    
    private var oesTextureId = 0
    private var surfaceTexture: SurfaceTexture? = null
    private var viewWidth = 1080
    private var viewHeight = 1920

    fun onSurfaceCreated() {
        renderer.onSurfaceCreated()
        
        // Generate OES Texture for Camera
        val textures = IntArray(1)
        GLES20.glGenTextures(1, textures, 0)
        oesTextureId = textures[0]
        GLES20.glBindTexture(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, oesTextureId)
        GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_MIN_FILTER, GLES20.GL_LINEAR)
        GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_MAG_FILTER, GLES20.GL_LINEAR)
        GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_WRAP_S, GLES20.GL_CLAMP_TO_EDGE)
        GLES20.glTexParameteri(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, GLES20.GL_TEXTURE_WRAP_T, GLES20.GL_CLAMP_TO_EDGE)
        
        surfaceTexture = SurfaceTexture(oesTextureId)
    }

    fun onSurfaceChanged(width: Int, height: Int) {
        viewWidth = width
        viewHeight = height
        renderer.onSurfaceChanged(width, height)
    }

    fun onDrawFrame() {
        val st = surfaceTexture ?: return
        st.updateTexImage()
        
        // 1. Draw Camera Preview
        renderer.drawBackground(oesTextureId)
        
        // 2. Draw AR Overlays
        renderer.renderEffects(currentEffect, trackingData, viewWidth, viewHeight)
    }

    fun start(lifecycleOwner: LifecycleOwner) {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
        cameraProviderFuture.addListener({
            cameraProvider = cameraProviderFuture.get()
            bindCamera(lifecycleOwner)
        }, ContextCompat.getMainExecutor(context))
    }

    private fun bindCamera(lifecycleOwner: LifecycleOwner) {
        val provider = cameraProvider ?: return
        val st = surfaceTexture ?: return
        
        val preview = Preview.Builder()
            .setTargetAspectRatio(AspectRatio.RATIO_16_9)
            .build()
        
        preview.setSurfaceProvider { request ->
            val surface = Surface(st)
            request.provideSurface(surface, ContextCompat.getMainExecutor(context)) {
                surface.release()
            }
        }

        val analysis = ImageAnalysis.Builder()
            .setTargetAspectRatio(AspectRatio.RATIO_16_9)
            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
            .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_RGBA_8888)
            .build()

        analysis.setAnalyzer(analysisExecutor) { imageProxy ->
            trackingData = faceTracker.analyze(imageProxy)
            imageProxy.close()
        }

        try {
            provider.unbindAll()
            provider.bindToLifecycle(
                lifecycleOwner, 
                CameraSelector.DEFAULT_FRONT_CAMERA, 
                preview, 
                analysis
            )
        } catch (e: Exception) {
            Log.e(TAG, "Binding failed", e)
        }
    }

    fun setEffect(effectId: String) {
        currentEffect = com.voexi.arshot.registry.EffectRegistry.getEffect(effectId)
    }

    fun release() {
        analysisExecutor.shutdown()
        faceTracker.release()
        renderer.release()
        cameraProvider?.unbindAll()
        surfaceTexture?.release()
    }
}
