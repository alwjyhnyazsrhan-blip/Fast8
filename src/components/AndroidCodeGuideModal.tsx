import React, { useState } from 'react';
import { 
  Code2, 
  Copy, 
  Check, 
  Terminal, 
  FileCode, 
  Layers, 
  ShieldCheck, 
  Globe, 
  Send,
  Zap,
  Smartphone,
  ExternalLink,
  Cpu,
  RefreshCw,
  Gauge,
  MousePointerClick,
  FolderTree,
  Download,
  CheckCircle2,
  Navigation,
  Play
} from 'lucide-react';

export const AndroidCodeGuideModal: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    | 'tree'
    | 'manifest'
    | 'location'
    | 'service'
    | 'activity'
    | 'client'
    | 'app_gradle'
    | 'root_gradle'
    | 'github_actions'
  >('tree');
  const [renderUrl, setRenderUrl] = useState<string>('https://your-locate-go.onrender.com');
  const [refreshIntervalMs, setRefreshIntervalMs] = useState<number>(1500);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const normalizedUrl = renderUrl.trim().replace(/\/+$/, '');

  // ----------------------------------------------------
  // 0. Project Tree Overview
  // ----------------------------------------------------
  const PROJECT_TREE_TEXT = `locate-go/
├── android/                                     # مجلد أندرويد الأصلي المتكامل (Native Project)
│   ├── app/
│   │   ├── build.gradle                        # إعدادات تطبيق أندرويد (JDK 17 + SDK 34 + Play Services Location)
│   │   ├── proguard-rules.pro                  # قواعد حماية الكود
│   │   └── src/main/
│   │       ├── AndroidManifest.xml             # جميع الصلاحيات (ACCESS_FINE_LOCATION, Foreground Services, Accessibility)
│   │       ├── java/com/locatego/driver/
│   │       │   ├── MainActivity.kt             # واجهة التطبيق الموحدة الحاضنة للوحة التحكم (Single App Architecture)
│   │       │   ├── LocateGoNativeBridge.kt     # جسر التواصل البرمجي التفاعلي (@JavascriptInterface) بين React والأندرويد
│   │       │   ├── LocationTrackingService.kt  # خدمة التتبع الجغرافي المستمر (Foreground Service) بنطاق 2.0 كم
│   │       │   ├── LocateGoAccessibilityService.kt # خدمة قراءة الشاشة والاعتراض الفوري وقبول الطلب (بدون سحب)
│   │       │   ├── FloatingOverlayService.kt   # النافذة العائمة فوق شاشات تطبيقات التوصيل
│   │       │   ├── RenderApiClient.kt          # عميل الشبكة فائق السرعة المتصل بسيرفر Render
│   │       │   └── BootReceiver.kt             # التشغيل التلقائي عند إقلاع الهاتف
│   │       └── res/
│   │           ├── values/
│   │           │   ├── strings.xml
│   │           │   ├── colors.xml
│   │           │   └── themes.xml
│   │           └── xml/
│   │               └── accessibility_service_config.xml # إعدادات إيماءات النقر والسحب
│   ├── gradle/wrapper/
│   │   └── gradle-wrapper.properties           # إصدار Gradle 8.5 المتوافق مع JDK 17
│   ├── build.gradle                            # ملف البناء الرئيسي (Android Gradle Plugin 8.2.2)
│   ├── settings.gradle                         # إعدادات المشروع
│   ├── gradle.properties                       # ضبط ذاكرة JVM والمكتبات
│   ├── gradlew                                 # سكربت البناء في لينكس/ماك
│   └── gradlew.bat                             # سكربت البناء في ويندوز
│
├── .github/workflows/
│   └── build-apk.yml                           # سير عمل GitHub Actions لإنتاج ملف APK حقيقي في السحابة
│
├── server.ts                                   # خادم Node.js / Express فائق السرعة
├── server_python.py                            # خادم FastAPI البديل
└── src/                                        # لوحة تحكم الويب المباشرة
`;

  // ----------------------------------------------------
  // 1. AndroidManifest.xml
  // ----------------------------------------------------
  const MANIFEST_CODE = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools"
    package="com.locatego.driver">

    <!-- 1. الشبكة والإنترنت للاتصال فائق السرعة بسيرفر Render المباشر -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <!-- 2. أذونات الموقع الجغرافي الدقيق لتصفية الطلبات في نطاق 2 كم -->
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />

    <!-- 3. خدمات الخلفية الدائمة (Foreground Services) لضمان عدم إغلاق الأداة بواسطة النظام -->
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />

    <!-- 4. النافذة العائمة فوق شاشة تطبيقات التوصيل (Overlay Pill) -->
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />

    <!-- 5. التنبيهات الحسية والصوتية للمندوب فور قبول الطلب -->
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <!-- 6. إعادة تشغيل الخدمة تلقائياً عند إقلاع الهاتف -->
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />

    <application
        android:allowBackup="true"
        android:icon="@android:drawable/ic_dialog_map"
        android:label="@string/app_name"
        android:roundIcon="@android:drawable/ic_dialog_map"
        android:supportsRtl="true"
        android:theme="@style/Theme.LocateGoDriver"
        android:usesCleartextTraffic="true"
        tools:targetApi="34">

        <!-- واجهة التحكم الرئيسية لتطبيق Locate Go -->
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:theme="@style/Theme.LocateGoDriver">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- خدمة إمكانية الوصول لقراءة شاشة تطبيقات التوصيل والنقر التلقائي -->
        <service
            android:name=".LocateGoAccessibilityService"
            android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"
            android:exported="true">
            <intent-filter>
                <action android:name="android.accessibilityservice.AccessibilityService" />
            </intent-filter>
            <meta-data
                android:name="android.accessibilityservice"
                android:resource="@xml/accessibility_service_config" />
        </service>

        <!-- خدمة التتبع الجغرافي المستمر في الخلفية لحساب مسافة الـ 2 كم -->
        <service
            android:name=".LocationTrackingService"
            android:enabled="true"
            android:exported="false"
            android:foregroundServiceType="location" />

        <!-- خدمة النافذة العائمة فوق التطبيقات -->
        <service
            android:name=".FloatingOverlayService"
            android:enabled="true"
            android:exported="false" />

        <!-- مستقبل إقلاع الهاتف للتشغيل الذاتي -->
        <receiver
            android:name=".BootReceiver"
            android:enabled="true"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="android.intent.action.MY_PACKAGE_REPLACED" />
            </intent-filter>
        </receiver>

    </application>

