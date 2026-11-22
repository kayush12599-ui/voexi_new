package com.voexi.arshot.rendering

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.opengl.GLES11Ext
import android.opengl.GLES20
import android.opengl.GLUtils
import android.opengl.Matrix
import android.util.Log
import com.voexi.arshot.models.ArAsset
import com.voexi.arshot.models.ArEffect
import com.voexi.arshot.models.AssetType
import com.voexi.arshot.models.FaceAnchor
import com.voexi.arshot.tracking.FaceTracker
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.FloatBuffer

/**
 * VOEXI AR SHOT - PRODUCTION OPENGL RENDERER
 * Renders Camera OES Texture and AR Overlays.
 */
class ArRenderer(private val context: Context) {
    private val TAG = "VoexiArRenderer"

    // Background (Camera) Shaders
    private val backgroundVertexShaderCode = """
        attribute vec4 position;
        attribute vec4 inputTextureCoordinate;
        varying vec2 textureCoordinate;
        void main() {
            gl_Position = position;
            textureCoordinate = inputTextureCoordinate.xy;
        }
    """.trimIndent()

    private val backgroundFragmentShaderCode = """
        #extension GL_OES_EGL_image_external : require
        precision mediump float;
        varying vec2 textureCoordinate;
        uniform samplerExternalOES inputImageTexture;
        void main() {
            gl_FragColor = texture2D(inputImageTexture, textureCoordinate);
        }
    """.trimIndent()

    // AR Asset Shaders
    private val assetVertexShaderCode = """
        uniform mat4 uMVPMatrix;
        attribute vec4 vPosition;
        attribute vec2 vTexCoord;
        varying vec2 vfTexCoord;
        void main() {
            gl_Position = uMVPMatrix * vPosition;
            vfTexCoord = vTexCoord;
        }
    """.trimIndent()

    private val assetFragmentShaderCode = """
        precision mediump float;
        uniform sampler2D uTexture;
        uniform float uOpacity;
        varying vec2 vfTexCoord;
        void main() {
            vec4 color = texture2D(uTexture, vfTexCoord);
            gl_FragColor = vec4(color.rgb, color.a * uOpacity);
        }
    """.trimIndent()

    private var backgroundProgram = 0
    private var assetProgram = 0
    private var vertexBuffer: FloatBuffer? = null
    private var textureBuffer: FloatBuffer? = null
    private var bgTextureBuffer: FloatBuffer? = null

    private val textures = mutableMapOf<String, Int>()

    fun onSurfaceCreated() {
        GLES20.glEnable(GLES20.GL_BLEND)
        GLES20.glBlendFunc(GLES20.GL_SRC_ALPHA, GLES20.GL_ONE_MINUS_SRC_ALPHA)
        
        backgroundProgram = createProgram(backgroundVertexShaderCode, backgroundFragmentShaderCode)
        assetProgram = createProgram(assetVertexShaderCode, assetFragmentShaderCode)
        
        setupBuffers()
    }

    fun onSurfaceChanged(width: Int, height: Int) {
        GLES20.glViewport(0, 0, width, height)
    }

    fun drawBackground(textureId: Int) {
        GLES20.glUseProgram(backgroundProgram)
        
        val posHandle = GLES20.glGetAttribLocation(backgroundProgram, "position")
        val texCoordHandle = GLES20.glGetAttribLocation(backgroundProgram, "inputTextureCoordinate")
        
        GLES20.glVertexAttribPointer(posHandle, 2, GLES20.GL_FLOAT, false, 0, vertexBuffer)
        GLES20.glEnableVertexAttribArray(posHandle)
        
        GLES20.glVertexAttribPointer(texCoordHandle, 2, GLES20.GL_FLOAT, false, 0, bgTextureBuffer)
        GLES20.glEnableVertexAttribArray(texCoordHandle)
        
        GLES20.glActiveTexture(GLES20.GL_TEXTURE0)
        GLES20.glBindTexture(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, textureId)
        GLES20.glUniform1i(GLES20.glGetUniformLocation(backgroundProgram, "inputImageTexture"), 0)
        
        GLES20.glDrawArrays(GLES20.GL_TRIANGLE_STRIP, 0, 4)
    }

    fun renderEffects(effect: ArEffect?, trackingData: FaceTracker.TrackingData, width: Int, height: Int) {
        if (effect == null || !trackingData.faceDetected) return

        effect.assets.forEach { asset ->
            if (asset.type == AssetType.TEXTURE_PNG || asset.type == AssetType.TEXTURE_WEBP) {
                renderTexture(asset, trackingData, width, height)
            }
        }
    }

