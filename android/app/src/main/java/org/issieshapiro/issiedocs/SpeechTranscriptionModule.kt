package org.issieshapiro.issiedocs

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.Locale

class SpeechTranscriptionModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "SpeechTranscription"

    private val mainHandler = Handler(Looper.getMainLooper())
    private var speechRecognizer: SpeechRecognizer? = null
    private var tts: TextToSpeech? = null
    private var ttsReady = false
    private var isRecording = false
    private var language = "en"
    private var silenceTimer: Runnable? = null
    private var accumulatedText = ""  // text built up across restarts
    private val SILENCE_TIMEOUT_MS = 10_000L
    private val UTTERANCE_ID = "issie_speak"

    private fun emit(event: String, body: WritableMap?) {
        if (!reactApplicationContext.hasActiveReactInstance()) return
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(event, body)
    }

    private fun langToLocale(lang: String): Locale = when (lang) {
        "he" -> Locale("he", "IL")
        "ar" -> Locale("ar", "SA")
        else -> Locale.US
    }

    private fun makeListenIntent() = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
        putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
        putExtra(RecognizerIntent.EXTRA_LANGUAGE, langToLocale(language).toLanguageTag())
        putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
        putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
        putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 2000L)
        putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 2000L)
    }

    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}

    @ReactMethod fun setLanguage(lang: String) { language = lang }
    @ReactMethod fun attachToKeyboard(textToolsEnabled: Boolean, speakDictateEnabled: Boolean) {}
    @ReactMethod fun detachFromKeyboard() {}
    @ReactMethod fun refreshToolbar() {}
    @ReactMethod fun updateFormattingState(state: ReadableMap) {}

    @ReactMethod
    fun startTranscription(promise: Promise) {
        if (isRecording) { promise.resolve(null); return }

        mainHandler.post {
            if (!SpeechRecognizer.isRecognitionAvailable(reactApplicationContext)) {
                emit("onTranscriptionError", Arguments.createMap().apply {
                    putString("message", "Speech recognition not available")
                })
                promise.reject("NOT_AVAILABLE", "Speech recognition not available")
                return@post
            }

            destroyRecognizer()
            accumulatedText = ""
            isRecording = true
            startListeningSession(firstSession = true, promise = promise)
        }
    }

    private fun startListeningSession(firstSession: Boolean, promise: Promise? = null) {
        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(reactApplicationContext)
        speechRecognizer?.setRecognitionListener(object : RecognitionListener {
            private var partialText = ""
            private var sessionStarted = false

            override fun onReadyForSpeech(params: Bundle?) {
                if (!sessionStarted) {
                    sessionStarted = true
                    if (firstSession) {
                        promise?.resolve(null)
                        emit("onTranscriptionStart", Arguments.createMap())
                    }
                    startSilenceTimer()
                }
            }

            override fun onPartialResults(partialResults: Bundle?) {
                val text = partialResults
                    ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    ?.firstOrNull()?.takeIf { it.isNotEmpty() } ?: return
                if (text == partialText) return
                partialText = text
                resetSilenceTimer()
                val full = if (accumulatedText.isEmpty()) text else "$accumulatedText $text"
                emit("onTranscription", Arguments.createMap().apply {
                    putString("text", full)
                    putBoolean("isFinal", false)
                })
            }

            override fun onResults(results: Bundle?) {
                val text = results
                    ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    ?.firstOrNull()?.takeIf { it.isNotEmpty() } ?: partialText

                if (text.isNotEmpty()) {
                    val sep = if (accumulatedText.isEmpty()) "" else " "
                    accumulatedText = "$accumulatedText$sep$text"
                    emit("onTranscription", Arguments.createMap().apply {
                        putString("text", accumulatedText)
                        putBoolean("isFinal", false)  // not final yet — user still dictating
                    })
                }

                // Restart immediately to keep listening
                if (isRecording) {
                    destroyRecognizer()
                    resetSilenceTimer()
                    startListeningSession(firstSession = false)
                }
            }

            override fun onError(error: Int) {
                val isNormalEnd = error == SpeechRecognizer.ERROR_NO_MATCH ||
                        error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT

                if (!isRecording) return  // user stopped us

                if (isNormalEnd) {
                    // Restart silently to keep listening
                    destroyRecognizer()
                    startListeningSession(firstSession = false)
                } else {
                    // Real error — give up
                    cancelSilenceTimer()
                    isRecording = false
                    if (accumulatedText.isNotEmpty()) {
                        emit("onTranscription", Arguments.createMap().apply {
                            putString("text", accumulatedText)
                            putBoolean("isFinal", true)
                        })
                    }
                    emit("onTranscriptionError", Arguments.createMap().apply {
                        putString("message", "Recognition error: $error")
                    })
                    emit("onTranscriptionEnd", Arguments.createMap())
                    promise?.reject("ERROR", "error $error")
                }
            }

            override fun onEndOfSpeech() {}
            override fun onBeginningOfSpeech() { resetSilenceTimer() }
            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEvent(eventType: Int, params: Bundle?) {}
        })

        speechRecognizer?.startListening(makeListenIntent())
    }

    private fun destroyRecognizer() {
        speechRecognizer?.destroy()
        speechRecognizer = null
    }

    @ReactMethod
    fun stopTranscription() {
        if (!isRecording) return
        mainHandler.post {
            cancelSilenceTimer()
            isRecording = false
            destroyRecognizer()
            if (accumulatedText.isNotEmpty()) {
                emit("onTranscription", Arguments.createMap().apply {
                    putString("text", accumulatedText)
                    putBoolean("isFinal", true)
                })
            }
            accumulatedText = ""
            emit("onTranscriptionEnd", Arguments.createMap())
        }
    }

    @ReactMethod
    fun startSpeaking(text: String, fallbackLanguage: String, speechRate: Float) {
        if (text.isEmpty()) return
        if (isRecording) stopTranscription()

        mainHandler.post {
            fun doSpeak() {
                val locale = langToLocale(fallbackLanguage)
                tts?.language = locale
                tts?.setSpeechRate(if (speechRate > 0) speechRate * 2f else 1f)
                tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, UTTERANCE_ID)
            }

            if (tts != null && ttsReady) {
                doSpeak()
            } else {
                tts?.shutdown()
                tts = TextToSpeech(reactApplicationContext) { status ->
                    if (status == TextToSpeech.SUCCESS) {
                        ttsReady = true
                        tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                            override fun onStart(utteranceId: String?) {
                                emit("onSpeakingStart", Arguments.createMap())
                            }
                            override fun onDone(utteranceId: String?) {
                                emit("onSpeakingEnd", Arguments.createMap())
                            }
                            @Deprecated("Deprecated in Java")
                            override fun onError(utteranceId: String?) {
                                emit("onSpeakingEnd", Arguments.createMap())
                            }
                            override fun onRangeStart(utteranceId: String?, start: Int, end: Int, frame: Int) {
                                emit("onSpeakingWord", Arguments.createMap().apply {
                                    putInt("location", start)
                                    putInt("length", end - start)
                                })
                            }
                        })
                        mainHandler.post { doSpeak() }
                    }
                }
            }
        }
    }

    @ReactMethod
    fun stopSpeaking() {
        mainHandler.post {
            tts?.stop()
            emit("onSpeakingEnd", Arguments.createMap())
        }
    }

    private fun startSilenceTimer() {
        cancelSilenceTimer()
        val r = Runnable {
            if (isRecording) {
                // Silence timeout — commit what we have and stop
                isRecording = false
                destroyRecognizer()
                if (accumulatedText.isNotEmpty()) {
                    emit("onTranscription", Arguments.createMap().apply {
                        putString("text", accumulatedText)
                        putBoolean("isFinal", true)
                    })
                }
                accumulatedText = ""
                emit("onTranscriptionEnd", Arguments.createMap())
            }
        }
        silenceTimer = r
        mainHandler.postDelayed(r, SILENCE_TIMEOUT_MS)
    }

    private fun resetSilenceTimer() {
        silenceTimer?.let { mainHandler.removeCallbacks(it) }
        startSilenceTimer()
    }

    private fun cancelSilenceTimer() {
        silenceTimer?.let { mainHandler.removeCallbacks(it) }
        silenceTimer = null
    }

    override fun onCatalystInstanceDestroy() {
        mainHandler.post {
            cancelSilenceTimer()
            isRecording = false
            destroyRecognizer()
            tts?.shutdown()
            tts = null
            ttsReady = false
        }
    }
}
