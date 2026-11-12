package com.locatego.driver

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.webkit.JavascriptInterface
import android.widget.Toast
import org.json.JSONObject

/**
 * LocateGoNativeBridge
 * جسر التواصل البرمجي التفاعلي ثنائي الاتجاه بين واجهة React/Web وميزات نظام أندرويد الأصيلة.
 * يمكن السائق من التحكم الكامل في إعدادات التطبيق، فحص الصلاحيات، تشغيل وإيقاف الخدمات،
 * واسترجاع الإعدادات وموقع الـ GPS وحالة الخدمة مباشرة من داخل واجهة الويب.
 */
class LocateGoNativeBridge(private val activity: MainActivity) {

    private val prefs = activity.getSharedPreferences("locate_go_prefs", Context.MODE_PRIVATE)

    /**
     * استرجاع الإعدادات الحالية من الذاكرة المحلية لأندرويد إلى واجهة الويب
     */
    @JavascriptInterface
    fun getSettingsJson(): String {
        val json = JSONObject().apply {
            put("maxDistanceKm", prefs.getFloat("max_distance_km", 3.0f).toDouble())
            put("maxPickupDistanceKm", prefs.getFloat("max_pickup_distance_km", 1.5f).toDouble())
            put("autoAccept", prefs.getBoolean("auto_accept", true))
            put("soundAlerts", prefs.getBoolean("sound_alerts", false))
            put("minPayoutSar", prefs.getFloat("min_payout_sar", 0.0f).toDouble())
            put("vibrationFeedback", prefs.getBoolean("vibration_feedback", false))
            put("swipeSpeedMs", prefs.getInt("swipe_speed_ms", 100))
            put("tapIntervalMs", prefs.getInt("tap_interval_ms", 10))
            put("enableCustomInterval", prefs.getBoolean("enable_custom_interval", false))
            put("renderUrl", prefs.getString("render_url", "https://fast-34v4.onrender.com"))
        }
        return json.toString()
    }

