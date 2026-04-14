package com.equiplink.app.data.network

import retrofit2.Response
import retrofit2.http.GET
import okhttp3.ResponseBody

interface EquipLinkApiService {
    @GET("/")
    suspend fun getHomepage(): Response<ResponseBody>
}
