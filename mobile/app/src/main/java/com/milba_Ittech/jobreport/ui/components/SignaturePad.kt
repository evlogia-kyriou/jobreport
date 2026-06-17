package com.milba_Ittech.jobreport.ui.components

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.dp
import com.milba_Ittech.jobreport.ui.theme.NeutralBorder
import com.milba_Ittech.jobreport.ui.theme.NeutralMid
import com.milba_Ittech.jobreport.ui.theme.White

data class SignaturePath(val points: List<Offset>)

@Composable
fun SignaturePad(
    modifier:   Modifier = Modifier,
    onSigned:   (Bitmap) -> Unit,
    onClear:    () -> Unit
) {
    val paths = remember { mutableStateListOf<SignaturePath>() }
    val currentPath = remember { mutableStateListOf<Offset>() }
    var hasSigned by remember { mutableStateOf(false) }

    // Canvas size for bitmap capture
    var canvasWidth  by remember { mutableStateOf(0) }
    var canvasHeight by remember { mutableStateOf(0) }

    Column(modifier = modifier) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(200.dp)
                .background(White, RoundedCornerShape(8.dp))
                .border(1.dp, NeutralBorder, RoundedCornerShape(8.dp))
        ) {
            Canvas(
                modifier = Modifier
                    .fillMaxSize()
                    .pointerInput(Unit) {
                        canvasWidth  = size.width
                        canvasHeight = size.height

                        detectDragGestures(
                            onDragStart = { offset ->
                                currentPath.clear()
                                currentPath.add(offset)
                                hasSigned = true
                            },
                            onDrag = { change, _ ->
                                currentPath.add(change.position)
                            },
                            onDragEnd = {
                                if (currentPath.isNotEmpty()) {
                                    paths.add(SignaturePath(currentPath.toList()))
                                    currentPath.clear()

                                    // Capture bitmap
                                    val bitmap = captureToBitmap(
                                        paths.toList() + if (currentPath.isNotEmpty())
                                            listOf(SignaturePath(currentPath.toList()))
                                        else emptyList(),
                                        canvasWidth,
                                        canvasHeight
                                    )
                                    onSigned(bitmap)
                                }
                            }
                        )
                    }
            ) {
                // Draw completed paths
                paths.forEach { path ->
                    if (path.points.size > 1) {
                        val composePath = Path()
                        composePath.moveTo(path.points[0].x, path.points[0].y)
                        path.points.drop(1).forEach { composePath.lineTo(it.x, it.y) }

                        drawPath(
                            path   = composePath,
                            color  = Color(0xFF1E293B),
                            style  = Stroke(width = 3f, cap = StrokeCap.Round, join = StrokeJoin.Round)
                        )
                    }
                }

                // Draw current path
                if (currentPath.size > 1) {
                    val composePath = Path()
                    composePath.moveTo(currentPath[0].x, currentPath[0].y)
                    currentPath.drop(1).forEach { composePath.lineTo(it.x, it.y) }

                    drawPath(
                        path  = composePath,
                        color = Color(0xFF1E293B),
                        style = Stroke(width = 3f, cap = StrokeCap.Round, join = StrokeJoin.Round)
                    )
                }
            }

            // Placeholder text
            if (!hasSigned) {
                Text(
                    text     = "Tanda tangan di sini",
                    color    = Color(NeutralMid.value),
                    modifier = Modifier.align(Alignment.Center)
                )
            }
        }

        // Clear button
        if (hasSigned) {
            TextButton(
                onClick = {
                    paths.clear()
                    currentPath.clear()
                    hasSigned = false
                    onClear()
                },
                modifier = Modifier.align(Alignment.End)
            ) {
                Text("Hapus", color = Color(NeutralMid.value))
            }
        }
    }
}

private fun captureToBitmap(
    paths:  List<SignaturePath>,
    width:  Int,
    height: Int
): Bitmap {
    val bitmap  = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
    val canvas  = Canvas(bitmap)
    canvas.drawColor(android.graphics.Color.WHITE)

    val paint = Paint().apply {
        color       = android.graphics.Color.BLACK
        strokeWidth = 3f
        isAntiAlias = true
        style       = Paint.Style.STROKE
        strokeCap   = Paint.Cap.ROUND
        strokeJoin  = Paint.Join.ROUND
    }

    paths.forEach { path ->
        if (path.points.size > 1) {
            val androidPath = android.graphics.Path()
            androidPath.moveTo(path.points[0].x, path.points[0].y)
            path.points.drop(1).forEach { androidPath.lineTo(it.x, it.y) }
            canvas.drawPath(androidPath, paint)
        }
    }

    return bitmap
}