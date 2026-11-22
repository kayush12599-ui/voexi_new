package com.voexi.arshot.registry

import com.voexi.arshot.models.*
import java.util.concurrent.ConcurrentHashMap

/**
 * VOEXI AR SHOT - PRODUCTION REGISTRY
 * All high-security filters are registered here.
 */
object EffectRegistry {
    private val registry = ConcurrentHashMap<String, ArEffect>()
    
    init {
        registerBuiltIn()
    }

    private fun registerBuiltIn() {
        // --- VOEXI CAT (THE TEST EFFECT) ---
        register(ArEffect(
            id = "VOEXI_CAT_001",
            name = "Space Cat",
            category = ArCategory.FACE,
            version = "1.0",
            thumbnail = "cat_thumb",
            type = ArEffectType.TWO_D_OVERLAY,
            assets = listOf(
                ArAsset(
                    id = "ears", 
                    type = AssetType.TEXTURE_PNG, 
                    uri = "asset://ar/effects/VOEXI_CAT/textures/cat_ears.png", 
                    anchor = FaceAnchor.HEAD_TOP, 
                    scale = 1.3f
                ),
                ArAsset(
                    id = "whiskers", 
                    type = AssetType.TEXTURE_PNG, 
                    uri = "asset://ar/effects/VOEXI_CAT/textures/whiskers.png", 
                    anchor = FaceAnchor.FACE_CENTER, 
                    scale = 1.0f
                ),
                ArAsset(
                    id = "nose", 
                    type = AssetType.TEXTURE_PNG, 
                    uri = "asset://ar/effects/VOEXI_CAT/textures/cat_nose.png", 
                    anchor = FaceAnchor.NOSE, 
                    scale = 0.7f
                )
            )
        ))

        // --- CYBER VISOR ---
        register(ArEffect(
            id = "VOEXI_NEON_001",
            name = "Cyber Visor",
            category = ArCategory.VOEXI_ORIGINAL,
            version = "1.2",
            thumbnail = "neon_thumb",
            type = ArEffectType.TWO_D_OVERLAY,
            assets = listOf(
                ArAsset(
                    id = "visor", 
                    type = AssetType.TEXTURE_PNG, 
                    uri = "asset://ar/effects/CYBER/visor.png", 
                    anchor = FaceAnchor.LEFT_EYE, 
                    scale = 1.2f,
                    opacity = 0.8f
                )
            )
        ))
    }

    fun register(effect: ArEffect) {
        registry[effect.id] = effect
    }

    fun getEffect(id: String): ArEffect? = registry[id]

    fun getAllEffects(): List<ArEffect> = registry.values.toList()
}
