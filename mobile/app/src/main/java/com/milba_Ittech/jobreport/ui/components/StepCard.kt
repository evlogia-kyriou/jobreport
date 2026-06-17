package com.milba_Ittech.jobreport.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.milba_Ittech.jobreport.domain.model.TicketStep
import com.milba_Ittech.jobreport.domain.model.StepType

// Updated StepCard:
// Removed isFlagged and flagNote — flags are now at TICKET level, not step level.
// Step-level abnormal condition uses is_condition_abnormal instead.

@Composable
fun StepCard(
    step:              TicketStep,
    onComplete:        (inputValue: String?, isChecked: Boolean, isAbnormal: Boolean) -> Unit,
    onPhotoCapture:    () -> Unit,
    modifier:          Modifier = Modifier
) {
    val stepType = step.stepTypeEnum

    Card(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {

            // Step description
            Text(
                text  = step.description,
                style = MaterialTheme.typography.bodyLarge
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Abnormal condition indicator (replaces old isFlagged)
            if (step.isConditionAbnormal) {
                Text(
                    text  = "⚠ Kondisi tidak normal",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error
                )
                Spacer(modifier = Modifier.height(4.dp))
            }

            // Input value display
            if (step.inputValue != null) {
                val unit = step.inputUnit?.let { " $it" } ?: ""
                Text(
                    text  = "Nilai: ${step.inputValue}$unit",
                    style = MaterialTheme.typography.bodySmall
                )
                Spacer(modifier = Modifier.height(4.dp))
            }

            // Photo indicator
            if (step.photoUrl != null) {
                Text(
                    text  = "📷 Foto tersimpan",
                    style = MaterialTheme.typography.bodySmall
                )
                Spacer(modifier = Modifier.height(4.dp))
            }

            // Completion status
            if (step.isCompleted) {
                Text(
                    text  = "✓ Selesai",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.primary
                )
            } else {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    // Photo button if needed
                    if (stepType.requiresPhoto || (stepType.photoIfAbnormal && step.isConditionAbnormal)) {
                        OutlinedButton(onClick = onPhotoCapture) {
                            Text("Ambil Foto")
                        }
                    }

                    // Complete button
                    Button(onClick = {
                        onComplete(step.inputValue, step.isChecked, step.isConditionAbnormal)
                    }) {
                        Text("Selesai")
                    }
                }
            }
        }
    }
}