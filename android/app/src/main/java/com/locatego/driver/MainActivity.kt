package com.locatego.driver

import android.Manifest
import android.annotation.SuppressLint
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.net.Uri
import android.net.http.SslError
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.util.Log
import android.view.KeyEvent
import android.view.View
import android.webkit.*
import android.widget.FrameLayout
import android.widget.ProgressBar
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * MainActivity - Single App Architecture
 * دمج لوحة التحكم بالكامل داخل تطبيق الأندرويد كشاشة أساسية متكاملة (Web/React Integrated UI).
 * يتم تحميل لوحة التحكم من سيرفر Render أو محلياً، مع ربطها بجسر برمجي (JavascriptInterface)
 * للتحكم الفوري في إعدادات الأداة، تفعيل/إيقاف التتبع، فحص الطلبات، وإدارة صلاحيات النظام.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private lateinit var bridge: LocateGoNativeBridge
    private lateinit var renderClient: RenderApiClient

    private val requestLocationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val fineGranted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] ?: false
        val coarseGranted = permissions[Manifest.permission.ACCESS_COARSE_LOCATION] ?: false

        if (fineGranted || coarseGranted) {
            Toast.makeText(this, "تم منح إذن الموقع الجغرافي بنجاح", Toast.LENGTH_SHORT).show()
            // منع تشغيل الخدمة إطلاقاً إلا إذا كان الترخيص مفعلاً وصحيحاً
            if (isVipLicensed()) {
                startLocationService()
                requestBackgroundLocationIfNeeded()
            }
        } else {
            Toast.makeText(this, "يجب منح إذن الموقع لتصفية الطلبات في نطاق 2 كم", Toast.LENGTH_LONG).show()
        }
        syncStateToWeb()
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        renderClient = RenderApiClient(this)
        bridge = LocateGoNativeBridge(this)

        setupSingleAppUi()

        // 🛡️ شرط صارم في البداية: فحص حالة الترخيص المخزنة (is_vip_licensed)
        // فإذا لم تكن مفعلة وصحيحة، يمنع منعاً باتاً تشغيل أي خدمة خلفية وتظهر شاشة القفل وحدها
        if (!isVipLicensed()) {
            Log.i("MainActivity", "🚨 بداية التشغيل: كود VIP غير مفعل. يتم فوراً قتل كافة الخدمات الخلفية ومنع أي إشعارات.")
            killAllBackgroundServicesAndNotifications()
        }

        // فحص وطلب الأذونات فقط بدون تشغيل أي خدمات خلفية إذا لم يكن مرخصاً
        checkAndRequestPermissions()

        // معالجة زر الرجوع في الأندرويد لتصفح الـ WebView بسلاسة
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    // تصغير التطبيق وإبقاؤه يعمل في الخلفية بدلاً من قفله
                    moveTaskToBack(true)
                }
            }
        })
    }

    override fun onResume() {
        super.onResume()
        syncStateToWeb()
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_VOLUME_DOWN) {
            // "لفتح نافذة مساعد لوكيت، افتح تطبيق لوكيت واضغط ضغطة واحدة على زر خفض الصوت."
            webView.evaluateJavascript("window.onVolumeDownShortcut && window.onVolumeDownShortcut();", null)
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupSingleAppUi() {
        val rootLayout = FrameLayout(this).apply {
            setBackgroundColor(ContextCompat.getColor(context, R.color.background_dark))
        }

        webView = WebView(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(ContextCompat.getColor(context, R.color.background_dark))
        }

        progressBar = ProgressBar(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                FrameLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                gravity = android.view.Gravity.CENTER
            }
            visibility = View.VISIBLE
        }

        rootLayout.addView(webView)
        rootLayout.addView(progressBar)
        setContentView(rootLayout)

        // إعدادات الـ WebView المتقدمة لتشغيل واجهة React الحديثة بكامل قدراتها
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            allowFileAccessFromFileURLs = true
            allowUniversalAccessFromFileURLs = true
            useWideViewPort = true
            loadWithOverviewMode = true
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
            cacheMode = WebSettings.LOAD_DEFAULT
            mediaPlaybackRequiresUserGesture = false
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            userAgentString = "${userAgentString} LocateGoDriverApp/1.0.0"
        }

        // ربط الجسر البرمجي بين Kotlin والـ Web
        webView.addJavascriptInterface(bridge, "LocateGoNative")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: ""
                if (url.startsWith("vip://unlock")) {
                    runOnUiThread {
                        getSharedPreferences("locate_go_prefs", Context.MODE_PRIVATE)
                            .edit()
                            .putBoolean("is_vip_licensed", true)
                            .apply()

                        Toast.makeText(this@MainActivity, "👑 تم قبول كود VIP وفتح التطبيق بنجاح!", Toast.LENGTH_SHORT).show()
                        view?.evaluateJavascript("if (window.onVipUnlocked) window.onVipUnlocked();", null)

                        // تفعيل الخدمات الخلفية الآن فقط وفقط بعد نجاح عملية التحقق وإدخال كود ساري
                        if (hasLocationPermissions()) {
                            startLocationService()
                        }
                        syncStateToWeb()
                    }
                    return true
                }
                if (url.startsWith("vip://lock")) {
                    // إيقاف وقتل كافة الخدمات وإزالة الإشعارات فور القفل
                    runOnUiThread {
                        killAllBackgroundServicesAndNotifications()
                        view?.evaluateJavascript("if (window.onVipRelock) window.onVipRelock();", null)
                    }
                    return true
                }
                if (url.startsWith("https://t.me/") || url.startsWith("tg://")) {
                    try {
                        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                        return true
                    } catch (e: Exception) {
                        try {
                            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                            return true
                        } catch (_: Exception) {}
                    }
                }
                if (url.startsWith("whatsapp://") ||
                    url.startsWith("https://wa.me/") ||
                    url.startsWith("https://api.whatsapp.com/")) {
                    try {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK
                        }
                        startActivity(intent)
                        return true
                    } catch (e: Exception) {
                        try {
                            val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                                flags = Intent.FLAG_ACTIVITY_NEW_TASK
                            }
                            startActivity(browserIntent)
                            return true
                        } catch (_: Exception) {
                            runOnUiThread {
                                Toast.makeText(this@MainActivity, "يرجى تثبيت تطبيق واتساب", Toast.LENGTH_SHORT).show()
                            }
                            return true
                        }
                    }
                }
                return super.shouldOverrideUrlLoading(view, request)
            }

            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                progressBar.visibility = View.VISIBLE
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                progressBar.visibility = View.GONE
                syncStateToWeb()
            }

            @SuppressLint("WebViewClientOnReceivedSslError")
            override fun onReceivedSslError(view: WebView?, handler: SslErrorHandler?, error: SslError?) {
                handler?.proceed() // تجاوز تحذيرات SSL للاتصال الداخلي الآمن
            }

            override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                super.onReceivedError(view, request, error)
                if (request?.isForMainFrame == true) {
                    progressBar.visibility = View.GONE
                    Log.w("MainActivity", "Remote server unreachable, loading embedded offline web assets: ${error?.description}")
                    try {
                        view?.loadUrl("file:///android_asset/web/index.html")
                    } catch (e: Exception) {
                        Log.e("MainActivity", "Failed to load offline assets: ${e.message}")
                    }
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onGeolocationPermissionsShowPrompt(
                origin: String?,
                callback: GeolocationPermissions.Callback?
            ) {
                // منح إذن الموقع تلقائياً لواجهة الويب داخل التطبيق
                callback?.invoke(origin, true, false)
            }
        }

        // فحص وجود الملفات المدمجة محلياً في التطبيق أولاً للعمل بدون استضافة إطلاقاً (100% Offline Standalone)
        val hasLocalAssets = try {
            val list = assets.list("web")
            list != null && list.contains("index.html")
        } catch (e: Exception) {
            false
        }

        val preferOffline = getSharedPreferences("locate_go_prefs", Context.MODE_PRIVATE)
            .getBoolean("prefer_offline_assets", hasLocalAssets)

        if (preferOffline && hasLocalAssets) {
            Log.i("MainActivity", "⚡ Loading local embedded assets directly (100% Standalone Offline - No hosting needed)")
            webView.loadUrl("file:///android_asset/web/index.html")
        } else {
            val dashboardUrl = renderClient.baseUrl
            webView.loadUrl(dashboardUrl)
        }
    }

    /**
     * إرسال حالة النظام والموقع الجغرافي الحي مباشرة إلى واجهة React داخل الـ WebView
     */
    fun syncStateToWeb() {
        lifecycleScope.launch {
            delay(300)
            val isLicensed = isVipLicensed()
            val isRunning = LocationTrackingService.isServiceRunning && isLicensed
            val isOverlay = FloatingOverlayService.isOverlayShowing && isLicensed
            val isAccessibility = isAccessibilityServiceEnabled()
            val lat = LocationTrackingService.currentLatitude ?: 0.0
            val lng = LocationTrackingService.currentLongitude ?: 0.0

            val jsCode = """
                if (window.onLocateGoNativeSync) {
                    window.onLocateGoNativeSync({
                        isNativeApp: true,
                        isVipLicensed: $isLicensed,
                        isTrackingRunning: $isRunning,
                        isOverlayShowing: $isOverlay,
                        isAccessibilityEnabled: $isAccessibility,
                        lat: $lat,
                        lng: $lng
                    });
                }
            """.trimIndent()
            webView.evaluateJavascript(jsCode, null)
        }
    }

    /**
     * فحص هل خدمة إمكانية الوصول (Accessibility Service) مفعلة على مستوى نظام أندرويد
     */
    fun isAccessibilityServiceEnabled(): Boolean {
        try {
            val enabledServices = Settings.Secure.getString(
                contentResolver,
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            ) ?: return false
            val serviceName = LocateGoAccessibilityService::class.java.simpleName
            return enabledServices.contains(packageName) && enabledServices.contains(serviceName)
        } catch (e: Exception) {
            return false
        }
    }

    fun isVipLicensed(): Boolean {
        return getSharedPreferences("locate_go_prefs", Context.MODE_PRIVATE)
            .getBoolean("is_vip_licensed", false)
    }

    fun hasLocationPermissions(): Boolean {
        val fine = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val coarse = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        return fine || coarse
    }

    fun startLocationService() {
        // فحص صارم: يمنع منعاً باتاً تشغيل الخدمة إذا لم يكن كود VIP سارياً ومفعلاً
        if (!isVipLicensed()) {
            Log.w("MainActivity", "🚨 تم حظر تشغيل خدمة الموقع: التطبيق غير مرخص بكود VIP.")
            return
        }

        val intent = Intent(this, LocationTrackingService::class.java).apply {
            action = LocationTrackingService.ACTION_START
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
    }

    fun stopLocationService() {
        try {
            val intent = Intent(this, LocationTrackingService::class.java).apply {
                action = LocationTrackingService.ACTION_STOP
            }
            startService(intent)
        } catch (e: Exception) {}

        try {
            stopService(Intent(this, LocationTrackingService::class.java))
        } catch (e: Exception) {}

        try {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            notificationManager?.cancel(LocationTrackingService.NOTIFICATION_ID)
            notificationManager?.cancelAll()
        } catch (e: Exception) {}
    }

    /**
     * قتل وإيقاف كافة الخدمات الخلفية (Foreground / Overlay) وإزالة أي إشعارات فوراً
     */
    fun killAllBackgroundServicesAndNotifications() {
        // 1. إيقاف خدمة التتبع الجغرافي وإلغاء إشعار الـ Foreground Service
        stopLocationService()

        // 2. إيقاف خدمة النافذة العائمة
        try {
            stopService(Intent(this, FloatingOverlayService::class.java))
        } catch (e: Exception) {}

        // 3. مسح كافة الإشعارات المرتبطة بالأداة فوراً من شريط الإشعارات
        try {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            notificationManager?.cancel(LocationTrackingService.NOTIFICATION_ID)
            notificationManager?.cancelAll()
        } catch (e: Exception) {}

        // 4. تعطيل حالة الترخيص والقبول التلقائي محلياً لضمان عدم عودة الخدمة في الخلفية
        try {
            getSharedPreferences("locate_go_prefs", Context.MODE_PRIVATE)
                .edit()
                .putBoolean("is_vip_licensed", false)
                .putBoolean("auto_accept", false)
                .apply()
        } catch (e: Exception) {}

        // 5. مزامنة الحالة اللحظية للواجهة
        syncStateToWeb()
    }

    fun requestIgnoreBatteryOptimizations() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
            if (!pm.isIgnoringBatteryOptimizations(packageName)) {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:$packageName")
                }
                startActivity(intent)
            } else {
                Toast.makeText(this, "التطبيق مستثنى بالفعل من توفير الطاقة!", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun checkAndRequestPermissions() {
        val permissions = mutableListOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        }

        val missing = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (missing.isNotEmpty()) {
            requestLocationPermissionLauncher.launch(missing.toTypedArray())
        } else {
            // لا يتم تشغيل الخدمة تلقائياً عند فتح التطبيق إلا إذا كان الترخيص مفعلاً وصحيحاً
            if (isVipLicensed()) {
                startLocationService()
            }
        }
    }

    private fun requestBackgroundLocationIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            if (ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.ACCESS_BACKGROUND_LOCATION
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                requestPermissions(
                    arrayOf(Manifest.permission.ACCESS_BACKGROUND_LOCATION),
                    1002
                )
            }
        }
    }
}
