package org.issieshapiro.issiedocs

import android.content.Context
import android.util.Log
import android.view.inputmethod.InputMethodManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class KeyboardLanguageModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "KeyboardLanguage"

    private var lastEmittedLang: String? = null

    // Helper to get current language
    private fun getLanguage(): String {
        try {
            val imm = reactContext.getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
            val ims = imm.currentInputMethodSubtype

            Log.d("KeyboardLanguage", "=== Keyboard Language Detection ===")
            Log.d("KeyboardLanguage", "InputMethodSubtype: $ims")

            // Get the locale string from the subtype
            val locale = ims?.locale
            Log.d("KeyboardLanguage", "Locale from subtype: $locale")

            // Try languageTag (API 24+) which is more reliable on newer keyboards like Gboard
            if (locale.isNullOrEmpty() && ims != null && android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.N) {
                val languageTag = ims.languageTag
                Log.d("KeyboardLanguage", "Trying languageTag: $languageTag")
                if (!languageTag.isNullOrEmpty()) {
                    val parsed = java.util.Locale.forLanguageTag(languageTag).language
                    Log.d("KeyboardLanguage", "Parsed from languageTag: $parsed")
                    return normalizeLanguage(parsed)
                }
            }

            if (locale.isNullOrEmpty()) {
                // Fallback to system locale (not ideal - this is device language, not keyboard language)
                val sysLang = java.util.Locale.getDefault().language
                Log.d("KeyboardLanguage", "Using system locale fallback: $sysLang")
                return normalizeLanguage(sysLang)
            }

            // Parse the locale string (could be "en_US", "he", "ar", etc.)
            val lang = locale.split("_")[0].lowercase()
            Log.d("KeyboardLanguage", "Parsed language: $lang")
            return normalizeLanguage(lang)
        } catch (e: Exception) {
            Log.e("KeyboardLanguage", "Error getting language", e)
            val fallbackLang = java.util.Locale.getDefault().language
            Log.d("KeyboardLanguage", "Exception fallback: $fallbackLang")
            return normalizeLanguage(fallbackLang)
        }
    }

    // Normalize legacy ISO 639 codes to modern ones
    private fun normalizeLanguage(lang: String): String {
        return when (lang) {
            "iw" -> "he"  // Hebrew
            "in" -> "id"  // Indonesian
            "ji" -> "yi"  // Yiddish
            else -> lang
        }
    }

    @ReactMethod
    fun getCurrentLanguage(promise: Promise) {
        try {
            val lang = getLanguage()
            Log.d("KeyboardLanguage", "getCurrentLanguage returning: $lang")
            promise.resolve(lang)
        } catch (e: Exception) {
            Log.e("KeyboardLanguage", "getCurrentLanguage error", e)
            promise.reject("ERROR", e.message)
        }
    }

    // Allow JS to trigger a manual check (e.g., on keyboardDidShow or periodic poll)
    // Only emits if language has changed to avoid unnecessary re-renders
    @ReactMethod
    fun checkAndEmit() {
        val lang = getLanguage()
        if (lang != lastEmittedLang) {
            Log.d("KeyboardLanguage", "checkAndEmit language changed: $lastEmittedLang -> $lang")
            lastEmittedLang = lang
            sendEvent("keyboardLanguageDidChange", lang)
        }
    }

    private fun sendEvent(eventName: String, data: String) {
        if (reactContext.hasActiveCatalystInstance()) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, data)
        }
    }
    
    // Required for NativeEventEmitter in RN
    @ReactMethod
    fun addListener(eventName: String) { }

    @ReactMethod
    fun removeListeners(count: Int) { }
}