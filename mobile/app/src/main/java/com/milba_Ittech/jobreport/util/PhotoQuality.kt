package com.milba_Ittech.jobreport.util

import android.graphics.Bitmap

object PhotoQuality {

    sealed class Result {
        object Good                       : Result()
        object TooDark                    : Result()
        object TooBright                  : Result()
        data class Blurry(val score: Double) : Result()
        object Blank                      : Result()
    }

    fun check(bitmap: Bitmap): Result {
        val scaled = Bitmap.createScaledBitmap(bitmap, 400, 300, true)

        // Check brightness
        val brightness = calculateBrightness(scaled)
        if (brightness < 40)  return Result.TooDark
        if (brightness > 240) return Result.TooBright

        // Check blank (very low color variance = covered lens)
        val variance = calculateColorVariance(scaled)
        if (variance < 100) return Result.Blank

        // Check blur (Laplacian variance)
        val blurScore = calculateLaplacianVariance(scaled)
        if (blurScore < 80.0) return Result.Blurry(blurScore)

        return Result.Good
    }

    private fun calculateBrightness(bitmap: Bitmap): Double {
        var total = 0L
        val pixels = IntArray(bitmap.width * bitmap.height)
        bitmap.getPixels(pixels, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height)

        for (pixel in pixels) {
            val r = (pixel shr 16) and 0xFF
            val g = (pixel shr 8)  and 0xFF
            val b =  pixel         and 0xFF
            total += (0.299 * r + 0.587 * g + 0.114 * b).toLong()
        }
        return total.toDouble() / pixels.size
    }

    private fun calculateColorVariance(bitmap: Bitmap): Double {
        val pixels = IntArray(bitmap.width * bitmap.height)
        bitmap.getPixels(pixels, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height)

        val values = pixels.map { pixel ->
            val r = (pixel shr 16) and 0xFF
            val g = (pixel shr 8)  and 0xFF
            val b =  pixel         and 0xFF
            (r + g + b) / 3.0
        }

        val mean = values.average()
        return values.map { (it - mean) * (it - mean) }.average()
    }

    private fun calculateLaplacianVariance(bitmap: Bitmap): Double {
        val gray = toGrayscale(bitmap)
        val width  = gray[0].size
        val height = gray.size
        val laplacianValues = mutableListOf<Double>()

        for (y in 1 until height - 1) {
            for (x in 1 until width - 1) {
                val laplacian = (
                        -gray[y-1][x]   - gray[y][x-1]   +
                                4 * gray[y][x]  - gray[y][x+1]   -
                                gray[y+1][x]
                        ).toDouble()
                laplacianValues.add(laplacian * laplacian)
            }
        }

        return laplacianValues.average()
    }

    private fun toGrayscale(bitmap: Bitmap): Array<IntArray> {
        val width  = bitmap.width
        val height = bitmap.height
        val pixels = IntArray(width * height)
        bitmap.getPixels(pixels, 0, width, 0, 0, width, height)

        return Array(height) { y ->
            IntArray(width) { x ->
                val pixel = pixels[y * width + x]
                val r = (pixel shr 16) and 0xFF
                val g = (pixel shr 8)  and 0xFF
                val b =  pixel         and 0xFF
                (0.299 * r + 0.587 * g + 0.114 * b).toInt()
            }
        }
    }
}