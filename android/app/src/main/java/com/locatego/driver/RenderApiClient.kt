package com.locatego.driver

import android.content.Context
import android.provider.Settings
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.ConnectionPool
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.UUID
import java.util.concurrent.TimeUnit

/**
 * RenderApiClient
 * عميل شبكي متصل بخادم Render بدون أي وسيط وسيط مع دعم Connection Keep-Alive وعزل بيانات الجهاز
 */
class RenderApiClient(private val context: Context) {

    private val prefs = context.getSharedPreferences("locate_go_prefs", Context.MODE_PRIVATE)

    /**
     * معرف الجهاز الفريد (Device ID) لعزل بيانات وسجلات ومراقبة المندوب في قاعدة البيانات
     */
    val deviceId: String
        get() {
            var id = prefs.getString("device_id", null)
            if (id.isNullOrBlank()) {
                val androidId = try {
                    Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
                } catch (e: Exception) {
                    null
                }
                id = if (!androidId.isNullOrBlank()) {
                    "REP-" + androidId.takeLast(6).uppercase()
                } else {
                    "REP-" + UUID.randomUUID().toString().take(6).uppercase()
                }
                prefs.edit().putString("device_id", id).apply()
            }
            return id
        }

    var baseUrl: String
        get() = prefs.getString("render_url", "https://fast-34v4.onrender.com") ?: "https://fast-34v4.onrender.com"
        set(value) {
            // إزالة أي مسافات أو أحرف اتجاه خفية (RTL/LTR marks) قد تدرجها لوحة المفاتيح العربية
            var clean = value.trim()
                .replace(Regex("[\\u200B-\\u200F\\uFEFF\\u00A0\\u202A-\\u202E\\s]"), "")
                .removeSuffix("/")

            // إزالة أي مسارات فرعية ألصقها المستخدم مثل /api/health أو /api
            val suffixesToRemove = listOf(
                "/api/health", "/api/ping", "/api/status", "/api",
                "/health", "/ping", "/status"
            )
            for (suffix in suffixesToRemove) {
                if (clean.endsWith(suffix, ignoreCase = true)) {
                    clean = clean.substring(0, clean.length - suffix.length).removeSuffix("/")
                }
            }

            if (!clean.startsWith("http://") && !clean.startsWith("https://") && clean.isNotEmpty()) {
                clean = "https://$clean"
            }
            prefs.edit().putString("render_url", clean).apply()
        }

    private val httpClient = OkHttpClient.Builder()
        .connectionPool(ConnectionPool(8, 5, TimeUnit.MINUTES))
        .connectTimeout(2, TimeUnit.SECONDS)
        .readTimeout(2, TimeUnit.SECONDS)
        .writeTimeout(2, TimeUnit.SECONDS)
        .retryOnConnectionFailure(false)
        .build()

    data class EvaluationResponse(
        val isAccepted: Boolean,
        val decision: String,
        val computedDistanceKm: Double,
        val maxAllowedKm: Double,
        val rejectionReason: String? = null
    )

    /**
     * فحص الاتصال بالخادم والتحقق من حالته وسرعة الاستجابة بدعم المسارات البديلة
     */
    suspend fun pingServer(): Result<String> = withContext(Dispatchers.IO) {
        val rootUrl = baseUrl.trim().removeSuffix("/")
        val candidateEndpoints = listOf("/api/health", "/health", "/api/ping", "/ping")
        var lastException: Exception? = null

        val timestamp = System.currentTimeMillis()
        val nonce = AppSecurity.generateNonce()
        val signature = AppSecurity.generateApiSignature(deviceId, timestamp, nonce, "")

        for (endpoint in candidateEndpoints) {
            try {
                val request = Request.Builder()
                    .url("$rootUrl$endpoint")
                    .get()
                    .header("Connection", "Keep-Alive")
                    .header("Accept", "application/json")
                    .header("User-Agent", "LocateGo-Android/1.0 (Secured)")
                    .header("X-Device-Id", deviceId)
                    .header("X-Timestamp", timestamp.toString())
                    .header("X-Nonce", nonce)
                    .header("X-Signature", signature)
                    .header("X-Client-Shield", "R8-OBFUSCATED-V1")
                    .build()

                val start = System.currentTimeMillis()
                httpClient.newCall(request).execute().use { response ->
                    val elapsed = System.currentTimeMillis() - start
                    val body = response.body?.string() ?: ""
                    if (response.isSuccessful) {
                        return@withContext Result.success("تم بنجاح (${elapsed}ms)")
                    } else if (response.code != 404) {
                        return@withContext Result.failure(Exception("كود السيرفر: HTTP ${response.code}"))
                    }
                }
            } catch (e: Exception) {
                lastException = e
            }
        }

        val msg = when (lastException) {
            is java.net.SocketTimeoutException -> "انتهت مهلة الاتصال (Timeout)"
            is java.net.UnknownHostException -> "تعذر الوصول للرابط (DNS غير موجود)"
            else -> lastException?.localizedMessage ?: "خطأ في الشبكة"
        }
        Result.failure(Exception(msg))
    }

