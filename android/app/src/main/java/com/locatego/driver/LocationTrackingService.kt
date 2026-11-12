package com.locatego.driver

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.*
import kotlinx.coroutines.*
import kotlin.math.*

/**
 * LocationTrackingService
 * خدمة خلفية دائمة (Foreground Service) تعمل بأولوية عالية لتتبع موقع المندوب الحي بدقة GPS عالية،
 * وحساب المسافة الجغرافية الفورية عبر معادلة Haversine للتأكد من أن المتجر يقع ضمن نطاق الـ 2 كم المطلوب.
 */
class LocationTrackingService : Service() {

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private lateinit var renderApiClient: RenderApiClient

    companion object {
        const val CHANNEL_ID = "locate_go_location_channel"
        const val NOTIFICATION_ID = 1001

        const val ACTION_START = "com.locatego.driver.ACTION_START"
        const val ACTION_STOP = "com.locatego.driver.ACTION_STOP"

        // آخر إحداثيات معروفة للمندوب
        @Volatile
        var currentLatitude: Double? = null
            private set

        @Volatile
        var currentLongitude: Double? = null
            private set

        @Volatile
        var isServiceRunning = false
            private set

        /**
         * معادلة Haversine لحساب المسافة الجغرافية بالكيلومتر بين نقطتين على الكرة الأرضية
         */
        fun calculateDistanceKm(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
            val r = 6371.0 // نصف قطر الأرض بالكيلومتر
            val dLat = Math.toRadians(lat2 - lat1)
            val dLon = Math.toRadians(lon2 - lon1)
            val a = sin(dLat / 2).pow(2) +
                    cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) *
                    sin(dLon / 2).pow(2)
            val c = 2 * atan2(sqrt(a), sqrt(1 - a))
            return round((r * c) * 100.0) / 100.0
        }

        /**
         * التحقق مما إذا كان المتجر ضمن نطاق 2 كم المحدد
         */
        fun isWithinCourierRadius(storeLat: Double, storeLng: Double, maxRadiusKm: Double = 2.0): Boolean {
            val driverLat = currentLatitude ?: return true // إذا لم يتوفر الموقع بعد، نعتمد مسافة النص
            val driverLng = currentLongitude ?: return true
            val dist = calculateDistanceKm(driverLat, driverLng, storeLat, storeLng)
            return dist <= maxRadiusKm
        }
    }

    override fun onCreate() {
        super.onCreate()
        val prefs = getSharedPreferences("locate_go_prefs", Context.MODE_PRIVATE)
        val isLicensed = prefs.getBoolean("is_vip_licensed", false)
        if (!isLicensed) {
            Log.w("LocationService", "🚨 محاولة إنشاء خدمة التتبع بدون ترخيص VIP! تم إيقاف الخدمة فوراً.")
            stopSelf()
            return
        }
        renderApiClient = RenderApiClient(this)
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        createNotificationChannel()

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                val location = result.lastLocation ?: return
                onNewLocation(location)
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                stopTracking()
                stopSelf()
                return START_NOT_STICKY
            }
            else -> {
                val prefs = getSharedPreferences("locate_go_prefs", Context.MODE_PRIVATE)
                val isLicensed = prefs.getBoolean("is_vip_licensed", false)
                if (!isLicensed) {
                    Log.w("LocationService", "🚨 منع تشغيل الخدمة: كود VIP غير مفعل. يتم إيقاف الخدمة فوراً.")
                    stopTracking()
                    stopSelf()
                    return START_NOT_STICKY
                }
                startForeground(NOTIFICATION_ID, buildForegroundNotification("جاري تتبع الموقع في نطاق 2 كم..."))
                startTracking()
                isServiceRunning = true
            }
        }
        return START_STICKY
    }

    @SuppressLint("MissingPermission")
    private fun startTracking() {
        if (!hasLocationPermission()) {
            Log.w("LocationService", "Location permissions missing.")
            return
        }

        val locationRequest = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 4000)
            .setMinUpdateIntervalMillis(2000)
            .setMinUpdateDistanceMeters(5.0f)
            .build()

        fusedLocationClient.requestLocationUpdates(
            locationRequest,
            locationCallback,
            Looper.getMainLooper()
        )

        Log.i("LocationService", "High-accuracy GPS Courier Tracking started.")
    }

    private fun onNewLocation(location: Location) {
        currentLatitude = location.latitude
        currentLongitude = location.longitude

        Log.d("LocationService", "GPS Update: (${location.latitude}, ${location.longitude}) Accuracy: ${location.accuracy}m")

        // تحديث شريط الإشعارات
        val notification = buildForegroundNotification("الموقع نشط • نطاق التصفية: 2.0 كم")
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(NOTIFICATION_ID, notification)

        // مزامنة الموقع مع خادم Render في الخلفية
        serviceScope.launch {
            renderApiClient.updateDriverLocation(location.latitude, location.longitude)
        }
    }

    private fun stopTracking() {
        try {
            fusedLocationClient.removeLocationUpdates(locationCallback)
        } catch (e: Exception) {}

        isServiceRunning = false
        currentLatitude = null
        currentLongitude = null

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                stopForeground(STOP_FOREGROUND_REMOVE)
            } else {
                @Suppress("DEPRECATION")
                stopForeground(true)
            }
        } catch (e: Exception) {}

        try {
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            manager?.cancel(NOTIFICATION_ID)
            manager?.cancelAll()
        } catch (e: Exception) {}

        Log.i("LocationService", "Location tracking stopped, foreground stopped, notifications removed.")
    }

    private fun hasLocationPermission(): Boolean {
        return ActivityCompat.checkSelfPermission(
            this,
            android.Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                getString(R.string.location_service_channel_name),
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = getString(R.string.location_service_channel_desc)
                setShowBadge(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildForegroundNotification(contentText: String): Notification {
        val openIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            openIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Locate Go • خدمة الكوريور النشطة")
            .setContentText(contentText)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    override fun onDestroy() {
        super.onDestroy()
        stopTracking()
        serviceScope.cancel()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
