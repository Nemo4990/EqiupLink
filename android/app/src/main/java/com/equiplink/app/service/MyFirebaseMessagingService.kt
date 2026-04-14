package com.equiplink.app.service

import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class MyFirebaseMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "FCM token refreshed: $token")
        // TODO: Send token to backend/Supabase profile table for user-specific notifications.
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)

        val messageSource = message.from.orEmpty()
        val title = message.notification?.title ?: message.data["title"].orEmpty()
        val body = message.notification?.body ?: message.data["body"].orEmpty()

        if (messageSource.contains("/topics/")) {
            Log.d(TAG, "Topic notification (all users/groups): $title - $body")
        } else {
            Log.d(TAG, "Direct notification (specific user): $title - $body")
        }

        Log.d(TAG, "Payload data: ${message.data}")
    }

    companion object {
        private const val TAG = "EquipLinkFCM"
    }
}
