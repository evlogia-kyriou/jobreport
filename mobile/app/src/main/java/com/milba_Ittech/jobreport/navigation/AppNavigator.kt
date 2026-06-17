package com.milba_Ittech.jobreport.navigation

import androidx.compose.runtime.*

class AppNavigator {

    private val _currentScreen = mutableStateOf<Screen>(Screen.Login)
    val currentScreen: State<Screen> get() = _currentScreen

    // Use mutableStateListOf so Compose can track changes
    private val _backStack = mutableStateListOf<Screen>()

    // Compose-observable — updates BackHandler automatically
    val canGoBack: Boolean get() = _backStack.isNotEmpty()

    fun navigateTo(screen: Screen) {
        _backStack.add(_currentScreen.value)
        _currentScreen.value = screen
    }

    fun goBack(): Boolean {
        if (_backStack.isEmpty()) return false
        _currentScreen.value = _backStack.removeAt(_backStack.lastIndex)
        return true
    }

    fun navigateAndClear(screen: Screen) {
        _backStack.clear()
        _currentScreen.value = screen
    }
}

val LocalNavigator = compositionLocalOf<AppNavigator> {
    error("AppNavigator not provided")
}