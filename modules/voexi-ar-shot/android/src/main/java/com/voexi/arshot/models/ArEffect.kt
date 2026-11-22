package com.voexi.arshot.models

import android.os.Parcelable
import kotlinx.parcelize.Parcelize

/**
 * VOEXI AR SHOT - EFFECT DEFINITION MODEL
 * Production-ready data structure for extensible AR effects.
 */
@Parcelize
data class ArEffect(
    val id: String,
    val name: String,
    val category: ArCategory,
    val version: String,
    val thumbnail: String?,
    val type: ArEffectType,
    val trackingType: TrackingType = TrackingType.FACE_MESH,
    val assets: List<ArAsset>,
    val settings: ArSettings = ArSettings()
) : Parcelable

@Parcelize
enum class ArCategory : Parcelable {
    TRENDING, FACE, THREE_D, WORLD, ACCESSORIES, VOEXI_ORIGINAL
}

@Parcelize
enum class ArEffectType : Parcelable {
    TWO_D_OVERLAY,    // PNG/WebP on landmarks
    THREE_D_OBJECT,   // GLB/GLTF models
    PARTICLE_SYSTEM,  // Sparkles, Fire, etc.
    FACE_MESH_DEFORM, // Distortion
    BACKGROUND_FX,    // Segmentation
    WORLD_AR          // Floor/Plane tracking
}

@Parcelize
enum class TrackingType : Parcelable {
    FACE_LANDMARKS,   // Basic (Eyes, Nose)
    FACE_MESH,        // Advanced (468 points)
    BODY_SEGMENTATION, // Background removal
    PLANE_TRACKING    // World AR
}

@Parcelize
data class ArAsset(
    val id: String,
    val type: AssetType,
    val uri: String, // Local path or Remote URL
    val anchor: FaceAnchor? = null,
    val scale: Float = 1.0f,
    val rotation: FloatArray = floatArrayOf(0f, 0f, 0f),
    val offset: FloatArray = floatArrayOf(0f, 0f, 0f),
    val opacity: Float = 1.0f,
    val animation: AnimationType = AnimationType.NONE
) : Parcelable

@Parcelize
enum class AssetType : Parcelable {
    TEXTURE_PNG, TEXTURE_WEBP, MODEL_GLB, SHADER_FRAG, PARTICLE_JSON, AUDIO_MP3
}

@Parcelize
enum class FaceAnchor : Parcelable {
    FOREHEAD, LEFT_EYE, RIGHT_EYE, NOSE, MOUTH, LEFT_CHEEK, RIGHT_CHEEK, FACE_CENTER, HEAD_TOP
}

@Parcelize
enum class AnimationType : Parcelable {
    NONE, PULSE, FLOAT, ROTATE, BLINK, BEAT_SYNC
}

@Parcelize
data class ArSettings(
    val beautyLevel: Float = 0.0f,
    val particleIntensity: Float = 1.0f,
    val musicBeatSync: Boolean = false,
    val performanceTierRequired: Int = 1
) : Parcelable