    private fun renderTexture(asset: ArAsset, trackingData: FaceTracker.TrackingData, w: Int, h: Int) {
        val textureId = getOrLoadTexture(asset)
        if (textureId == 0) return

        val anchor = getLandmarkPosition(asset.anchor, trackingData, w, h) ?: return
        
        GLES20.glUseProgram(assetProgram)
        
        val mvpMatrix = FloatArray(16)
        val projMatrix = FloatArray(16)
        val modelMatrix = FloatArray(16)
        
        Matrix.orthoM(projMatrix, 0, 0f, w.toFloat(), h.toFloat(), 0f, -1f, 1f)
        Matrix.setIdentityM(modelMatrix, 0)
        
        // Transform
        Matrix.translateM(modelMatrix, 0, anchor.x, anchor.y, 0f)
        Matrix.rotateM(modelMatrix, 0, trackingData.roll, 0f, 0f, 1f)
        
        val assetScale = asset.scale * trackingData.scale * 300f 
        Matrix.scaleM(modelMatrix, 0, assetScale, assetScale, 1f)

        Matrix.multiplyMM(mvpMatrix, 0, projMatrix, 0, modelMatrix, 0)

        val posHandle = GLES20.glGetAttribLocation(assetProgram, "vPosition")
        val texHandle = GLES20.glGetAttribLocation(assetProgram, "vTexCoord")
        val mvpHandle = GLES20.glGetUniformLocation(assetProgram, "uMVPMatrix")
        val opHandle = GLES20.glGetUniformLocation(assetProgram, "uOpacity")

        GLES20.glUniformMatrix4fv(mvpHandle, 1, false, mvpMatrix, 0)
        GLES20.glUniform1f(opHandle, asset.opacity)

        GLES20.glVertexAttribPointer(posHandle, 3, GLES20.GL_FLOAT, false, 0, vertexBuffer)
        GLES20.glEnableVertexAttribArray(posHandle)
        
        GLES20.glVertexAttribPointer(texHandle, 2, GLES20.GL_FLOAT, false, 0, textureBuffer)
        GLES20.glEnableVertexAttribArray(texHandle)

        GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, textureId)
        GLES20.glDrawArrays(GLES20.GL_TRIANGLE_STRIP, 0, 4)
    }

    private fun getLandmarkPosition(anchor: FaceAnchor?, trackingData: FaceTracker.TrackingData, w: Int, h: Int): android.graphics.PointF? {
        val landmarks = trackingData.landmarks
        if (landmarks.isEmpty()) return null
        
        return when (anchor) {
            FaceAnchor.NOSE -> {
                val lm = landmarks[1]
                android.graphics.PointF(lm.x * w, lm.y * h)
            }
            FaceAnchor.HEAD_TOP -> {
                val lm = landmarks[10]
                android.graphics.PointF(lm.x * w, (lm.y - 0.05f) * h)
            }
            FaceAnchor.LEFT_EYE -> {
                val lm = landmarks[33]
                android.graphics.PointF(lm.x * w, lm.y * h)
            }
            FaceAnchor.RIGHT_EYE -> {
                val lm = landmarks[263]
                android.graphics.PointF(lm.x * w, lm.y * h)
            }
            FaceAnchor.FACE_CENTER -> {
                val lm = landmarks[168]
                android.graphics.PointF(lm.x * w, lm.y * h)
            }
            else -> {
                val lm = landmarks[1]
                android.graphics.PointF(lm.x * w, lm.y * h)
            }
        }
    }

    private fun getOrLoadTexture(asset: ArAsset): Int {
        if (textures.containsKey(asset.id)) return textures[asset.id]!!
        
        val path = asset.uri.replace("asset://", "")
        return try {
            val stream = context.assets.open(path)
            val bitmap = BitmapFactory.decodeStream(stream)
            val id = loadTextureToGl(bitmap)
            textures[asset.id] = id
            id
        } catch (e: Exception) {
            Log.e(TAG, "Texture load failed: ${asset.uri}")
            0
        }
    }

    private fun loadTextureToGl(bitmap: Bitmap): Int {
        val ids = IntArray(1)
        GLES20.glGenTextures(1, ids, 0)
        GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, ids[0])
        GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_MIN_FILTER, GLES20.GL_LINEAR)
        GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_MAG_FILTER, GLES20.GL_LINEAR)
        GLUtils.texImage2D(GLES20.GL_TEXTURE_2D, 0, bitmap, 0)
        bitmap.recycle()
        return ids[0]
    }

    private fun setupBuffers() {
        val squareCoords = floatArrayOf(-1f, 1f, 0f, -1f, -1f, 0f, 1f, 1f, 0f, 1f, -1f, 0f)
        vertexBuffer = ByteBuffer.allocateDirect(squareCoords.size * 4).order(ByteOrder.nativeOrder()).asFloatBuffer().put(squareCoords)
        vertexBuffer?.position(0)

        val texCoords = floatArrayOf(0f, 0f, 0f, 1f, 1f, 0f, 1f, 1f)
        textureBuffer = ByteBuffer.allocateDirect(texCoords.size * 4).order(ByteOrder.nativeOrder()).asFloatBuffer().put(texCoords)
        textureBuffer?.position(0)
        
        // Background texture coords might need flip
        val bgTexCoords = floatArrayOf(0f, 1f, 1f, 1f, 0f, 0f, 1f, 0f)
        bgTextureBuffer = ByteBuffer.allocateDirect(bgTexCoords.size * 4).order(ByteOrder.nativeOrder()).asFloatBuffer().put(bgTexCoords)
        bgTextureBuffer?.position(0)
    }

    private fun createProgram(vSource: String, fSource: String): Int {
        val vs = GLES20.glCreateShader(GLES20.GL_VERTEX_SHADER).also { GLES20.glShaderSource(it, vSource); GLES20.glCompileShader(it) }
        val fs = GLES20.glCreateShader(GLES20.GL_FRAGMENT_SHADER).also { GLES20.glShaderSource(it, fSource); GLES20.glCompileShader(it) }
        val p = GLES20.glCreateProgram().also { 
            GLES20.glAttachShader(it, vs); 
            GLES20.glAttachShader(it, fs); 
            GLES20.glLinkProgram(it) 
        }
        return p
    }

    fun release() {
        textures.values.forEach { GLES20.glDeleteTextures(1, intArrayOf(it), 0) }
        textures.clear()
    }
}