    /**
     * حفظ تحديثات الإعدادات في SharedPreferences الخاصة بأندرويد فوراً
     */
    @JavascriptInterface
    fun saveSettings(settingsJsonStr: String): Boolean {
        return try {
            val json = JSONObject(settingsJsonStr)
            val editor = prefs.edit()
            if (json.has("maxDistanceKm")) {
                editor.putFloat("max_distance_km", json.getDouble("maxDistanceKm").toFloat())
            }
            if (json.has("maxPickupDistanceKm")) {
                editor.putFloat("max_pickup_distance_km", json.getDouble("maxPickupDistanceKm").toFloat())
            }
            if (json.has("autoAccept")) {
                editor.putBoolean("auto_accept", json.getBoolean("autoAccept"))
            }
            if (json.has("soundAlerts")) {
                editor.putBoolean("sound_alerts", json.getBoolean("soundAlerts"))
            }
            if (json.has("minPayoutSar")) {
                editor.putFloat("min_payout_sar", json.getDouble("minPayoutSar").toFloat())
            }
            if (json.has("vibrationFeedback")) {
                editor.putBoolean("vibration_feedback", json.getBoolean("vibrationFeedback"))
            }
            if (json.has("swipeSpeedMs")) {
                editor.putInt("swipe_speed_ms", json.getInt("swipeSpeedMs"))
            }
            if (json.has("tapIntervalMs")) {
                editor.putInt("tap_interval_ms", json.getInt("tapIntervalMs"))
            }
            if (json.has("enableCustomInterval")) {
                editor.putBoolean("enable_custom_interval", json.getBoolean("enableCustomInterval"))
            }
            if (json.has("renderUrl")) {
                val cleanUrl = json.getString("renderUrl").trim()
                editor.putString("render_url", cleanUrl)
            }
            editor.apply()
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    /**
     * التحقق مما إذا كان التطبيق مرخصاً بكود VIP ساري
     */
    @JavascriptInterface
    fun isVipLicensed(): Boolean {
        return prefs.getBoolean("is_vip_licensed", false)
    }

    /**
     * تحديث حالة الترخيص يدوياً من واجهة الويب
     */
    @JavascriptInterface
    fun setVipLicensed(licensed: Boolean): Boolean {
        prefs.edit().putBoolean("is_vip_licensed", licensed).apply()
        if (!licensed) {
            activity.runOnUiThread {
                activity.killAllBackgroundServicesAndNotifications()
            }
        }
        return true
    }

    /**
     * تشغيل أو إيقاف خدمة التتبع الجغرافي والاعتراض
     */
    @JavascriptInterface
    fun setTrackingActive(active: Boolean) {
        activity.runOnUiThread {
            val isLicensed = prefs.getBoolean("is_vip_licensed", false)
            if (active) {
                if (!isLicensed) {
                    Toast.makeText(activity, "⚠️ الأداة مقفلة: يرجى تفعيل كود VIP ساري لتشغيل الخدمات", Toast.LENGTH_SHORT).show()
                    activity.killAllBackgroundServicesAndNotifications()
                    return@runOnUiThread
                }
                activity.startLocationService()
                Toast.makeText(activity, "⚡ تم تفعيل أداة التتبع والمراقبة بنجاح", Toast.LENGTH_SHORT).show()
            } else {
                activity.killAllBackgroundServicesAndNotifications()
                Toast.makeText(activity, "🛑 تم إيقاف وقتل كافة الخدمات وإزالة الإشعارات", Toast.LENGTH_SHORT).show()
            }
            activity.syncStateToWeb()
        }
    }

    /**
     * إنهاء وقتل كافة الخدمات الخلفية (Foreground Services / Notification) فوراً
     */
    @JavascriptInterface
    fun killAllServices(): Boolean {
        activity.runOnUiThread {
            activity.killAllBackgroundServicesAndNotifications()
            Toast.makeText(activity, "🛑 تم إنهاء وقتل كافة الخدمات وإزالة الإشعارات فوراً", Toast.LENGTH_SHORT).show()
        }
        return true
    }

    @JavascriptInterface
    fun stopAllServices(): Boolean {
        return killAllServices()
    }

    /**
     * حالة الخدمات والصلاحيات بالأندرويد
     */
    @JavascriptInterface
    fun isAccessibilityEnabled(): Boolean {
        return activity.isAccessibilityServiceEnabled()
    }

    /**
     * حالة الخدمات والصلاحيات بالأندرويد
     */
    @JavascriptInterface
    fun getAndroidStatusJson(): String {
        val hasOverlay = Settings.canDrawOverlays(activity)
        val isLicensed = isVipLicensed()
        val isTrackingRunning = LocationTrackingService.isServiceRunning && isLicensed
        val isOverlayShowing = FloatingOverlayService.isOverlayShowing && isLicensed
        val isAccessibility = activity.isAccessibilityServiceEnabled()
        val lat = LocationTrackingService.currentLatitude
        val lng = LocationTrackingService.currentLongitude

        val json = JSONObject().apply {
            put("isVipLicensed", isLicensed)
            put("isTrackingRunning", isTrackingRunning)
            put("hasOverlayPermission", hasOverlay)
            put("isOverlayShowing", isOverlayShowing)
            put("isAccessibilityEnabled", isAccessibility)
            put("currentLatitude", lat ?: JSONObject.NULL)
            put("currentLongitude", lng ?: JSONObject.NULL)
            put("isNativeApp", true)
            put("androidVersion", Build.VERSION.RELEASE)
        }
        return json.toString()
    }

    /**
     * فتح إعدادات إمكانية الوصول في الهاتف لتفعيل Accessibility Service
     */
    @JavascriptInterface
    fun openAccessibilitySettings() {
        activity.runOnUiThread {
            try {
                val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                activity.startActivity(intent)
                Toast.makeText(activity, "يرجى تفعيل Locate Go في قائمة الخدمات المثبتة", Toast.LENGTH_LONG).show()
            } catch (e: Exception) {
                Toast.makeText(activity, "تعذر فتح إعدادات إمكانية الوصول: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    /**
     * تشغيل أو إيقاف النافذة العائمة فوق التطبيقات
     */
    @JavascriptInterface
    fun toggleFloatingOverlay() {
        activity.runOnUiThread {
            if (!isVipLicensed()) {
                Toast.makeText(activity, "⚠️ الأداة مقفلة: يرجى تفعيل كود VIP ساري أولاً", Toast.LENGTH_SHORT).show()
                return@runOnUiThread
            }
            if (Settings.canDrawOverlays(activity)) {
                if (FloatingOverlayService.isOverlayShowing) {
                    val intent = Intent(activity, FloatingOverlayService::class.java)
                    activity.stopService(intent)
                    Toast.makeText(activity, "تم إغلاق النافذة العائمة", Toast.LENGTH_SHORT).show()
                } else {
                    val intent = Intent(activity, FloatingOverlayService::class.java)
                    activity.startService(intent)
                    Toast.makeText(activity, "تم تفعيل النافذة العائمة بنجاح", Toast.LENGTH_SHORT).show()
                }
                activity.syncStateToWeb()
            } else {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:${activity.packageName}")
                ).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                activity.startActivity(intent)
                Toast.makeText(activity, "يرجى منح إذن الظهور فوق التطبيقات", Toast.LENGTH_LONG).show()
            }
        }
    }

    /**
     * طلب استثناء توفير الطاقة لضمان بقاء الأداة تعمل بالخلفية
     */
    @JavascriptInterface
    fun requestBatteryOptimization() {
        activity.runOnUiThread {
            activity.requestIgnoreBatteryOptimizations()
        }
    }

    /**
     * إظهار رسالة Toast سريعة في الهاتف
     */
    @JavascriptInterface
    fun showToast(message: String) {
        activity.runOnUiThread {
            Toast.makeText(activity, message, Toast.LENGTH_SHORT).show()
        }
    }

    /**
     * استرجاع معرف الجهاز الفريد لعزل بيانات المندوب
     */
    @JavascriptInterface
    fun getDeviceId(): String {
        return RenderApiClient(activity).deviceId
    }

    /**
     * تعيين أو تخصيص معرف الجهاز يدوياً
     */
    @JavascriptInterface
    fun setDeviceId(newId: String): Boolean {
        if (newId.isNotBlank()) {
            val cleaned = newId.trim().uppercase()
            prefs.edit().putString("device_id", cleaned).apply()
            return true
        }
        return false
    }

    /**
     * استعلام حالة الحماية ومكافحة الهندسة العكسية وProGuard/R8
     */
    @JavascriptInterface
    fun getSecurityStatusJson(): String {
        val isDebugger = AppSecurity.isDebuggerActive(activity)
        val isRooted = AppSecurity.isDeviceRooted()
        val isHooked = AppSecurity.isHookingDetected()
        val isPackageValid = AppSecurity.verifyPackageIntegrity(activity)

        val json = org.json.JSONObject().apply {
            put("r8ObfuscationEnabled", true)
            put("optimizationPasses", 5)
            put("stringObfuscationActive", true)
            put("hmacApiSigningActive", true)
            put("antiDebuggingActive", true)
            put("antiRootActive", true)
            put("antiHookingActive", true)
            put("isDebuggerDetected", isDebugger)
            put("isDeviceRooted", isRooted)
            put("isHookingDetected", isHooked)
            put("isPackageValid", isPackageValid)
            put("securityLevel", "MAXIMUM_R8_PROGUARD_SHIELD")
            put("tamperAlert", isDebugger || isRooted || isHooked || !isPackageValid)
        }
        return json.toString()
    }

    /**
     * فتح محادثة واتساب بشكل مباشر وآمن عبر Intent أندرويد لتفادي خطأ net::ERR_UNKNOWN_URL_SCHEME
     */
    @JavascriptInterface
    fun openWhatsApp(phone: String, message: String): Boolean {
        return try {
            val cleanPhone = phone.replace("+", "").replace(" ", "").trim()
            val encodedMsg = Uri.encode(message)
            val uri = Uri.parse("whatsapp://send?phone=$cleanPhone&text=$encodedMsg")
            val intent = Intent(Intent.ACTION_VIEW, uri).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            activity.startActivity(intent)
            true
        } catch (e: Exception) {
            try {
                val cleanPhone = phone.replace("+", "").replace(" ", "").trim()
                val webUri = Uri.parse("https://wa.me/$cleanPhone?text=${Uri.encode(message)}")
                val intent = Intent(Intent.ACTION_VIEW, webUri).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                activity.startActivity(intent)
                true
            } catch (err: Exception) {
                activity.runOnUiThread {
                    Toast.makeText(activity, "يرجى التأكد من تثبيت تطبيق واتساب", Toast.LENGTH_SHORT).show()
                }
                false
            }
        }
    }

    /**
     * فتح أي رابط خارجي (تليجرام أو غيره) عبر Intent أندرويد خارجي
     */
    @JavascriptInterface
    fun openUrl(url: String): Boolean {
        return try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            activity.startActivity(intent)
            true
        } catch (e: Exception) {
            false
        }
    }
}
