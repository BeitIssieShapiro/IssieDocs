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

            if (locale.isNullOrEmpty()) {
                // Fallback to system locale
                val sysLang = java.util.Locale.getDefault().language
                Log.d("KeyboardLanguage", "Using system locale fallback: $sysLang")
                return sysLang
            }

            // Parse the locale string (could be "en_US", "he", "ar", etc.)
            var lang = locale.split("_")[0].lowercase()

            // Android uses old ISO 639 codes: "iw" for Hebrew, "in" for Indonesian
            // Map them to modern codes
            lang = when (lang) {
                "iw" -> "he"  // Hebrew
                "in" -> "id"  // Indonesian
                "ji" -> "yi"  // Yiddish
                else -> lang
            }

            Log.d("KeyboardLanguage", "Parsed language: $lang")
            return lang
        } catch (e: Exception) {
            Log.e("KeyboardLanguage", "Error getting language", e)
            // Fallback to system locale on error
            val fallbackLang = java.util.Locale.getDefault().language
            Log.d("KeyboardLanguage", "Exception fallback: $fallbackLang")
            return fallbackLang
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

    // Allow JS to trigger a manual check (e.g., on keyboardDidShow)
    @ReactMethod
    fun checkAndEmit() {
        val lang = getLanguage()
        Log.d("KeyboardLanguage", "checkAndEmit emitting: $lang")
        sendEvent("keyboardLanguageDidChange", lang)
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