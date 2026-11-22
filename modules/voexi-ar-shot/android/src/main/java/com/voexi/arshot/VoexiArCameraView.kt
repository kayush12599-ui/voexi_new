package com.voexi.arshot

import android.content.Context
import android.opengl.GLSurfaceView
import androidx.lifecycle.LifecycleOwner
import com.voexi.arshot.core.ArEngine
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView
import javax.microedition.khronos.egl.EGLConfig
import javax.microedition.khronos.opengles.GL10

/**
 * VOEXI AR CAMERA VIEW
 * Orchestrates OpenGL lifecycle and links to the AR Engine.
 */
class VoexiArCameraView(context: Context, appContext: AppContext) : ExpoView(context, appContext), GLSurfaceView.Renderer {
    private val glSurfaceView = GLSurfaceView(context)
    private val arEngine = ArEngine(context)

    init {
        glSurfaceView.setEGLContextClientVersion(2)
        glSurfaceView.setRenderer(this)
        glSurfaceView.renderMode = GLSurfaceView.RENDERMODE_CONTINUOUSLY
        addView(glSurfaceView)
    }

    override fun onSurfaceCreated(gl: GL10?, config: EGLConfig?) {
        arEngine.onSurfaceCreated()
        
        // Start camera once GL context is ready
        (context as? LifecycleOwner)?.let {
            arEngine.start(it)
        }
    }

    override fun onSurfaceChanged(gl: GL10?, width: Int, height: Int) {
        arEngine.onSurfaceChanged(width, height)
    }

    override fun onDrawFrame(gl: GL10?) {
        arEngine.onDrawFrame()
    }

    fun setEffect(effectId: String) {
        arEngine.setEffect(effectId)
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        arEngine.release()
    }
}
