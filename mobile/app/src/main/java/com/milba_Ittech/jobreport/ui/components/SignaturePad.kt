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
import androidx.compose.ui.draw.clip              // ← ADD for clipping ✅
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
    modifier: Modifier = Modifier,
    onSigned: (Bitmap) -> Unit,
    onClear:  () -> Unit
) {
    val paths       = remember { mutableStateListOf<SignaturePath>() }
    val currentPath = remember { mutableStateListOf<Offset>() }
    var hasSigned   by remember { mutableStateOf(false) }

    var canvasWidth  by remember { mutableStateOf(0) }
    var canvasHeight by remember { mutableStateOf(0) }

    val shape = RoundedCornerShape(8.dp)

    Column(modifier = modifier) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)                                    // ← fill available height ✅
                .clip(shape)                                   // ← clip draws to bounds ✅
                .background(White, shape)
                .border(1.dp, NeutralBorder, shape)
        ) {
            Canvas(
                modifier = Modifier
                    .fillMaxSize()
                    .pointerInput(Unit) {
                        canvasWidth  = size.width
                        canvasHeight = size.height
                        detectDragGestures(
                            onDragStart = { offset ->
                                // Only accept if within canvas bounds ✅
                                if (offset.x in 0f..canvasWidth.toFloat() &&
                                    offset.y in 0f..canvasHeight.toFloat()) {
                                    currentPath.clear()
                                    currentPath.add(offset)
                                    hasSigned = true
                                }
                            },
                            onDrag = { change, _ ->
                                val pos = change.position
                                // Clamp to canvas bounds so strokes stay inside ✅
                                val clamped = Offset(
                                    pos.x.coerceIn(0f, canvasWidth.toFloat()),
                                    pos.y.coerceIn(0f, canvasHeight.toFloat())
                                )
                                currentPath.add(clamped)
                            },
                            onDragEnd = {
                                if (currentPath.isNotEmpty()) {
                                    paths.add(SignaturePath(currentPath.toList()))
                                    currentPath.clear()
                                    val bitmap = captureToBitmap(
                                        paths.toList(), canvasWidth, canvasHeight
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
                        val p = Path()
                        p.moveTo(path.points[0].x, path.points[0].y)
                        path.points.drop(1).forEach { p.lineTo(it.x, it.y) }
                        drawPath(p, Color(0xFF1E293B),
                            style = Stroke(width = 3f, cap = StrokeCap.Round,
                                join = StrokeJoin.Round))
                    }
                }
                // Draw current path
                if (currentPath.size > 1) {
                    val p = Path()
                    p.moveTo(currentPath[0].x, currentPath[0].y)
                    currentPath.drop(1).forEach { p.lineTo(it.x, it.y) }
                    drawPath(p, Color(0xFF1E293B),
                        style = Stroke(width = 3f, cap = StrokeCap.Round,
                            join = StrokeJoin.Round))
                }
            }

            // Placeholder
            if (!hasSigned) {
                Text(
                    text     = "Tanda tangan di sini",
                    color    = NeutralMid,
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
                Text("Hapus", color = NeutralMid)
            }
        }
    }
}

private fun captureToBitmap(
    paths:  List<SignaturePath>,
    width:  Int,
    height: Int
): Bitmap {
    val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
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
            val p = android.graphics.Path()
            p.moveTo(path.points[0].x, path.points[0].y)
            path.points.drop(1).forEach { p.lineTo(it.x, it.y) }
            canvas.drawPath(p, paint)
        }
    }
    return bitmap
}