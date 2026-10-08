package com.milba_Ittech.jobreport

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.milba_Ittech.jobreport.data.AppState
import com.milba_Ittech.jobreport.data.PreferencesManager
import com.milba_Ittech.jobreport.data.repository.AuthRepository
import com.milba_Ittech.jobreport.data.repository.TicketRepository
import com.milba_Ittech.jobreport.domain.model.AcUnitWithDisplay
import com.milba_Ittech.jobreport.domain.model.Technician
import com.milba_Ittech.jobreport.domain.model.TicketStep
import com.milba_Ittech.jobreport.navigation.AppNavigator
import com.milba_Ittech.jobreport.navigation.LocalNavigator
import com.milba_Ittech.jobreport.navigation.Screen
import com.milba_Ittech.jobreport.ui.components.AppTopBar
import com.milba_Ittech.jobreport.ui.components.OliveTitleBlock
import com.milba_Ittech.jobreport.ui.components.ReAuthOverlay
import com.milba_Ittech.jobreport.ui.screens.acunit.AcUnitScreen
import com.milba_Ittech.jobreport.ui.screens.jobstart.JobStartScreen   // ← NEW ✅
import com.milba_Ittech.jobreport.ui.screens.login.LoginScreen
import com.milba_Ittech.jobreport.ui.screens.login.LoginViewModel
import com.milba_Ittech.jobreport.ui.screens.reauth.ReAuthScreen
import com.milba_Ittech.jobreport.ui.screens.reauth.ReAuthViewModel
import com.milba_Ittech.jobreport.ui.screens.signature.SignatureScreen
import com.milba_Ittech.jobreport.ui.screens.signature.SignatureViewModel
import com.milba_Ittech.jobreport.ui.screens.sop.SectionDoneScreen
import com.milba_Ittech.jobreport.ui.screens.sop.SectionIntroScreen
import com.milba_Ittech.jobreport.ui.screens.sop.SOP_SECTIONS
import com.milba_Ittech.jobreport.ui.screens.sop.SopOverviewScreen
import com.milba_Ittech.jobreport.ui.screens.step.StepScreen
import com.milba_Ittech.jobreport.ui.screens.summary.StepListScreen
import com.milba_Ittech.jobreport.ui.screens.summary.TicketSummaryScreen
import com.milba_Ittech.jobreport.ui.screens.ticketdetail.TicketDetailScreen
import com.milba_Ittech.jobreport.ui.screens.ticketdetail.TicketDetailViewModel
import com.milba_Ittech.jobreport.ui.screens.ticketlist.TicketListScreen
import com.milba_Ittech.jobreport.ui.screens.ticketlist.TicketListViewModel
import com.milba_Ittech.jobreport.ui.theme.*
import com.milba_Ittech.jobreport.util.IdleTimeoutManager
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            TicketReportTheme {
                TicketReportNavigation(context = this@MainActivity)
            }
        }
    }
}

