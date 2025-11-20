package org.issieshapiro.issiedocs

import android.content.ContentResolver
import android.content.Context
import android.net.Uri
import android.webkit.MimeTypeMap
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.io.InputStream
import java.io.OutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale.getDefault


class FileProviderModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "FileProviderModule"
    }

    @ReactMethod
    fun getUriForFile(filePath: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            var cleanPath = filePath

            // Remove file:// if exists
            if (cleanPath.startsWith("file://")) {
                cleanPath = cleanPath.removePrefix("file://")
            }

            // Remove absolute prefix to get relative name
            cleanPath = cleanPath.removePrefix("/data/user/0/${context.packageName}/files/")

            val file = File(context.filesDir, cleanPath)

            val uri: Uri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.provider",
                file
            )

            promise.resolve(uri.toString())

        } catch (e: Exception) {
            promise.reject("ERROR", e)
        }
    }




    /**
     * This class will create a temporary file in the cache if need.
     *
     * When the uri already have `file://` schema we don't need to create a new file.
     * The temporary file will always override a previous one, saving memory.
     * Using the cache memory(context.cacheDir) we guarantee to not leak memory
     *
     * @param context used to access Android APIs, like content resolve, it is your activity/fragment.
     * @param uri the URI to load the image from.
     * @param uniqueName If true, make each image cropped have a different file name, this could cause
     * memory issues, use wisely.
     *
     * @return string value of the File path.
     */
    @ReactMethod
    fun getFilePathFromUri(filePath:String, uniqueName: Boolean, promise: Promise) {
        try {
            val uri = Uri.parse(filePath)
            val context: Context = reactApplicationContext

            if (uri.path?.contains("file://") == true) {
                promise.resolve(uri.path)
                return
            }

            val file = getFileFromContentUri(context, uri, uniqueName)
            promise.resolve(file.path)
        } catch (e: Exception) {
            promise.reject("ERROR", e)
        }
    }

    private fun getFileFromContentUri(context: Context, contentUri: Uri, uniqueName: Boolean): File {
        // Preparing Temp file name
        val fileExtension = getFileExtension(context, contentUri) ?: ""
        val timeStamp = SimpleDateFormat("yyyyMMdd_HHmmss", getDefault()).format(Date())
        val fileName = ("temp_file_" + if (uniqueName) timeStamp else "") + ".$fileExtension"
        // Creating Temp file
        val tempFile = File(context.cacheDir, fileName)
        tempFile.createNewFile()
        // Initialize streams
        var oStream: FileOutputStream? = null
        var inputStream: InputStream? = null

        try {
            oStream = FileOutputStream(tempFile)
            inputStream = context.contentResolver.openInputStream(contentUri)

            inputStream?.let { copy(inputStream, oStream) }
            oStream.flush()
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            // Close streams
            inputStream?.close()
            oStream?.close()
        }

        return tempFile
    }

    private fun getFileExtension(context: Context, uri: Uri): String? =
        if (uri.scheme == ContentResolver.SCHEME_CONTENT)
            MimeTypeMap.getSingleton().getExtensionFromMimeType(context.contentResolver.getType(uri))
        else uri.path?.let { MimeTypeMap.getFileExtensionFromUrl(Uri.fromFile(File(it)).toString()) }

    @Throws(IOException::class)
    private fun copy(source: InputStream, target: OutputStream) {
        val buf = ByteArray(8192)
        var length: Int
        while (source.read(buf).also { length = it } > 0) {
            target.write(buf, 0, length)
        }
    }
}