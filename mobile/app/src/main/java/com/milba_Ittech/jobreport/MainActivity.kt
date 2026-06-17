package com.milba_Ittech.jobreport

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.gestures.detectTapGestures
import com.milba_Ittech.jobreport.ui.components.ReAuthOverlay
import com.milba_Ittech.jobreport.ui.screens.reauth.ReAuthViewModel
import com.milba_Ittech.jobreport.ui.screens.reauth.ReAuthScreen
import com.milba_Ittech.jobreport.util.IdleTimeoutManager
import com.milba_Ittech.jobreport.data.PreferencesManager
import com.milba_Ittech.jobreport.data.repository.AuthRepository
import com.milba_Ittech.jobreport.navigation.AppNavigator
import com.milba_Ittech.jobreport.navigation.LocalNavigator
import com.milba_Ittech.jobreport.navigation.Screen
import com.milba_Ittech.jobreport.ui.screens.ticketdetail.TicketDetailScreen
import com.milba_Ittech.jobreport.ui.screens.acunit.AcUnitScreen
import com.milba_Ittech.jobreport.data.AppState
import com.milba_Ittech.jobreport.ui.screens.step.StepScreen
import com.milba_Ittech.jobreport.ui.screens.summary.TicketSummaryScreen
import com.milba_Ittech.jobreport.domain.model.Technician
import com.milba_Ittech.jobreport.domain.model.AcUnitWithDisplay
import com.milba_Ittech.jobreport.data.repository.TicketRepository
import com.milba_Ittech

.jobreport.ui.screens.ticketdetail.TicketDetailViewModel
import com.milba_Ittech

.jobreport.ui.screens.ticketlist.TicketListScreen
import com.milba_Ittech

.jobreport.ui.screens.ticketlist.TicketListViewModel
import com.milba_Ittech

.jobreport.ui.screens.login.LoginScreen
import com.milba_Ittech

.jobreport.ui.screens.login.LoginViewModel
import com.milba_Ittech

.jobreport.ui.screens.signature.SignatureScreen
import com.milba_Ittech

.jobreport.ui.screens.signature.SignatureViewModel
import com.milba_Ittech

.jobreport.ui.theme.BrandSecondary
import com.milba_Ittech

.jobreport.ui.theme.TicketReportTheme
import com.milba_Ittech

.jobreport.ui.theme.NeutralDark
import com.milba_Ittech

.jobreport.ui.theme.NeutralLight
import com.milba_Ittech