    /**
     * إرسال طلب جديد لتقييم المسافة وسعر التوصيل لحظياً
     */
    suspend fun evaluateOrder(
        appName: String,
        storeName: String,
        distanceKm: Double,
        payoutSar: Double,
        orderId: String? = null,
        customerDistrict: String? = null,
        driverLat: Double? = null,
        driverLng: Double? = null,
        pickupDistanceKm: Double? = null,
        deliveryDistanceKm: Double? = null
    ): Result<EvaluationResponse> = withContext(Dispatchers.IO) {
        try {
            val url = baseUrl.trim().removeSuffix("/")
            val json = JSONObject().apply {
                put("deviceId", deviceId)
                put("appName", appName)
                put("storeName", storeName)
                put("distanceKm", distanceKm)
                put("payoutSar", payoutSar)
                if (pickupDistanceKm != null) {
                    put("pickupDistanceKm", pickupDistanceKm)
                }
                if (deliveryDistanceKm != null) {
                    put("deliveryDistanceKm", deliveryDistanceKm)
                }
                if (!orderId.isNullOrBlank()) {
                    put("orderId", orderId)
                }
                if (!customerDistrict.isNullOrBlank()) {
                    put("customerDistrict", customerDistrict)
                }
                if (driverLat != null && driverLng != null) {
                    put("driverCoordinates", JSONObject().apply {
                        put("lat", driverLat)
                        put("lng", driverLng)
                    })
                }
            }

            val bodyString = json.toString()
            val timestamp = System.currentTimeMillis()
            val nonce = AppSecurity.generateNonce()
            val signature = AppSecurity.generateApiSignature(deviceId, timestamp, nonce, bodyString)

            val body = bodyString.toRequestBody("application/json; charset=utf-8".toMediaType())
            val request = Request.Builder()
                .url("$url/api/orders/evaluate")
                .post(body)
                .header("Connection", "Keep-Alive")
                .header("User-Agent", "LocateGo-Android/1.0 (Secured)")
                .header("X-Device-Id", deviceId)
                .header("X-Timestamp", timestamp.toString())
                .header("X-Nonce", nonce)
                .header("X-Signature", signature)
                .header("X-Client-Shield", "R8-OBFUSCATED-V1")
                .build()

            httpClient.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    return@withContext Result.failure(Exception("HTTP ${response.code}"))
                }

                val bodyStr = response.body?.string() ?: "{}"
                val resObj = JSONObject(bodyStr)
                val decision = resObj.optString("decision", "rejected")
                val eval = resObj.optJSONObject("evaluation")

                Result.success(
                    EvaluationResponse(
                        isAccepted = decision.equals("accepted", ignoreCase = true),
                        decision = decision,
                        computedDistanceKm = eval?.optDouble("computedDistanceKm", distanceKm) ?: distanceKm,
                        maxAllowedKm = eval?.optDouble("maxAllowedKm", 2.0) ?: 2.0,
                        rejectionReason = eval?.optString("rejectionReason", null)
                    )
                )
            }
        } catch (e: Exception) {
            Log.w("RenderApiClient", "Server offline or timeout, executing local on-device evaluation: ${e.message}")
            val maxDelivery = prefs.getFloat("max_distance_km", 3.0f).toDouble()
            val maxPickup = prefs.getFloat("max_pickup_distance_km", 1.5f).toDouble()
            val targetDist = deliveryDistanceKm ?: distanceKm
            val isDeliveryOk = targetDist <= maxDelivery
            val isPickupOk = pickupDistanceKm == null || pickupDistanceKm <= maxPickup
            val accepted = isDeliveryOk && isPickupOk
            val decision = if (accepted) "accepted" else "rejected"
            val reason = if (!accepted) {
                if (!isDeliveryOk) "مسافة العميل ($targetDist كم) تتجاوز الحد الأقصى ($maxDelivery كم)"
                else "مسافة المتجر ($pickupDistanceKm كم) تتجاوز الحد الأقصى ($maxPickup كم)"
            } else null

            Result.success(
                EvaluationResponse(
                    isAccepted = accepted,
                    decision = decision,
                    computedDistanceKm = targetDist,
                    maxAllowedKm = maxDelivery,
                    rejectionReason = reason
                )
            )
        }
    }

    /**
     * تحديث إحداثيات موقع المندوب الحالية في الخادم
     */
    suspend fun updateDriverLocation(lat: Double, lng: Double): Boolean = withContext(Dispatchers.IO) {
        try {
            val url = baseUrl.trim().removeSuffix("/")
            val json = JSONObject().apply {
                put("deviceId", deviceId)
                put("lat", lat)
                put("lng", lng)
            }
            val bodyString = json.toString()
            val timestamp = System.currentTimeMillis()
            val nonce = AppSecurity.generateNonce()
            val signature = AppSecurity.generateApiSignature(deviceId, timestamp, nonce, bodyString)

            val body = bodyString.toRequestBody("application/json; charset=utf-8".toMediaType())
            val request = Request.Builder()
                .url("$url/api/location")
                .post(body)
                .header("Connection", "Keep-Alive")
                .header("User-Agent", "LocateGo-Android/1.0 (Secured)")
                .header("X-Device-Id", deviceId)
                .header("X-Timestamp", timestamp.toString())
                .header("X-Nonce", nonce)
                .header("X-Signature", signature)
                .header("X-Client-Shield", "R8-OBFUSCATED-V1")
                .build()

            httpClient.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    Log.w("RenderApiClient", "Update location returned HTTP ${response.code}")
                }
                response.isSuccessful
            }
        } catch (e: Exception) {
            Log.e("RenderApiClient", "Failed to update driver location: ${e.message}")
            false
        }
    }
}
