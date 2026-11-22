package com.voexi.arshot

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import com.voexi.arshot.registry.EffectRegistry
import android.util.Log

/**
 * VOEXI AR SHOT - REACT NATIVE BRIDGE
 * Core production bridge. Handles high-security biometric AR data.
 */
class VoexiArShotModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("VoexiArShot")

        // Get Available Effects
        AsyncFunction("getAvailableEffects") {
            return@AsyncFunction EffectRegistry.getAllEffects().map { effect ->
                mapOf(
                    "id" to effect.id,
                    "name" to effect.name,
                    "category" to effect.category.name,
                    "thumb" to effect.thumbnail
                )
            }
        }

        // Feature: Capabilities check
        AsyncFunction("getDeviceTier") {
            // Logic to determine if device supports 3D/Segmentation
            return@AsyncFunction 3
        }
        
        // Native View Manager
        View(VoexiArCameraView::class) {
            Prop("currentEffectId") { view: VoexiArCameraView, prop: String ->
                view.setEffect(prop)
            }
        }
    }
}
