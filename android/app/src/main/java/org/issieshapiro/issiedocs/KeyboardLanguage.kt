// todo
package com.yourprojectname

import android.content.Context
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
        val imm = reactContext.getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
        val ims = imm.currentInputMethodSubtype
        return ims?.locale ?: "unknown"
    }

    @ReactMethod
    fun getCurrentLanguage(promise: Promise) {
        try {
            promise.resolve(getLanguage())
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
    
    // Allow JS to trigger a manual check (e.g., on keyboardDidShow)
    @ReactMethod
    fun checkAndEmit() {
         sendEvent("keyboardLanguageDidChange", getLanguage())
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