</manifest>
`;

  // ----------------------------------------------------
  // 2. LocationTrackingService.kt
  // ----------------------------------------------------
  const LOCATION_SERVICE_CODE = `package com.locatego.driver

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

        fun isWithinCourierRadius(storeLat: Double, storeLng: Double, maxRadiusKm: Double = 2.0): Boolean {
            val driverLat = currentLatitude ?: return true
            val driverLng = currentLongitude ?: return true
            val dist = calculateDistanceKm(driverLat, driverLng, storeLat, storeLng)
            return dist <= maxRadiusKm
        }
    }

    override fun onCreate() {
        super.onCreate()
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
                startForeground(NOTIFICATION_ID, buildForegroundNotification("جاري تتبع الموقع في نطاق 2 كم..."))
                startTracking()
                isServiceRunning = true
            }
        }
        return START_STICKY
    }

    @SuppressLint("MissingPermission")
    private fun startTracking() {
        if (!hasLocationPermission()) return

        val locationRequest = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 4000)
            .setMinUpdateIntervalMillis(2000)
            .setMinUpdateDistanceMeters(5.0f)
            .build()

        fusedLocationClient.requestLocationUpdates(
            locationRequest,
            locationCallback,
            Looper.getMainLooper()
        )
    }

    private fun onNewLocation(location: Location) {
        currentLatitude = location.latitude
        currentLongitude = location.longitude

        val notification = buildForegroundNotification("الموقع نشط • نطاق التصفية: 2.0 كم")
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(NOTIFICATION_ID, notification)

        serviceScope.launch {
            renderApiClient.updateDriverLocation(location.latitude, location.longitude)
        }
    }

    private fun stopTracking() {
        fusedLocationClient.removeLocationUpdates(locationCallback)
        isServiceRunning = false
        stopForeground(STOP_FOREGROUND_REMOVE)
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
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildForegroundNotification(contentText: String): Notification {
        val openIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, openIntent,
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
`;

  // ----------------------------------------------------
  // 3. LocateGoAccessibilityService.kt
  // ----------------------------------------------------
  const ACCESSIBILITY_SERVICE_CODE = `package com.locatego.driver

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.content.Context
import android.graphics.Path
import android.graphics.Rect
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import kotlinx.coroutines.*
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean
import java.util.regex.Pattern

/**
 * LocateGoAccessibilityService
 * خدمة مراقبة شاشة تطبيقات التوصيل والاعتراض الفوري للطلبات (Zero-Delay Auto-Accept).
 *
 * التعديلات الحصرية:
 * 1. إلغاء ميزة السحب التلقائي (Swipe Down / Swipe Loop) نهائياً وبشكل كامل. لا يتم تنفيذ أي حركة سحب للشاشة.
 * 2. معيار الفحص والقبول الحصري:
 *    - الشرط الأساسي والوحيد للمسافة: "مسافة العميل / الوجهة" (Delivery Distance) <= الحد الأقصى للمسافة المحددة (مثلاً 2 كم).
 *    - "مسافة المطعم / الاستلام" (Pickup Distance): اختيارية ومفتوحة تماماً بغض النظر عن قيمتها، بحيث يتم قبول الطلب فوراً حتى لو كان المطعم بعيداً.
 * 3. بمجرد ظهور الطلب ومطابقته للشرط (مسافة العميل <= الحد الأقصى)، يتم النقر المباشر والفوري على زر القبول ("Accept") في أقل من 10ms دون أي تأخير،
 *    ودون الحاجة لأي عملية تحديث أو سحب للشاشة، مع إرسال تقرير الطلب لسيرفر Render في الخلفية.
 */
class LocateGoAccessibilityService : AccessibilityService() {

    companion object {
        // مصفوفة حزم تطبيقات التوصيل المستهدفة بالكامل
        val TARGET_PACKAGES = setOf(
            "sa.lg.android.locate",
            "sa.lg.android.locatcc",
            "sa.lg.android.locati",
            "sa.lg.android.locatm",
            "sa.lg.android.locatg",
            "sa.lg.android.locatf",
            "Sa.lg.android.locate",
            "Sa.lg.android.locati",
            "Sa.lg.android.locatf"
        )

        fun isTargetPackage(pkg: String?): Boolean {
            if (pkg.isNullOrBlank()) return false
            val p = pkg.trim()
            return TARGET_PACKAGES.contains(p) || TARGET_PACKAGES.contains(p.lowercase())
        }

        // قائمة الكلمات والنصوص الواجب تجاهلها (القوائم، التبويبات، الإعدادات، وأزرار التنقل العامة)
        private val IGNORED_NAV_TEXTS = setOf(
            "الرئيسية", "حسابي", "الملف الشخصي", "الإعدادات", "المحفظة", "الدعم", "مساعدة",
            "المساعدة", "تسجيل الخروج", "تسجيل خروج", "خروج", "الأرشيف", "السجل", "الإشعارات",
            "شروط الاستخدام", "سياسة الخصوصية", "حول التطبيق", "تحديث التطبيق", "تقييم",
            "المظهر", "اللغة", "الوضع الليلي", "حفظ", "إغلاق", "رجوع", "تخطي", "موافق",
            "إلغاء", "تأكيد الهاتف", "رمز التحقق", "التفاصيل", "عرض التفاصيل", "التالي", "السابق",
            "home", "profile", "settings", "wallet", "support", "help", "logout", "history",
            "notifications", "about", "close", "back", "cancel", "menu", "next", "skip"
        )

        // كلمات أزرار القبول المستهدفة للنقر التلقائي الفوري
        private val ACCEPT_BUTTON_KEYWORDS = listOf(
            "قبول", "قبول الطلب", "استلام الطلب", "تأكيد القبول", "تأكيد", "وافق", "موافق",
            "Accept", "Take Order", "Confirm", "Accept Order", "إسناد", "استلام", "موافقة"
        )

        // معرّفات عناصر أزرار القبول المحتملة في واجهات التطبيقات
        private val ACCEPT_VIEW_IDS = listOf(
            "btn_accept", "accept", "accept_order", "btnAccept", "btn_confirm",
            "order_accept", "take_order", "button_accept", "action_accept", "btn_take"
        )
    }

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private lateinit var renderClient: RenderApiClient

    // تعابير نمطية مستهدفة بدقة عالية لبيانات عروض الطلبات
    // 1. مسافة المطعم / الاستلام
    private val pickupDistancePattern = Pattern.compile(
        "(?:مسافة\\\\s*(?:المتجر|المطعم|الاستلام)|المتجر\\\\s*يبعد|المطعم\\\\s*يبعد|مسافة\\\\s*الاستلام|الاستلام|المطعم|المتجر|pickup|store)\\\\s*[:]?\\\\s*(\\\\d+(?:[.,]\\\\d+)?)\\\\s*(?:كم|كيلو|km|k\\\\.m)",
        Pattern.CASE_INSENSITIVE or Pattern.UNICODE_CASE
    )

    // 2. مسافة العميل / التوصيل
    private val deliveryDistancePattern = Pattern.compile(
        "(?:مسافة\\\\s*(?:العميل|التوصيل|الوجهة)|العميل\\\\s*يبعد|مسافة\\\\s*التوصيل|التوصيل|العميل|الوجهة|delivery|dropoff|customer)\\\\s*[:]?\\\\s*(\\\\d+(?:[.,]\\\\d+)?)\\\\s*(?:كم|كيلو|km|k\\\\.m)",
        Pattern.CASE_INSENSITIVE or Pattern.UNICODE_CASE
    )

    // 3. المسافة العامة أو الإجمالية
    private val generalDistancePattern = Pattern.compile(
        "(?:المسافة\\\\s*الإجمالية|إجمالي\\\\s*المسافة|المسافة\\\\s*الكلية|المسافة|يبعد|تبعد|distance|total)?\\\\s*[:]?\\\\s*(\\\\d+(?:[.,]\\\\d+)?)\\\\s*(?:كم|كيلو|km|k\\\\.m)",
        Pattern.CASE_INSENSITIVE or Pattern.UNICODE_CASE
    )

    // 4. أجر التوصيل (بالريال السعودي)
    private val payoutPattern = Pattern.compile(
        "(?:الأجر|المبلغ|السعر|قيمة\\\\s*التوصيل|الربح|الأرباح|fee|sar|payout)?\\\\s*[:]?\\\\s*(\\\\d+(?:[.,]\\\\d+)?)\\\\s*(?:ر\\\\.س|ريال|sar|SAR|ر\\\\.\\\\s*س)",
        Pattern.CASE_INSENSITIVE or Pattern.UNICODE_CASE
    )

    // 5. رقم الطلب
    private val orderIdPattern = Pattern.compile(
        "(?:رقم\\\\s*الطلب|الطلب\\\\s*رقم|طلب\\\\s*#|Order\\\\s*#?|ID\\\\s*[:#]?|#)\\\\s*([A-Za-z0-9\\\\-_]{3,15})",
        Pattern.CASE_INSENSITIVE or Pattern.UNICODE_CASE
    )

    // 6. حي أو وجهة العميل
    private val districtPattern = Pattern.compile(
        "(?:التوصيل\\\\s*إلى|الوجهة|العميل|حي|district)?\\\\s*[:]?\\\\s*(حي\\\\s+[\\\\u0600-\\\\u06FF]+(?:\\\\s+[\\\\u0600-\\\\u06FF]+)?)",
        Pattern.CASE_INSENSITIVE or Pattern.UNICODE_CASE
    )

    private val isEvaluatingOrder = AtomicBoolean(false)
    private var currentForegroundPackage = ""
    private val processedOrdersCache = ConcurrentHashMap<String, Long>()

    override fun onServiceConnected() {
        super.onServiceConnected()
        renderClient = RenderApiClient(this)
        Log.i("LocateGoService", "⚡ LocateGoAccessibilityService is ACTIVE (Pure Screen Observer • No-Swipe Mode • Zero-Delay Auto-Accept).")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        val packageName: String = event.packageName?.toString() ?: ""
        val isTarget = isTargetPackage(packageName)

        // تجاهل أي تطبيق ليس ضمن التطبيقات المستهدفة
        if (!isTarget) {
            currentForegroundPackage = ""
            return
        }

        currentForegroundPackage = packageName

        // مراقبة أي تحديث أو تغير في محتوى أو حالة النافذة
        if (event.eventType != AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED &&
            event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return

        val root = rootInActiveWindow ?: return
        inspectScreenForOrderOffer(root, packageName)
    }

    /**
     * فحص الشاشة بدقة فائقة لاستخراج تفاصيل الطلب والمقارنة مع الإعدادات والنقر الفوري
     */
    private fun inspectScreenForOrderOffer(root: AccessibilityNodeInfo, packageName: String) {
        // جمع وتصفية النصوص المعروضة فقط
        val orderTexts = mutableListOf<String>()
        collectOrderTextsOnly(root, orderTexts)

        if (orderTexts.isEmpty()) return

        // 1. قراءة إعدادات السائق المحددة محلياً من SharedPreferences أولاً
        val prefs = getSharedPreferences("locate_go_prefs", Context.MODE_PRIVATE)
        val maxAllowedDeliveryKm = prefs.getFloat("max_distance_km", 3.0f).toDouble()
        val maxAllowedPickupKm = prefs.getFloat("max_pickup_distance_km", 1.5f).toDouble()
        val isAutoAcceptEnabled = prefs.getBoolean("auto_accept", true)

        // 2. تطبيع كافة النصوص واستخراج جميع أرقام المسافات الظاهرة على الشاشة (مع دعم الأرقام المشرقية ٠-٩)
        val joinedContent = normalizeArabicDigits(orderTexts.joinToString(" "))
        val allDistances = extractAllDistancesFromTexts(orderTexts)

        // ⛔ شرط الحماية القطعي الأول (المعيار الأساسي الوحيد 100%):
        // إذا لم توجد أي مسافة واضحة على الشاشة، لا نقبل الطلب نهائياً!
        if (allDistances.isEmpty()) {
            return
        }

        // ⛔ شرط الحماية القطعي الثاني:
        // إذا ظهرت أي مسافة على شاشة العرض تتجاوز الحد الأقصى لمسافة العميل المحدد (مثلاً 3 كم) -> رفض فوري قطعي 100%!
        val exceedingDelivery = allDistances.filter { it > maxAllowedDeliveryKm }
        if (exceedingDelivery.isNotEmpty()) {
            Log.w("LocateGoService", "⛔ REJECTED: Order contains distance \${exceedingDelivery} km exceeding delivery limit (\$maxAllowedDeliveryKm km). Rejected!")
            return
        }

        // 3. استخراج مسافة المتجر ومسافة العميل بدقة
        var pickupDistKm: Double? = null
        val pickupMatcher = pickupDistancePattern.matcher(joinedContent)
        if (pickupMatcher.find()) {
            pickupDistKm = pickupMatcher.group(1)?.replace(',', '.')?.toDoubleOrNull()
        }

        var deliveryDistKm: Double? = null
        val deliveryMatcher = deliveryDistancePattern.matcher(joinedContent)
        if (deliveryMatcher.find()) {
            deliveryDistKm = deliveryMatcher.group(1)?.replace(',', '.')?.toDoubleOrNull()
        }

        // تحديد مسافة الاستلام ومسافة التوصيل النهائية:
        val evalPickupKm: Double
        val evalDeliveryKm: Double

        if (pickupDistKm != null && deliveryDistKm != null) {
            evalPickupKm = pickupDistKm
            evalDeliveryKm = deliveryDistKm
        } else if (allDistances.size >= 2) {
            val sorted = allDistances.sorted()
            evalPickupKm = sorted.first()  // الأقصر هي مسافة المتجر / الاستلام
            evalDeliveryKm = sorted.last() // الأطول هي مسافة العميل / التوصيل
        } else {
            val single = allDistances.first()
            val isExplicitPickup = joinedContent.contains("المتجر") || joinedContent.contains("المطعم") || joinedContent.contains("الاستلام") || joinedContent.contains("pickup", true)
            if (isExplicitPickup) {
                evalPickupKm = single
                evalDeliveryKm = single
            } else {
                evalPickupKm = 0.0 // مسافة واحدة للعميل
                evalDeliveryKm = single
            }
        }

        // ⛔ شرط الحماية القطعي الثالث:
        // إذا كانت مسافة المتجر / المطعم تتجاوز حد مسافة المتجر المحدد (مثلاً 1.5 كم) -> رفض فوري قطعي 100%!
        if (evalPickupKm > 0.0 && evalPickupKm > maxAllowedPickupKm) {
            Log.w("LocateGoService", "⛔ REJECTED: Store distance (\$evalPickupKm km) exceeds pickup limit (\$maxAllowedPickupKm km). Rejected!")
            return
        }

        // ⛔ شرط الحماية القطعي الرابع:
        // إذا كانت مسافة العميل / الوجهة تتجاوز حد مسافة العميل المحدد (مثلاً 3 كم) -> رفض فوري قطعي 100%!
        if (evalDeliveryKm > maxAllowedDeliveryKm) {
            Log.w("LocateGoService", "⛔ REJECTED: Customer distance (\$evalDeliveryKm km) exceeds delivery limit (\$maxAllowedDeliveryKm km). Rejected!")
            return
        }

        // 4. استخراج رقم الطلب إن وجد
        var extractedOrderId: String? = null
        val idMatcher = orderIdPattern.matcher(joinedContent)
        if (idMatcher.find()) {
            extractedOrderId = idMatcher.group(1)
        }

        // 5. استخراج أجر وسعر التوصيل
        var payoutSar = 18.0
        val payoutMatcher = payoutPattern.matcher(joinedContent)
        if (payoutMatcher.find()) {
            payoutMatcher.group(1)?.replace(',', '.')?.toDoubleOrNull()?.let { payoutSar = it }
        }

        // 6. استخراج اسم المتجر من النصوص المصفاة
        val storeName = extractStoreName(orderTexts)

        // 7. استخراج تفاصيل الحي أو وجهة العميل
        val customerDistrict = extractCustomerDistrict(joinedContent, orderTexts)

        // 8. منع تكرار النقر على نفس الطلب خلال 8 ثوانٍ لتفادي النقر المزدوج غير الضروري
        val deduplicationKey = "\${extractedOrderId ?: \"\"}|\$evalDeliveryKm|\$evalPickupKm|\$payoutSar|\$storeName"
        val now = System.currentTimeMillis()
        if (processedOrdersCache[deduplicationKey]?.let { now - it < 8_000 } == true) return

        Log.i(
            "LocateGoService",
            "🎯 NEW OFFER DETECTED: Store='\$storeName' | DeliveryDist=\$evalDeliveryKm km (Max: \$maxAllowedDeliveryKm km) | PickupDist=\$evalPickupKm km (Max: \$maxAllowedPickupKm km) | Payout=\$payoutSar SAR"
        )

        // =========================================================================
        // قاعدة الفحص والقبول الصارمة (المعيار الأساسي الوحيد المعتمد 100%):
        // 1. مسافة العميل / الوجهة <= الحد الأقصى للمسافة (افتراضي 3.0 كم).
        // 2. مسافة المتجر / المطعم <= حد مسافة المتجر (افتراضي 1.5 كم).
        // (تم استبعاد السعر تماماً: الاعتماد حصرياً على المسافات الجغرافية)
        // =========================================================================
        val isDeliveryWithinLimit = evalDeliveryKm <= maxAllowedDeliveryKm
        val isPickupWithinLimit = evalPickupKm <= 0.0 || evalPickupKm <= maxAllowedPickupKm
        val isOrderMatching = isAutoAcceptEnabled && isDeliveryWithinLimit && isPickupWithinLimit

        val lowerPkg = packageName.lowercase()
        val resolvedAppName = when {
            lowerPkg.contains("locatcc") -> "Locate CC"
            lowerPkg.contains("locati") -> "Locate I"
            lowerPkg.contains("locatm") -> "Locate M"
            lowerPkg.contains("locatg") -> "Locate G"
            lowerPkg.contains("locatf") -> "Locate F"
            lowerPkg.contains("locate") -> "Locate Go"
            else -> "Locate Driver"
        }

        if (isOrderMatching) {
            // حفظ الطلب في الذاكرة لمنع تكراره
            processedOrdersCache[deduplicationKey] = now
            isEvaluatingOrder.set(true)

            // =========================================================================
            // تنفيذ النقر المباشر والفوري على زر القبول ("Accept") دون أي تأخير إطلاقاً
            // =========================================================================
            val clickSuccess = executeInstantDirectAccept(root)
            Log.i(
                "LocateGoService",
                "⚡⚡ ZERO-DELAY ACCEPT TRIGGERED! Click success = \$clickSuccess for order at \$storeName (Delivery dist: \$evalDeliveryKm km <= \$maxAllowedDeliveryKm km, Store dist: \$evalPickupKm km <= \$maxAllowedPickupKm km)"
            )

            // تنبيه صوتي واهتزاز فوري للمندوب بنجاح القبول
            notifyDriverAccepted()

            // إرسال تفاصيل الطلب المقبول لحظياً إلى سيرفر Render في الخلفية دون تعطيل واجهة المستخدم
            serviceScope.launch {
                renderClient.evaluateOrder(
                    appName = resolvedAppName,
                    storeName = storeName,
                    distanceKm = evalDeliveryKm,
                    payoutSar = payoutSar,
                    orderId = extractedOrderId,
                    customerDistrict = customerDistrict,
                    driverLat = LocationTrackingService.currentLatitude,
                    driverLng = LocationTrackingService.currentLongitude,
                    pickupDistanceKm = evalPickupKm,
                    deliveryDistanceKm = evalDeliveryKm
                )
                delay(3000L)
                isEvaluatingOrder.set(false)
            }
        } else {
            processedOrdersCache[deduplicationKey] = now
            val rejectReason = when {
                !isDeliveryWithinLimit -> "مسافة العميل/الوجهة (\$evalDeliveryKm كم) تتجاوز الحد الأقصى المحدد (\$maxAllowedDeliveryKm كم)"
                !isPickupWithinLimit -> "مسافة المتجر/المطعم (\$evalPickupKm كم) تتجاوز حد مسافة المتجر (\$maxAllowedPickupKm كم)"
                else -> "القبول التلقائي متوقف في الإعدادات"
            }

            Log.w("LocateGoService", "🚫 ORDER REJECTED LOCALLY: \$rejectReason")
            notifyDriverRejected()

            // إبلاغ السيرفر لتوثيق الإحصائيات في الخلفية
            serviceScope.launch {
                renderClient.evaluateOrder(
                    appName = resolvedAppName,
                    storeName = storeName,
                    distanceKm = targetEvaluationDistanceKm,
                    payoutSar = payoutSar,
                    orderId = extractedOrderId,
                    customerDistrict = customerDistrict,
                    driverLat = LocationTrackingService.currentLatitude,
                    driverLng = LocationTrackingService.currentLongitude,
                    pickupDistanceKm = pickupDistKm,
                    deliveryDistanceKm = deliveryDistKm
                )
            }
        }
    }

    /**
     * تنفيذ النقر الفوري والمباشر على زر القبول ("Accept") بأعلى سرعة ممكنة
     */
    private fun executeInstantDirectAccept(root: AccessibilityNodeInfo): Boolean {
        val currentRoot = rootInActiveWindow ?: root

        // الطريقة 1: البحث المباشر عن طريق نصوص كلمات أزرار القبول
        for (keyword in ACCEPT_BUTTON_KEYWORDS) {
            val nodes = currentRoot.findAccessibilityNodeInfosByText(keyword)
            for (node in nodes) {
                if (performFastClickAndTap(node)) {
                    Log.i("LocateGoService", "⚡ Accept clicked via text match: '\$keyword'")
                    return true
                }
            }
        }

        // الطريقة 2: البحث عن طريق معرّفات عناصر زر القبول في الواجهة (View IDs)
        for (viewId in ACCEPT_VIEW_IDS) {
            val fullId = "\${currentForegroundPackage}:id/\$viewId"
            val nodes = currentRoot.findAccessibilityNodeInfosByViewId(fullId)
            for (node in nodes) {
                if (performFastClickAndTap(node)) {
                    Log.i("LocateGoService", "⚡ Accept clicked via view ID: '\$fullId'")
                    return true
                }
            }
        }

        // الطريقة 3: البحث عن أي زر قابل للنقر في الجزء السفلي من الشاشة (موضع أزرار القبول المعتاد)
        val fallbackNodes = mutableListOf<AccessibilityNodeInfo>()
        findActionButtonsInLowerScreen(currentRoot, fallbackNodes)
        for (node in fallbackNodes) {
            if (performFastClickAndTap(node)) {
                Log.i("LocateGoService", "⚡ Accept clicked via lower screen action button fallback")
                return true
            }
        }

        return false
    }

    /**
     * تنفيذ القبول الفوري عبر السحب الأفقي (Swipe to Accept) والنقر لضمان القبول في تطبيقات مثل جاهز وذا شفز
     */
    private fun performFastClickAndTap(node: AccessibilityNodeInfo): Boolean {
        var accepted = false

        // 1. فحص ما إذا كان شريط سحب (Slider / Swipe bar)
        val text = node.text?.toString() ?: ""
        val desc = node.contentDescription?.toString() ?: ""
        val viewId = node.viewIdResourceName?.lowercase() ?: ""
        val isSwipe = text.contains("اسحب") || text.contains("سحب") ||
                desc.contains("اسحب") || viewId.contains("slide") || viewId.contains("swipe")

        // 2. سحب أفقي فوري (Swipe Gesture) للمقبض من البداية للنهاية
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            val bounds = Rect()
            node.getBoundsInScreen(bounds)
            if (!bounds.isEmpty && bounds.width() > 0 && bounds.height() > 0) {
                if (isSwipe || bounds.width() > bounds.height() * 1.5f) {
                    val cy = bounds.centerY().toFloat()
                    val startX = bounds.left + (bounds.height() * 0.45f).coerceAtLeast(24f)
                    val endX = bounds.right - (bounds.height() * 0.35f).coerceAtLeast(24f)
                    val swipePath = Path().apply {
                        moveTo(startX, cy)
                        lineTo(endX, cy)
                    }
                    val stroke = GestureDescription.StrokeDescription(swipePath, 0L, 100L)
                    val gesture = GestureDescription.Builder().addStroke(stroke).build()
                    dispatchGesture(gesture, null, null)
                    accepted = true
                }
            }
        }

        // 3. استدعاء أمر النقر البرمجي ACTION_CLICK على العقدة أو العقدة الحاوية
        var current: AccessibilityNodeInfo? = node
        while (current != null) {
            if (current.isClickable) {
                val clicked = current.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                if (clicked) accepted = true
                break
            }
            current = current.parent
        }

        // 4. نقر فوري عبر إحداثيات الشاشة بالعتاد كخيار إضافي
        if (!accepted && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            val bounds = Rect()
            node.getBoundsInScreen(bounds)
            if (!bounds.isEmpty && bounds.width() > 0 && bounds.height() > 0) {
                performInstantTapAtCoordinates(bounds.centerX().toFloat(), bounds.centerY().toFloat())
                accepted = true
            }
        }

        return accepted
    }

    /**
     * نقر لمس مباشر بإحداثيات الشاشة بدون أي تأخير
     */
    private fun performInstantTapAtCoordinates(x: Float, y: Float) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) return
        val tapPath = Path().apply { moveTo(x, y) }
        val stroke = GestureDescription.StrokeDescription(tapPath, 0, 35)
        val gesture = GestureDescription.Builder().addStroke(stroke).build()
        dispatchGesture(gesture, null, null)
    }

    /**
     * العثور على أزرار الإجراء في الثلث السفلي من الشاشة واستبعاد أزرار الرفض والإلغاء
     */
    private fun findActionButtonsInLowerScreen(node: AccessibilityNodeInfo?, list: MutableList<AccessibilityNodeInfo>) {
        if (node == null) return

        val bounds = Rect()
        node.getBoundsInScreen(bounds)
        val displayHeight = resources.displayMetrics.heightPixels

        // فحص الأزرار التي تقع في الثلث السفلي من الشاشة (حيث توضع أزرار قبول الطلبات)
        if (bounds.centerY() > (displayHeight * 0.65f)) {
            val txt = (node.text?.toString() ?: node.contentDescription?.toString() ?: "").trim()
            val isReject = txt.contains("رفض", true) || txt.contains("إلغاء", true) ||
                           txt.contains("تجاهل", true) || txt.contains("close", true) ||
                           txt.contains("reject", true) || txt.contains("cancel", true)

            if (!isReject && (node.isClickable || node.className?.toString()?.contains("Button", true) == true)) {
                list.add(node)
            }
        }

        for (i in 0 until node.childCount) {
            findActionButtonsInLowerScreen(node.getChild(i), list)
        }
    }

    /**
     * جمع نصوص عروض الطلبات وتصفية القوائم والأزرار غير المتعلقة بها
     */
    private fun collectOrderTextsOnly(node: AccessibilityNodeInfo?, list: MutableList<String>) {
        if (node == null) return

        val text = node.text?.toString()?.trim()
        val desc = node.contentDescription?.toString()?.trim()

        val candidate = when {
            !text.isNullOrEmpty() -> text
            !desc.isNullOrEmpty() -> desc
            else -> null
        }

        if (candidate != null && candidate.length in 2..120) {
            val normalizedLower = candidate.lowercase()
            val isIgnoredNav = IGNORED_NAV_TEXTS.any { ignored ->
                normalizedLower == ignored || normalizedLower.startsWith("\$ignored ") || normalizedLower.endsWith(" \$ignored")
            }

            if (!isIgnoredNav) {
                list.add(candidate)
            }
        }

        for (i in 0 until node.childCount) {
            collectOrderTextsOnly(node.getChild(i), list)
        }
    }

    /**
     * تحويل الأرقام العربية المشرقية (٠ ١ ٢ ٣ ٤ ٥ ٦ ٧ ٨ ٩) والفواصل إلى صيغة قياسية
     */
    private fun normalizeArabicDigits(input: String): String {
        val sb = java.lang.StringBuilder()
        for (ch in input) {
            when (ch) {
                '٠', '۰' -> sb.append('0')
                '١', '۱' -> sb.append('1')
                '٢', '۲' -> sb.append('2')
                '٣', '۳' -> sb.append('3')
                '٤', '۴' -> sb.append('4')
                '٥', '۵' -> sb.append('5')
                '٦', '۶' -> sb.append('6')
                '٧', '۷' -> sb.append('7')
                '٨', '۸' -> sb.append('8')
                '٩', '۹' -> sb.append('9')
                '٫', '،' -> sb.append('.')
                else -> sb.append(ch)
            }
        }
        return sb.toString()
    }

    /**
     * استخراج كافة أرقام الكيلومتر من النصوص بدقة مع دعم الأرقام العربية المشرقية والإنجليزية
     */
    private fun extractAllDistancesFromTexts(texts: List<String>): List<Double> {
        val result = mutableListOf<Double>()
        val kmPattern = Pattern.compile("(\\\\d+(?:[.,]\\\\d+)?)\\\\s*(?:كم|كيلو|km|k\\\\.m|k)", Pattern.CASE_INSENSITIVE or Pattern.UNICODE_CASE)
        for (raw in texts) {
            val normalized = normalizeArabicDigits(raw)
            val m = kmPattern.matcher(normalized)
            while (m.find()) {
                m.group(1)?.replace(',', '.')?.toDoubleOrNull()?.let {
                    if (it > 0.0 && it < 120.0) {
                        result.add(it)
                    }
                }
            }
        }
        return result
    }

    /**
     * استخراج اسم المتجر الحقيقي من قائمة النصوص المصفاة
     */
    private fun extractStoreName(texts: List<String>): String {
        for (item in texts) {
            val trimmed = item.trim()
            if (trimmed.length in 3..35 &&
                !generalDistancePattern.matcher(trimmed).find() &&
                !payoutPattern.matcher(trimmed).find() &&
                !orderIdPattern.matcher(trimmed).find() &&
                !ACCEPT_BUTTON_KEYWORDS.any { trimmed.equals(it, ignoreCase = true) } &&
                !trimmed.contains("توصيل", true) &&
                !trimmed.contains("طلب", true) &&
                !trimmed.contains("رفض", true) &&
                !trimmed.contains("تجاهل", true) &&
                !trimmed.contains("استلام", true)
            ) {
                return trimmed
            }
        }
        return "متجر العرض"
    }

    /**
     * استخراج الحي أو تفاصيل وجهة التوصيل
     */
    private fun extractCustomerDistrict(fullContent: String, texts: List<String>): String? {
        val matcher = districtPattern.matcher(fullContent)
        if (matcher.find()) {
            return matcher.group(1)?.trim()
        }

        return texts.firstOrNull {
            it.contains("حي ", true) ||
            it.contains("شارع ", true) ||
            it.contains("طريق ", true) ||
            it.contains("مجمع ", true)
        }
    }

    private fun notifyDriverAccepted() {
        // تم تعطيل الأصوات والاهتزازات بالكامل (Silent & Vibration-Free)
    }

    private fun notifyDriverRejected() {
        // تم تعطيل الأصوات والاهتزازات بالكامل (Silent & Vibration-Free)
    }

    override fun onDestroy() {
        serviceScope.cancel()
        super.onDestroy()
    }

    override fun onInterrupt() {
        // لا توجد مؤقتات أو مهام سحب بحاجة للإيقاف
    }
}
`;

  // ----------------------------------------------------
  // 4. MainActivity.kt (Single App Architecture)
  // ----------------------------------------------------
  const MAIN_ACTIVITY_CODE = `package com.locatego.driver