.jobreport.ui.theme.NeutralMid
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
    val navigator     = remember { AppNavigator() }
    val currentScreen by navigator.currentScreen
    var currentTechnician by remember { mutableStateOf<Technician?>(null) }
    val authRepo = remember { AuthRepository() }
    val ticketRepo  = remember { TicketRepository() }
    val prefs    = remember { PreferencesManager(context) }
    val coroutineScope = rememberCoroutineScope()
    var loginKey by remember { mutableStateOf(0) }

    // ── Idle timeout ──────────────────────────────────────────────────────────
    val idleManager  = remember { IdleTimeoutManager() }
    val isLocked     by idleManager.isLocked
    val reAuthVm     = viewModel { ReAuthViewModel(authRepo) }
    val reAuthState  by reAuthVm.state.collectAsState()

    // Check for existing session on startup
    LaunchedEffect(Unit) {
        try {
            val existingTechnician = authRepo.restoreSession()

            if (existingTechnician != null) {
                currentTechnician = existingTechnician
                idleManager.onUserInteraction(coroutineScope)
                navigator.navigateAndClear(Screen.TicketList)
            }
        } catch (e: Exception) {
            android.util.Log.e("AUTH", "Session restore error: ${e.message}")
            // Stay on login screen
        }
    }

    // ── Session restore ───────────────────────────────────────────────────────
    LaunchedEffect(isLocked, currentTechnician) {
        if (isLocked && currentTechnician != null) {  // ← add this check
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
            // Reset idle timer on any touch
            .pointerInput(currentTechnician) {
                detectTapGestures {
                    if (currentTechnician != null && !isLocked) {
                        idleManager.onUserInteraction(coroutineScope)
                    }
                }
            }

    ){
        CompositionLocalProvider(LocalNavigator provides navigator) {
            when (val screen = currentScreen) {

                is Screen.Login -> {
                    val vm = viewModel { LoginViewModel(authRepo, prefs) }

                    LaunchedEffect(loginKey) {          // ← inside Screen.Login case
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

                is Screen.ReAuth -> {
                    val technician = currentTechnician ?: run {
                        navigator.navigateAndClear(Screen.Login)
                        return@CompositionLocalProvider
                    }

                    val vm = viewModel { ReAuthViewModel(authRepo) }
                    val reAuthState by vm.state.collectAsState()

                    // Listen for success
                    LaunchedEffect(Unit) {
                        vm.authSuccess.collect {
                            idleManager.unlock()
                            idleManager.onUserInteraction(coroutineScope)
                            vm.reset()
                            navigator.goBack()  // ← return to exact screen
                        }
                    }

                    // Force logout if locked out
                    LaunchedEffect(reAuthState.isLockedOut) {
                        if (reAuthState.isLockedOut) {
                            coroutineScope.launch { authRepo.logout() }
                            idleManager.reset()
                            currentTechnician = null
                            navigator.navigateAndClear(Screen.Login)
                        }
                    }

                    ReAuthScreen(
                        technicianName = technician.name,
                        isLoading  = reAuthState.isLoading,
                        error      = reAuthState.error,
                        attempts   = reAuthState.failedAttempts,
                        onPinEntry = { pin ->
                            vm.verifyPin(technician.technicianId, pin)
                        },
                        onLogout   = {
                            coroutineScope.launch { authRepo.logout() }
                            idleManager.reset()
                            currentTechnician = null
                            loginKey++
                            navigator.navigateAndClear(Screen.Login)
                        }
                    )
                }


                is Screen.TicketList -> {
                    val technician = currentTechnician ?: run {
                        navigator.navigateAndClear(Screen.Login)
                        return@CompositionLocalProvider
                    }
                    val vm = viewModel { TicketListViewModel(ticketRepo) }
                    TicketListScreen(
                        viewModel  = vm,
                        technician     = technician,
                        onTicketClick = { ticketId ->
                            if (AppState.isTicketSubmitted(ticketId)) {
                                navigator.navigateTo(Screen.TicketSummary(ticketId))
                            } else {
                                navigator.navigateTo(Screen.TicketDetail(ticketId))
                            }
                        },
                        onLogout   = {
                            coroutineScope.launch {
                                authRepo.logout()           // ← clears Supabase session
                            }
                            idleManager.reset()
                            currentTechnician = null
                            loginKey++
                            navigator.navigateAndClear(Screen.Login)
                        }
                    )
                }

                is Screen.TicketDetail -> {
                    val technician = currentTechnician ?: return@CompositionLocalProvider
                    val vm = viewModel { TicketDetailViewModel(ticketRepo) }
                    TicketDetailScreen(
                        viewModel       = vm,
                        ticketId           = screen.ticketId,
                        ticketTitle        = screen.ticketId,
                        technician          = technician,
                        onAcUnitClick   = { AcUnitId ->
                            navigator.navigateTo(Screen.AcUnit(screen.ticketId, AcUnitId))
                        },
                        onProceedToSign = {
                            navigator.navigateTo(Screen.Signature(screen.ticketId))
                        },
                        onBack          = { navigator.goBack() }
                    )
                }
                is Screen.AcUnit -> {
                    var AcUnit by remember { mutableStateOf<AcUnitWithDisplay?>(null) }

                    LaunchedEffect(screen.AcUnitId) {
                        try {
                            val units = ticketRepo.getTicketAcUnits(screen.ticketId)
                            AcUnit = units.find { it.AcUnit.id == screen.AcUnitId }?.AcUnit
                        } catch (e: Exception) {
                            navigator.goBack()
                        }
                    }
                    AcUnit?.let { unit ->
                        AcUnitScreen(
                            AcUnitId          = screen.AcUnitId,
                            ticketId          = screen.ticketId,
                            AcUnit            = unit,
                            onStepClick       = { step ->
                                navigator.navigateTo(
                                    Screen.Step(screen.ticketId, screen.AcUnitId, step.id)
                                )
                            },
                            onAcUnitCompleted = { navigator.goBack() },
                            onBack            = { navigator.goBack() }
                        )
                    } ?: Box(
                            modifier         = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            CircularProgressIndicator(
                                color = com.milba_Ittech.jobreport.ui.theme.BrandPrimary
                            )
                        }

                }

                /*is Screen.Signature -> {
                    val technician = currentTechnician ?: return@CompositionLocalProvider
                    val vm = viewModel { SignatureViewModel(ticketRepo) }
                    SignatureScreen(
                        viewModel   = vm,
                        ticketId       = screen.ticketId,
                        technician      = technician,
                        AcUnitCount = 1,
                        onSubmitted = {
                            navigator.navigateAndClear(Screen.SubmitConfirmation)
                        },
                        onBack      = { navigator.goBack() }
                    )
                }*/
                is Screen.Signature -> {
                    val technician  = currentTechnician ?: return@CompositionLocalProvider
                    val vm          = viewModel { SignatureViewModel(ticketRepo) }  // ← no ticketRepo

                    SignatureScreen(
                        viewModel       = vm,
                        ticketId        = screen.ticketId,
                        technician      = technician,
                        locationAddress = "",
                        AcUnitCount     = AppState.completedAcUnits.size,
                        onSubmitted     = {
                            AppState.submitTicket(screen.ticketId)
                            navigator.navigateAndClear(Screen.SubmitConfirmation)
                        },
                        onBack          = { navigator.goBack() }
                    )
                }

                is Screen.SubmitConfirmation -> {
                    SubmitConfirmationScreen(
                        onBackToList = {
                            navigator.navigateAndClear(Screen.TicketList)
                        }
                    )
                }

                is Screen.TicketSummary -> {
                    TicketSummaryScreen(
                        ticketId  = screen.ticketId,
                        ticketTitle = "Laporan Tiket",
                        onBack = { navigator.goBack() }
                    )
                }
                // ── Step screen (to be implemented next) ──────────────────────────
                is Screen.Step -> {
                    var step by remember {
                        mutableStateOf<com.milba_Ittech.jobreport.domain.model.TicketStep?>(null)
                    }

                    LaunchedEffect(screen.stepId) {
                        try {
                            // Fetch all steps for this AC unit and find the one we need
                            val steps = ticketRepo.getStepsByAcUnit(screen.ticketId, screen.AcUnitId)
                            step = steps.find { it.id == screen.stepId }
                        } catch (e: Exception) {
                            navigator.goBack()
                        }
                    }

                    step?.let { currentStep ->
                        StepScreen(
                            step        = currentStep,
                            onCompleted = { stepId ->
                                AppState.markStepComplete(stepId)
                                navigator.goBack()
                            },
                            onBack      = { navigator.goBack() }
                        )
                    } ?: run {
                        Box(
                            modifier         = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            CircularProgressIndicator(
                                color = com.milba_Ittech.jobreport.ui.theme.BrandPrimary
                            )
                        }
                    }
                }

                else -> {}
            }
        }

    }
}
// ── Placeholder step screen ───────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StepPlaceholderScreen(
    stepId: String,
    onBack: () -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Langkah") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            "Kembali"
                        )
                    }
                }
            )
        }
    ) { padding ->
        Box(
            modifier         = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(24.dp),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text        = "Step: $stepId",
                    style       = MaterialTheme.typography.bodySmall,
                    fontWeight  = FontWeight.Bold,
                    color       = NeutralMid,
                    textAlign     = TextAlign.Center
                )
                Button(onClick = onBack) {
                    Text("← Kembali")
                }
            }
        }
    }
}
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
            Icon(
                imageVector        = Icons.Default.CheckCircle,
                contentDescription = null,
                tint               = BrandSecondary,
                modifier           = Modifier.size(80.dp)
            )

            Text(
                text       = "Laporan Berhasil Dikirim",
                style      = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color      = NeutralDark
            )

            Text(
                text      = "Laporan telah dikirim dan menunggu persetujuan.",
                style     = MaterialTheme.typography.bodySmall,
                color     = NeutralMid,
                textAlign = TextAlign.Center
            )

            Spacer(Modifier.height(8.dp))

            Button(
                onClick  = onBackToList,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
            ) {
                Text("Kembali ke Daftar Pekerjaan")
            }
        }
    }
}