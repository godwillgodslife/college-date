package com.collegedate.app.feature.common

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import java.io.ByteArrayOutputStream

data class PickedPhotoBytes(
    val bytes: ByteArray,
    val contentType: String,
)

fun Context.readCompressedProfilePhoto(uri: Uri): Result<PickedPhotoBytes> =
    runCatching {
        val mimeType = contentResolver.getType(uri).orEmpty()
        require(mimeType.startsWith("image/") || mimeType.isBlank()) {
            "Select an image file."
        }
        val original = contentResolver.openInputStream(uri)?.use { it.readBytes() }
            ?: error("Unable to read selected photo.")
        require(original.isNotEmpty()) { "Selected photo is empty." }

        val decoded = BitmapFactory.decodeByteArray(original, 0, original.size)
        if (decoded == null) {
            require(original.size <= MAX_UPLOAD_BYTES) { "Photo must be 6 MB or smaller." }
            PickedPhotoBytes(original, mimeType.ifBlank { "image/jpeg" })
        } else {
            val compressed = decoded.toJpegBytes()
            require(compressed.size <= MAX_UPLOAD_BYTES) { "Photo must be 6 MB or smaller after compression." }
            PickedPhotoBytes(compressed, "image/jpeg")
        }
    }

private fun Bitmap.toJpegBytes(): ByteArray =
    ByteArrayOutputStream().use { output ->
        compress(Bitmap.CompressFormat.JPEG, 82, output)
        output.toByteArray()
    }

private const val MAX_UPLOAD_BYTES = 6 * 1024 * 1024