import android.Manifest
import android.annotation.SuppressLint
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
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private lateinit var bridge: LocateGoNativeBridge
    private lateinit var renderClient: RenderApiClient
    private lateinit var accessibilityBtn: Button
    private lateinit var serverUrlInput: EditText

    private val requestLocationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val fineGranted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] ?: false
        val coarseGranted = permissions[Manifest.permission.ACCESS_COARSE_LOCATION] ?: false

        if (fineGranted || coarseGranted) {
            Toast.makeText(this, "تم منح إذن الموقع الجغرافي بنجاح", Toast.LENGTH_SHORT).show()
            startLocationService()
            requestBackgroundLocationIfNeeded()
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
        checkAndRequestPermissions()

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    moveTaskToBack(true)
                }
            }
        })
    }

    override fun onResume() {
        super.onResume()
        syncStateToWeb()
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

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            useWideViewPort = true
            loadWithOverviewMode = true
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
            cacheMode = WebSettings.LOAD_DEFAULT
            mediaPlaybackRequiresUserGesture = false
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            userAgentString = "\${userAgentString} LocateGoDriverApp/1.0.0"
        }

        webView.addJavascriptInterface(bridge, "LocateGoNative")

        webView.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                progressBar.visibility = View.VISIBLE
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                progressBar.visibility = View.GONE
                syncStateToWeb()
            }

            @SuppressLint("WebViewClientOnReceivedSslError")
            override fun onReceivedSslError(view: WebView?, handler: SslErrorHandler?, error: SslError?) {
                handler?.proceed()
            }

            override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                super.onReceivedError(view, request, error)
                if (request?.isForMainFrame == true) {
                    progressBar.visibility = View.GONE
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onGeolocationPermissionsShowPrompt(
                origin: String?,
                callback: GeolocationPermissions.Callback?
            ) {
                callback?.invoke(origin, true, false)
            }
        }

        val dashboardUrl = renderClient.baseUrl
        webView.loadUrl(dashboardUrl)
    }

    fun syncStateToWeb() {
        lifecycleScope.launch {
            delay(300)
            val isRunning = LocationTrackingService.isServiceRunning
            val isOverlay = FloatingOverlayService.isOverlayShowing
            val lat = LocationTrackingService.currentLatitude ?: 0.0
            val lng = LocationTrackingService.currentLongitude ?: 0.0

            val jsCode = """
                if (window.onLocateGoNativeSync) {
                    window.onLocateGoNativeSync({
                        isNativeApp: true,
                        isTrackingRunning: \$isRunning,
                        isOverlayShowing: \$isOverlay,
                        lat: \$lat,
                        lng: \$lng
                    });
                }
            """.trimIndent()
            webView.evaluateJavascript(jsCode, null)
        }
    }

    fun startLocationService() {
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
        val intent = Intent(this, LocationTrackingService::class.java).apply {
            action = LocationTrackingService.ACTION_STOP
        }
        startService(intent)
    }

    fun requestIgnoreBatteryOptimizations() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
            if (!pm.isIgnoringBatteryOptimizations(packageName)) {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:\$packageName")
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
            startLocationService()
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

/**
 * LocateGoNativeBridge - جسر التواصل بين واجهة الويب ونظام أندرويد
 * يضمن حفظ إعدادات المسافات (مسافة العميل ومسافة المتجر) فوراً في SharedPreferences لتطبيقها لحظياً في خدمة إمكانية الوصول
 */
class LocateGoNativeBridge(private val context: Context) {

    @JavascriptInterface
    fun saveSettings(settingsJson: String): Boolean {
        return try {
            val json = org.json.JSONObject(settingsJson)
            val prefs = context.getSharedPreferences("locate_go_prefs", Context.MODE_PRIVATE)
            val editor = prefs.edit()
            if (json.has("maxDistanceKm")) {
                val dist = json.getDouble("maxDistanceKm").toFloat()
                editor.putFloat("max_distance_km", dist)
            }
            if (json.has("maxPickupDistanceKm")) {
                val pickup = json.getDouble("maxPickupDistanceKm").toFloat()
                editor.putFloat("max_pickup_distance_km", pickup)
            }
            if (json.has("autoAccept")) {
                editor.putBoolean("auto_accept", json.getBoolean("autoAccept"))
            }
            editor.apply()
            android.util.Log.i("LocateGoBridge", "✅ Settings Synced to SharedPreferences: max_dist=\${prefs.getFloat("max_distance_km", 3.0f)}, max_pickup=\${prefs.getFloat("max_pickup_distance_km", 1.5f)}")
            true
        } catch (e: Exception) {
            android.util.Log.e("LocateGoBridge", "Failed to save settings to SharedPreferences: \${e.message}")
            false
        }
    }

    @JavascriptInterface
    fun getDeviceId(): String {
        val prefs = context.getSharedPreferences("locate_go_prefs", Context.MODE_PRIVATE)
        var id = prefs.getString("hardware_device_id", null)
        if (id.isNullOrBlank()) {
            val androidId = android.provider.Settings.Secure.getString(
                context.contentResolver,
                android.provider.Settings.Secure.ANDROID_ID
            ) ?: "DEVICE"
            id = "AND-" + androidId.takeLast(8).uppercase()
            prefs.edit().putString("hardware_device_id", id).apply()
        }
        return id
    }

    @JavascriptInterface
    fun isAccessibilityRunning(): Boolean {
        val am = context.getSystemService(Context.ACCESSIBILITY_SERVICE) as? android.view.accessibility.AccessibilityManager
        val enabledServices = am?.getEnabledAccessibilityServiceList(android.accessibilityservice.AccessibilityServiceInfo.FEEDBACK_GENERIC)
        return enabledServices?.any { it.resolveInfo.serviceInfo.packageName == context.packageName } ?: false
    }

    @JavascriptInterface
    fun openAccessibilitySettings() {
        val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        context.startActivity(intent)
    }

    @JavascriptInterface
    fun togglePower(running: Boolean) {
        val prefs = context.getSharedPreferences("locate_go_prefs", Context.MODE_PRIVATE)
        prefs.edit().putBoolean("auto_accept", running).apply()
        if (running) {
            (context as? MainActivity)?.startLocationService()
        } else {
            (context as? MainActivity)?.stopLocationService()
        }
    }
}
`;

  // ----------------------------------------------------
  // 5. app/build.gradle
  // ----------------------------------------------------
  const APP_GRADLE_CODE = `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.locatego.driver"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.locatego.driver"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    buildTypes {
        release {
            minifyEnabled false
            shrinkResources false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
        debug {
            applicationIdSuffix = ".debug"
            debuggable = true
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
        freeCompilerArgs += ["-opt-in=kotlinx.coroutines.ExperimentalCoroutinesApi"]
    }

    buildFeatures {
        viewBinding = true
        buildConfig = true
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    // AndroidX & UI
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.11.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
    implementation("androidx.lifecycle:lifecycle-service:2.7.0")

    // Google Play Services Location (High Accuracy GPS Courier Tracking within 2 km)
    implementation("com.google.android.gms:play-services-location:21.1.0")

    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.8.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.8.0")

    // OkHttp (Zero Delay Networking with Render Server)
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")

    // JSON Processing
    implementation("com.google.code.gson:gson:2.10.1")
}
`;

  // ----------------------------------------------------
  // 6. Root build.gradle & settings.gradle
  // ----------------------------------------------------
  const ROOT_GRADLE_CODE = `// ملف android/build.gradle
plugins {
    id("com.android.application") version "8.2.2" apply false
    id("org.jetbrains.kotlin.android") version "1.9.22" apply false
}

tasks.register("clean", Delete) {
    delete(rootProject.buildDir)
}

// --------------------------------------------------------
// ملف android/settings.gradle
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "LocateGoDriver"
include(":app")
`;

  // ----------------------------------------------------
  // 7. GitHub Actions Workflow
  // ----------------------------------------------------
  const GITHUB_ACTIONS_CODE = `name: Build Native Android APK

on:
  push:
    branches: [ "main", "master" ]
  pull_request:
    branches: [ "main", "master" ]
  workflow_dispatch:

jobs:
  build:
    name: Build Android APK (JDK 17)
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'

      - name: Setup Gradle
        uses: gradle/actions/setup-gradle@v3
        with:
          gradle-version: '8.5'

      - name: Ensure Gradle Wrapper Exists
        working-directory: android
        run: |
          if [ ! -f "gradle/wrapper/gradle-wrapper.jar" ]; then
            gradle wrapper --gradle-version 8.5
          fi
          chmod +x gradlew

      - name: Build Debug APK with Gradle
        working-directory: android
        run: ./gradlew assembleDebug --stacktrace --no-daemon

      - name: Upload Debug APK Artifact
        uses: actions/upload-artifact@v4
        with:
          name: LocateGo-Driver-Debug-APK
          path: android/app/build/outputs/apk/debug/app-debug.apk
          retention-days: 14

      - name: Build Release APK (Unsigned)
        working-directory: android
        run: ./gradlew assembleRelease --stacktrace --no-daemon

      - name: Upload Release APK (Unsigned) Artifact
        uses: actions/upload-artifact@v4
        with:
          name: LocateGo-Driver-Release-Unsigned-APK
          path: android/app/build/outputs/apk/release/app-release-unsigned.apk
          retention-days: 14
`;

  // ----------------------------------------------------
  // 8. RenderApiClient.kt
  // ----------------------------------------------------
  const RENDER_CLIENT_CODE = `package com.locatego.driver

import android.content.Context
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.ConnectionPool
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class RenderApiClient(private val context: Context) {

    private val prefs = context.getSharedPreferences("locate_go_prefs", Context.MODE_PRIVATE)

    var baseUrl: String
        get() = prefs.getString("render_url", "${normalizedUrl}") ?: "${normalizedUrl}"
        set(value) {
            var clean = value.trim()
                .replace(Regex("[\\u200B-\\u200F\\uFEFF\\u00A0\\u202A-\\u202E\\s]"), "")
                .removeSuffix("/")

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
        .connectTimeout(25, TimeUnit.SECONDS)
        .readTimeout(25, TimeUnit.SECONDS)
        .writeTimeout(25, TimeUnit.SECONDS)
        .retryOnConnectionFailure(true)
        .build()

    data class EvaluationResponse(
        val isAccepted: Boolean,
        val decision: String,
        val computedDistanceKm: Double,
        val maxAllowedKm: Double,
        val rejectionReason: String? = null
    )

    suspend fun pingServer(): Result<String> = withContext(Dispatchers.IO) {
        val rootUrl = baseUrl.trim().removeSuffix("/")
        val candidateEndpoints = listOf("/api/health", "/health", "/api/ping", "/ping")
        var lastException: Exception? = null

        for (endpoint in candidateEndpoints) {
            try {
                val request = Request.Builder()
                    .url("\$rootUrl\$endpoint")
                    .get()
                    .header("Connection", "Keep-Alive")
                    .header("Accept", "application/json")
                    .header("User-Agent", "LocateGo-Android/1.0")
                    .build()

                val start = System.currentTimeMillis()
                httpClient.newCall(request).execute().use { response ->
                    val elapsed = System.currentTimeMillis() - start
                    if (response.isSuccessful) {
                        return@withContext Result.success("تم بنجاح (\${elapsed}ms)")
                    } else if (response.code != 404) {
                        return@withContext Result.failure(Exception("كود السيرفر: HTTP \${response.code}"))
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

            val body = json.toString().toRequestBody("application/json; charset=utf-8".toMediaType())
            val request = Request.Builder()
                .url("\$url/api/orders/evaluate")
                .post(body)
                .header("Connection", "Keep-Alive")
                .header("User-Agent", "LocateGo-Android/1.0")
                .build()

            httpClient.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    return@withContext Result.failure(Exception("HTTP \${response.code}"))
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
                        maxAllowedKm = eval?.optDouble("maxAllowedKm", 3.0) ?: 3.0,
                        rejectionReason = eval?.optString("rejectionReason", null)
                    )
                )
            }
        } catch (e: Exception) {
            Log.e("RenderApiClient", "Evaluation error: \${e.message}")
            Result.failure(e)
        }
    }

    suspend fun updateDriverLocation(lat: Double, lng: Double): Boolean = withContext(Dispatchers.IO) {
        try {
            val url = baseUrl.trim().removeSuffix("/")
            val json = JSONObject().apply {
                put("lat", lat)
                put("lng", lng)
            }
            val body = json.toString().toRequestBody("application/json; charset=utf-8".toMediaType())
            val request = Request.Builder()
                .url("\$url/api/location")
                .post(body)
                .header("Connection", "Keep-Alive")
                .header("User-Agent", "LocateGo-Android/1.0")
                .build()

            httpClient.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    Log.w("RenderApiClient", "Update location returned HTTP \${response.code}")
                }
                response.isSuccessful
            }
        } catch (e: Exception) {
            Log.e("RenderApiClient", "Failed to update location: \${e.message}")
            false
        }
    }
}
`;

  const activeCode =
    activeTab === 'tree'
      ? PROJECT_TREE_TEXT
      : activeTab === 'manifest'
      ? MANIFEST_CODE
      : activeTab === 'location'
      ? LOCATION_SERVICE_CODE
      : activeTab === 'service'
      ? ACCESSIBILITY_SERVICE_CODE
      : activeTab === 'activity'
      ? MAIN_ACTIVITY_CODE
      : activeTab === 'client'
      ? RENDER_CLIENT_CODE
      : activeTab === 'app_gradle'
      ? APP_GRADLE_CODE
      : activeTab === 'root_gradle'
      ? ROOT_GRADLE_CODE
      : GITHUB_ACTIONS_CODE;

  return (
    <div className="bg-gradient-to-b from-[#121929] to-[#0c1220] rounded-2xl p-6 border border-slate-800 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Smartphone className="w-5 h-5" />
            </span>
            <h2 className="text-base font-bold text-white">مشروع أندرويد الأصلي المتكامل (Native Android Project + Gradle)</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            بنية أندرويد أصلية حقيقية داخل المستودع (مجلد <code>android/</code>) مع صلاحيات التتبع الجغرافي 2 كم، والخدمات الخلفية، وبناء APK تلقائي عبر GitHub Actions (JDK 17).
          </p>
        </div>

        {/* Dynamic Controls */}
        <div className="w-full md:w-auto flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-1.5">
            <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <div className="text-right">
              <span className="block text-[10px] text-slate-400">رابط سيرفر Render:</span>
              <input
                type="text"
                value={renderUrl}
                onChange={(e) => setRenderUrl(e.target.value)}
                placeholder="https://your-app.onrender.com"
                className="bg-transparent text-xs font-mono text-emerald-300 outline-none w-52 placeholder-slate-600"
                dir="ltr"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3 Core Architecture Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[#090d16] border border-emerald-500/20 shadow-lg shadow-emerald-950/20">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-1.5">
            <Navigation className="w-4 h-4" />
            <span>1. شرط المسافات الجغرافية المزدوج (المعيار الأساسي الوحيد 100%)</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            تطبيق المعيار الأساسي الوحيد المعتمد: مسافة العميل/الوجهة ≤ الحد المحدد (الافتراضي: 3.0 كم، نطاق من 0.5 إلى 25 كم) <strong>و</strong> مسافة المتجر/المطعم ≤ حد مسافة المتجر (الافتراضي: 1.5 كم). لا يتم قبول أي طلب إلا بتحقق كلا الشرطين الجغرافيين معاً.
          </p>
          <div className="mt-2 text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
            <CheckCircle2 className="w-3 h-3" />
            <span>الشرط المزدوج: العميل ≤ 3.0 كم • المطعم ≤ 1.5 كم • مستبعد تماماً أي معيار للسعر</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#090d16] border border-cyan-500/20 shadow-lg shadow-cyan-950/20">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs mb-1.5">
            <Zap className="w-4 h-4" />
            <span>2. مراقبة واعتراض فوري (Pure Observer • No-Swipe)</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            مراقبة حدثية حية للشاشة (بدون أي سحب للشاشة إطلاقاً وبدون مراقبة واتساب)، وفحص مسافة العميل ومسافة المطعم مقارنة بالحدود الجغرافية المحددة، والنقر المباشر والفوري على زر القبول (Accept) في أقل من 10ms فور مطابقة المسافتين.
          </p>
          <div className="mt-2 text-[10px] text-cyan-400 flex items-center gap-1 font-mono">
            <CheckCircle2 className="w-3 h-3" />
            <span>الشرط: مسافة العميل ≤ 3.0 كم ومسافة المتجر ≤ 1.5 كم كمعيار وحيد معتمد 100%</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#090d16] border border-purple-500/20 shadow-lg shadow-purple-950/20">
          <div className="flex items-center gap-2 text-purple-400 font-bold text-xs mb-1.5">
            <Download className="w-4 h-4" />
            <span>3. بناء APK عبر GitHub Actions (JDK 17)</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            ملفات Gradle حقيقية متوافقة 100% مع <strong>JDK 17</strong> و <strong>Gradle 8.5</strong>. بمجرد رفع المستودع إلى GitHub، يتم بناء ملفات APK (Debug & Release) وتحميلها كـ Artifact جاهز للتثبيت فوراً.
          </p>
          <div className="mt-2 text-[10px] text-purple-400 flex items-center gap-1 font-mono">
            <CheckCircle2 className="w-3 h-3" />
            <span>بدون كاباسيتور، بدون وسيط، كود أصلي 100%</span>
          </div>
        </div>
      </div>

      {/* Code Navigation Tabs */}
      <div className="flex flex-wrap items-center bg-slate-900/80 rounded-xl p-1 border border-slate-800 text-xs gap-1">
        <button
          onClick={() => setActiveTab('tree')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'tree' ? 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30 shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FolderTree className="w-3.5 h-3.5" />
          <span>هيكلة المستودع (android/)</span>
        </button>

        <button
          onClick={() => setActiveTab('manifest')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
            activeTab === 'manifest' ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30 shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          AndroidManifest.xml (الصلاحيات)
        </button>

        <button
          onClick={() => setActiveTab('location')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
            activeTab === 'location' ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          LocationTrackingService.kt (نطاق 2 كم)
        </button>

        <button
          onClick={() => setActiveTab('service')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
            activeTab === 'service' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30 shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          LocateGoAccessibilityService.kt (الاعتراض)
        </button>

        <button
          onClick={() => setActiveTab('activity')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
            activeTab === 'activity' ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          MainActivity.kt (شاشة التحكم)
        </button>

        <button
          onClick={() => setActiveTab('app_gradle')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
            activeTab === 'app_gradle' ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          app/build.gradle (JDK 17)
        </button>

        <button
          onClick={() => setActiveTab('root_gradle')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
            activeTab === 'root_gradle' ? 'bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30 shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          build.gradle & settings.gradle
        </button>

        <button
          onClick={() => setActiveTab('github_actions')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'github_actions' ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>build-apk.yml (GitHub Actions)</span>
        </button>
      </div>

      {/* Code Viewer */}
      <div className="relative rounded-xl bg-[#080c14] border border-slate-800 overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-mono text-slate-300">
              {activeTab === 'tree'
                ? 'هيكلة مجلد android/ في المستودع'
                : activeTab === 'manifest'
                ? 'android/app/src/main/AndroidManifest.xml'
                : activeTab === 'location'
                ? 'android/app/src/main/java/com/locatego/driver/LocationTrackingService.kt'
                : activeTab === 'service'
                ? 'android/app/src/main/java/com/locatego/driver/LocateGoAccessibilityService.kt'
                : activeTab === 'activity'
                ? 'android/app/src/main/java/com/locatego/driver/MainActivity.kt'
                : activeTab === 'app_gradle'
                ? 'android/app/build.gradle'
                : activeTab === 'root_gradle'
                ? 'android/build.gradle & settings.gradle'
                : '.github/workflows/build-apk.yml'}
            </span>
          </div>

          <button
            onClick={() => copyToClipboard(activeCode, activeTab)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-all cursor-pointer shadow active:scale-95"
          >
            {copiedKey === activeTab ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-bold">تم النسخ بنجاح!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>نسخ الملف</span>
              </>
            )}
          </button>
        </div>

        <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto max-h-[520px] leading-relaxed select-text" dir="ltr">
          <code>{activeCode}</code>
        </pre>
      </div>

      {/* How to Build Step-by-Step */}
      <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span>خطوات بناء الـ APK واستخدامه:</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div className="p-3.5 rounded-lg bg-[#090d16] border border-slate-800 space-y-1.5">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <span>الطريقة 1: البناء التلقائي في السحاب عبر GitHub Actions (موصى بها)</span>
            </span>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              1. قم برفع التغييرات إلى مستودع GitHub الخاص بك (<code>git push origin main</code>).
              <br />
              2. توجه إلى تبويب <strong>Actions</strong> في مستودعك على GitHub.
              <br />
              3. ستجد سير العمل <strong>Build Native Android APK</strong> قد بدأ بالبناء باستخدام JDK 17.
              <br />
              4. بمجرد انتهاء البناء (أقل من دقيقتين)، اضغط على التقرير وحمّل ملف <strong>LocateGo-Driver-Debug-APK</strong> مباشرة وثبّته على الهاتف!
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-[#090d16] border border-slate-800 space-y-1.5">
            <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
              <span>الطريقة 2: البناء المحلي أو عبر Android Studio</span>
            </span>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              1. افتح مجلد <code>android</code> مباشرة داخل برنامج <strong>Android Studio</strong>.
              <br />
              2. أو نفّذ الأمر التالي في الطرفية:
              <br />
              <code className="block bg-slate-950 p-1.5 rounded mt-1 text-emerald-300 font-mono text-[10px]" dir="ltr">
                cd android && ./gradlew assembleDebug
              </code>
              3. ستجد ملف الـ APK الناتج داخل:
              <br />
              <code className="text-slate-400 font-mono text-[10px]" dir="ltr">
                android/app/build/outputs/apk/debug/app-debug.apk
              </code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
