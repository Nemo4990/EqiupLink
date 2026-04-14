package com.equiplink.app.viewmodel

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel

class AuthViewModel : ViewModel() {
    private val _authState = MutableLiveData<String>()
    val authState: LiveData<String> = _authState
    private val _isAuthenticated = MutableLiveData(false)
    val isAuthenticated: LiveData<Boolean> = _isAuthenticated

    fun loginWithSupabase(email: String, password: String) {
        if (email.isBlank() || password.isBlank()) {
            _authState.value = "Please enter email and password"
            _isAuthenticated.value = false
            return
        }

        // TODO: Initialize Supabase client using BuildConfig.SUPABASE_URL and BuildConfig.SUPABASE_ANON_KEY.
        // TODO: Call GoTrue sign-in once keys are provided.
        _authState.value = "Supabase login placeholder for $email"
        _isAuthenticated.value = true
    }
}
