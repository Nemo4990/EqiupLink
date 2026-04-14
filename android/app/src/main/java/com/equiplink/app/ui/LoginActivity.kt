package com.equiplink.app.ui

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import com.equiplink.app.R
import com.equiplink.app.viewmodel.AuthViewModel

class LoginActivity : AppCompatActivity() {
    private val authViewModel: AuthViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login)

        val emailInput = findViewById<EditText>(R.id.emailInput)
        val passwordInput = findViewById<EditText>(R.id.passwordInput)
        val loginButton = findViewById<Button>(R.id.loginButton)

        loginButton.setOnClickListener {
            authViewModel.loginWithSupabase(
                emailInput.text.toString().trim(),
                passwordInput.text.toString().trim(),
            )
        }

        authViewModel.authState.observe(this) { state ->
            Toast.makeText(this, state, Toast.LENGTH_SHORT).show()
        }

        authViewModel.isAuthenticated.observe(this) { isAuthenticated ->
            if (isAuthenticated) {
                startActivity(Intent(this, HomeActivity::class.java))
                finish()
            }
        }
    }
}