@Composable
fun TicketReportNavigation(context: android.content.Context) {
    val navigator         = remember { AppNavigator() }
    val currentScreen     by navigator.currentScreen
    var currentTechnician by remember { mutableStateOf<Technician?>(null) }
    val authRepo          = remember { AuthRepository() }
    val ticketRepo        = remember { TicketRepository() }
    val prefs             = remember { PreferencesManager(context) }
    val coroutineScope    = rememberCoroutineScope()
    var loginKey          by remember { mutableStateOf(0) }

    val idleManager = remember { IdleTimeoutManager() }
    val isLocked    by idleManager.isLocked
    val reAuthVm    = viewModel { ReAuthViewModel(authRepo) }
    val reAuthState by reAuthVm.state.collectAsState()

    var cachedSteps     by remember { mutableStateOf<List<TicketStep>>(emptyList()) }
    var cachedUnitLabel by remember { mutableStateOf("Unit AC") }

    // ── Session restore ───────────────────────────────────────────────────────
    LaunchedEffect(Unit) {
        try {
            val existing = authRepo.restoreSession()
            if (existing != null) {
                currentTechnician = existing
                idleManager.onUserInteraction(coroutineScope)
                navigator.navigateAndClear(Screen.TicketList)
            }
        } catch (e: Exception) {
            android.util.Log.e("AUTH", "Session restore error: ${e.message}")
        }
    }

    LaunchedEffect(isLocked, currentTechnician) {
        if (isLocked && currentTechnician != null) {
            val screen = navigator.currentScreen.value
            if (screen !is Screen.Login && screen !is Screen.ReAuth) {
                navigator.navigateTo(Screen.ReAuth)
            }
        }
    }

    BackHandler(enabled = navigator.canGoBack) {
        navigator.goBack()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .pointerInput(currentTechnician) {
                detectTapGestures {
                    if (currentTechnician != null && !isLocked)
                        idleManager.onUserInteraction(coroutineScope)
                }
            }
    ) {
        CompositionLocalProvider(LocalNavigator provides navigator) {
            when (val screen = currentScreen) {

                // ── Login ─────────────────────────────────────────────────────
                is Screen.Login -> {
                    val vm = viewModel { LoginViewModel(authRepo, prefs) }
                    LaunchedEffect(loginKey) {
                        vm.reset()
                        vm.loginSuccess.collect { technician ->
                            currentTechnician = technician
                            idleManager.onUserInteraction(coroutineScope)
                            navigator.navigateAndClear(Screen.TicketList)
                        }
                    }
                    LoginScreen(
                        viewModel = vm,
                        onLogin   = { technician ->
                            currentTechnician = technician
                            idleManager.onUserInteraction(coroutineScope)
                            navigator.navigateAndClear(Screen.TicketList)
                        }
                    )
                }

                // ── ReAuth ────────────────────────────────────────────────────
                is Screen.ReAuth -> {
                    val technician = currentTechnician ?: run {
                        navigator.navigateAndClear(Screen.Login)
                        return@CompositionLocalProvider
                    }
                    val vm = viewModel { ReAuthViewModel(authRepo) }
                    val state by vm.state.collectAsState()
                    LaunchedEffect(Unit) {
                        vm.authSuccess.collect {
                            idleManager.unlock()
                            idleManager.onUserInteraction(coroutineScope)
                            vm.reset()
                            navigator.goBack()
                        }
                    }
                    LaunchedEffect(state.isLockedOut) {
                        if (state.isLockedOut) {
                            coroutineScope.launch { authRepo.logout() }
                            idleManager.reset()
                            currentTechnician = null
                            navigator.navigateAndClear(Screen.Login)
                        }
                    }
                    ReAuthScreen(
                        technicianName = technician.name,
                        isLoading      = state.isLoading,
                        error          = state.error,
                        attempts       = state.failedAttempts,
                        onPinEntry     = { pin -> vm.verifyPin(technician.technicianId, pin) },
                        onLogout       = {
                            coroutineScope.launch { authRepo.logout() }
                            idleManager.reset()
                            currentTechnician = null
                            loginKey++
                            navigator.navigateAndClear(Screen.Login)
                        }
                    )
                }

                // ── TicketList ────────────────────────────────────────────────
                is Screen.TicketList -> {
                    val technician = currentTechnician ?: run {
                        navigator.navigateAndClear(Screen.Login)
                        return@CompositionLocalProvider
                    }
                    val vm = viewModel { TicketListViewModel(ticketRepo) }
                    TicketListScreen(
                        viewModel  = vm,
                        technician = technician,
                        onTicketClick = { ticketId, ticketNumber, ticketType, scheduledTime, locationName ->
                            if (AppState.isTicketSubmitted(ticketId)) {
                                // Submitted/approved → summary view ✅
                                navigator.navigateTo(Screen.TicketSummary(ticketId))
                            } else {
                                // assigned/in_progress → JobStartScreen ✅
                                navigator.navigateTo(
                                    Screen.JobStart(
                                        ticketId      = ticketId,
                                        ticketNumber  = ticketNumber,
                                        ticketType    = ticketType,
                                        scheduledDate = "",        // loaded by JobStartScreen ✅
                                        scheduledTime = scheduledTime,
                                        locationName  = locationName
                                    )
                                )
                            }
                        },
                        onHistoryTicketClick = { ticketId ->
                            navigator.navigateTo(Screen.TicketSummary(ticketId))
                        },
                        onLogout = {
                            coroutineScope.launch { authRepo.logout() }
                            idleManager.reset()
                            currentTechnician = null
                            loginKey++
                            navigator.navigateAndClear(Screen.Login)
                        }
                    )
                }

                // ── JobStartScreen ────────────────────────────────────────────
                // NEW: shown between TicketList and TicketDetail ✅
                // Technician reviews job → taps "Mulai" or "Lanjutkan" ✅
                is Screen.JobStart -> {
                    val technician = currentTechnician ?: run {
                        navigator.navigateAndClear(Screen.Login)
                        return@CompositionLocalProvider
                    }
                    JobStartScreen(
                        ticketId     = screen.ticketId,
                        ticketNumber = screen.ticketNumber,
                        locationName = screen.locationName,
                        technicianId = technician.id,
                        onStart      = {
                            // Navigate to TicketDetail after Mulai/Lanjutkan ✅
                            navigator.navigateTo(
                                Screen.TicketDetail(
                                    ticketId      = screen.ticketId,
                                    ticketNumber  = screen.ticketNumber,
                                    ticketType    = screen.ticketType,
                                    scheduledTime = screen.scheduledTime,
                                    locationName  = screen.locationName
                                )
                            )
                        },
                        onBack = { navigator.goBack() }
                    )
                }

                // ── TicketDetail ──────────────────────────────────────────────
                is Screen.TicketDetail -> {
                    val technician = currentTechnician ?: return@CompositionLocalProvider
                    val vm = viewModel { TicketDetailViewModel(ticketRepo) }
                    TicketDetailScreen(
                        viewModel       = vm,
                        ticketId        = screen.ticketId,
                        ticketNumber    = screen.ticketNumber,
                        ticketType      = screen.ticketType,
                        scheduledTime   = screen.scheduledTime,
                        locationName    = screen.locationName,
                        technician      = technician,
                        onAcUnitClick   = { acUnitId ->
                            navigator.navigateTo(Screen.AcUnit(screen.ticketId, acUnitId))
                        },
                        onProceedToSign = {
                            navigator.navigateTo(Screen.Signature(screen.ticketId))
                        },
                        onBack          = { navigator.goBack() }
                    )
                }

                // ── AcUnit ────────────────────────────────────────────────────
                is Screen.AcUnit -> {
                    var acUnit by remember { mutableStateOf<AcUnitWithDisplay?>(null) }

                    LaunchedEffect(screen.AcUnitId) {
                        try {
                            val units = ticketRepo.getTicketAcUnits(screen.ticketId)
                            val found = units.find { it.AcUnit.id == screen.AcUnitId }
                            acUnit          = found?.AcUnit
                            cachedUnitLabel = found?.AcUnit?.displayName ?: "Unit AC"
                            cachedSteps     = ticketRepo.getStepsByAcUnit(screen.ticketId, screen.AcUnitId)
                        } catch (e: Exception) {
                            navigator.goBack()
                        }
                    }

                    acUnit?.let { unit ->
                        AcUnitScreen(
                            acUnitId          = screen.AcUnitId,
                            ticketId          = screen.ticketId,
                            acUnit            = unit,
                            onStepClick       = { /* unused — SOP flow via onStartSop */ },
                            onAcUnitCompleted = { navigator.goBack() },
                            onBack            = { navigator.goBack() },
                            onStartSop        = {
                                navigator.navigateTo(
                                    Screen.SopOverview(
                                        ticketId = screen.ticketId,
                                        acUnitId = screen.AcUnitId
                                    )
                                )
                            }
                        )
                    } ?: Box(Modifier.fillMaxSize(), Alignment.Center) {
                        CircularProgressIndicator(color = BrandPrimary)
                    }
                }

                // ── SopOverview ───────────────────────────────────────────────
                is Screen.SopOverview -> {
                    LaunchedEffect(screen.acUnitId) {
                        if (cachedSteps.isEmpty()) {
                            try {
                                cachedSteps = ticketRepo.getStepsByAcUnit(
                                    screen.ticketId, screen.acUnitId)
                            } catch (e: Exception) {
                                android.util.Log.e("SopOverview", "Load failed: ${e.message}")
                            }
                        }
                    }
                    SopOverviewScreen(
                        ticketId  = screen.ticketId,
                        acUnitId  = screen.acUnitId,
                        unitLabel = cachedUnitLabel,
                        onStart   = { sectionIndex ->
                            navigator.navigateTo(
                                Screen.SectionIntro(
                                    ticketId     = screen.ticketId,
                                    acUnitId     = screen.acUnitId,
                                    sectionIndex = sectionIndex
                                )
                            )
                        },
                        onBack = { navigator.goBack() }
                    )
                }

                // ── SectionIntro ──────────────────────────────────────────────
                is Screen.SectionIntro -> {
                    LaunchedEffect(screen.acUnitId) {
                        if (cachedSteps.isEmpty()) {
                            try {
                                cachedSteps = ticketRepo.getStepsByAcUnit(
                                    screen.ticketId, screen.acUnitId)
                            } catch (e: Exception) {
                                android.util.Log.e("SectionIntro", "Load failed: ${e.message}")
                            }
                        }
                    }
                    val sectionKey   = SOP_SECTIONS[screen.sectionIndex].key
                    val sectionSteps = cachedSteps
                        .filter { it.section == sectionKey }
                        .sortedBy { it.orderNumber }

                    SectionIntroScreen(
                        sectionIndex = screen.sectionIndex,
                        stepList     = sectionSteps,
                        onStart      = {
                            if (sectionSteps.isNotEmpty()) {
                                navigator.navigateTo(
                                    Screen.Step(
                                        ticketId       = screen.ticketId,
                                        AcUnitId       = screen.acUnitId,
                                        stepId         = sectionSteps.first().id,
                                        sectionKey     = sectionKey,
                                        stepIndex      = 0,
                                        sectionStepIds = sectionSteps.map { it.id },
                                        sectionIndex   = screen.sectionIndex
                                    )
                                )
                            }
                        },
                        onBack = { navigator.goBack() }
                    )
                }

                // ── Step ──────────────────────────────────────────────────────
                is Screen.Step -> {
                    val step            = cachedSteps.find { it.id == screen.stepId }
                    val isLastInSection = screen.stepIndex == screen.sectionStepIds.size - 1

                    step?.let { currentStep ->
                        StepScreen(
                            step            = currentStep,
                            acUnitId        = screen.AcUnitId,
                            technicianId    = currentTechnician?.id ?: "",
                            isLastInSection = isLastInSection,
                            sectionName     = SOP_SECTIONS[screen.sectionIndex].name,
                            stepIndex       = screen.stepIndex,
                            totalInSection  = screen.sectionStepIds.size,
                            sectionIndex    = screen.sectionIndex,
                            onCompleted     = { _ ->
                                coroutineScope.launch {
                                    try {
                                        cachedSteps = ticketRepo.getStepsByAcUnit(
                                            screen.ticketId, screen.AcUnitId)
                                    } catch (e: Exception) {
                                        android.util.Log.e("Step", "Reload failed: ${e.message}")
                                    }
                                }
                                if (isLastInSection) {
                                    navigator.navigateTo(
                                        Screen.SectionDone(
                                            ticketId     = screen.ticketId,
                                            acUnitId     = screen.AcUnitId,
                                            sectionIndex = screen.sectionIndex,
                                            stepSummary  = screen.sectionStepIds
                                        )
                                    )
                                } else {
                                    val nextStepId = screen.sectionStepIds[screen.stepIndex + 1]
                                    navigator.navigateTo(
                                        Screen.Step(
                                            ticketId       = screen.ticketId,
                                            AcUnitId       = screen.AcUnitId,
                                            stepId         = nextStepId,
                                            sectionKey     = screen.sectionKey,
                                            stepIndex      = screen.stepIndex + 1,
                                            sectionStepIds = screen.sectionStepIds,
                                            sectionIndex   = screen.sectionIndex
                                        )
                                    )
                                }
                            },
                            onBack = {
                                if (screen.stepIndex == 0) {
                                    navigator.navigateTo(
                                        Screen.SectionIntro(
                                            ticketId     = screen.ticketId,
                                            acUnitId     = screen.AcUnitId,
                                            sectionIndex = screen.sectionIndex
                                        )
                                    )
                                } else {
                                    val prevStepId = screen.sectionStepIds[screen.stepIndex - 1]
                                    navigator.navigateTo(
                                        Screen.Step(
                                            ticketId       = screen.ticketId,
                                            AcUnitId       = screen.AcUnitId,
                                            stepId         = prevStepId,
                                            sectionKey     = screen.sectionKey,
                                            stepIndex      = screen.stepIndex - 1,
                                            sectionStepIds = screen.sectionStepIds,
                                            sectionIndex   = screen.sectionIndex
                                        )
                                    )
                                }
                            }
                        )
                    }
                }

                // ── SectionDone ───────────────────────────────────────────────
                is Screen.SectionDone -> {
                    val sectionKey     = SOP_SECTIONS[screen.sectionIndex].key
                    val completedSteps = cachedSteps
                        .filter { it.section == sectionKey && it.isCompleted }
                        .sortedBy { it.orderNumber }
                    val isLast = screen.sectionIndex == SOP_SECTIONS.size - 1

                    SectionDoneScreen(
                        sectionIndex   = screen.sectionIndex,
                        completedSteps = completedSteps,
                        isLastSection  = isLast,
                        onNext         = {
                            navigator.navigateTo(
                                Screen.SectionIntro(
                                    ticketId     = screen.ticketId,
                                    acUnitId     = screen.acUnitId,
                                    sectionIndex = screen.sectionIndex + 1
                                )
                            )
                        },
                        onOverview = {
                            navigator.navigateTo(
                                Screen.SopOverview(
                                    ticketId = screen.ticketId,
                                    acUnitId = screen.acUnitId
                                )
                            )
                        }
                    )
                }

                // ── Signature ─────────────────────────────────────────────────
                is Screen.Signature -> {
                    val technician = currentTechnician ?: return@CompositionLocalProvider
                    val vm = viewModel { SignatureViewModel(ticketRepo) }
                    SignatureScreen(
                        viewModel       = vm,
                        ticketId        = screen.ticketId,
                        technician      = technician,
                        locationAddress = "",
                        AcUnitCount     = AppState.completedAcUnits.size,
                        onSubmitted     = {
                            AppState.submitTicket(screen.ticketId)
                            coroutineScope.launch {
                                val ticket = ticketRepo.getTicketById(screen.ticketId)
                                navigator.navigateAndClear(
                                    Screen.SubmitConfirmation(ticket?.projectTicketId ?: "")
                                )
                            }
                        },
                        onBack = { navigator.goBack() }
                    )
                }

                // ── SubmitConfirmation ─────────────────────────────────────────
                is Screen.SubmitConfirmation -> {
                    SubmitConfirmationScreen(
                        onBackToList = { navigator.navigateAndClear(Screen.TicketList) }
                    )
                }

                // ── TicketSummary ─────────────────────────────────────────────
                is Screen.TicketSummary -> {
                    TicketSummaryScreen(
                        ticketId   = screen.ticketId,
                        onBack     = { navigator.goBack() },
                        onStepList = { ticketId, acUnitId, unitLabel, ticketNumber, indoorUrl, outdoorUrl ->
                            navigator.navigateTo(
                                Screen.StepList(
                                    ticketId        = ticketId,
                                    acUnitId        = acUnitId,
                                    unitLabel       = unitLabel,
                                    ticketNumber    = ticketNumber,
                                    photoIndoorUrl  = indoorUrl,
                                    photoOutdoorUrl = outdoorUrl
                                )
                            )
                        }
                    )
                }

                // ── StepList ──────────────────────────────────────────────────
                is Screen.StepList -> {
                    StepListScreen(
                        ticketId        = screen.ticketId,
                        acUnitId        = screen.acUnitId,
                        unitLabel       = screen.unitLabel,
                        ticketNumber    = screen.ticketNumber,
                        photoIndoorUrl  = screen.photoIndoorUrl,
                        photoOutdoorUrl = screen.photoOutdoorUrl,
                        onBack          = { navigator.goBack() }
                    )
                }

                else -> {}
            }
        }
    }
}

// ── Submit confirmation screen ────────────────────────────────────────────────

@Composable
fun SubmitConfirmationScreen(onBackToList: () -> Unit) {
    Box(
        modifier         = Modifier
            .fillMaxSize()
            .background(NeutralLight)
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Icon(Icons.Default.CheckCircle, null,
                tint = BrandSecondary, modifier = Modifier.size(80.dp))
            Text("Laporan Berhasil Dikirim",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold, color = NeutralDark)
            Text("Laporan telah dikirim dan menunggu persetujuan.",
                style = MaterialTheme.typography.bodySmall,
                color = NeutralMid, textAlign = TextAlign.Center)
            Spacer(Modifier.height(8.dp))
            Button(
                onClick  = onBackToList,
                modifier = Modifier.fillMaxWidth().height(52.dp)
            ) {
                Text("Kembali ke Daftar Pekerjaan")
            }
        }
    }
}