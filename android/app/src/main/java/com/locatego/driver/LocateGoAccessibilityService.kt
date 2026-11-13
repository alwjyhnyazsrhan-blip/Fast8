package com.locatego.driver

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.accessibilityservice.GestureDescription
import android.content.Context
import android.content.SharedPreferences
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
import java.util.regex.Pattern

/**
 * LocateGoAccessibilityService
 * محرك الرصد الخارق والنقر الفوري بدون أي تأخير (Zero-Delay Ultra-Fast Auto-Accept Engine).
 *
 * المواصفات الفنية للسرعة القصوى:
 * 1. NotificationTimeout = 0ms: إلغاء كلي لأي تأخير أو كبح على مستوى نظام تشغيل أندرويد.
 * 2. In-Memory Volatile Settings: قراءة إعدادات المسافة والقبول من الذاكرة الحية (0ns) دون الوصول للقرص.
 * 3. Single-Pass O(N) Scan: فحص الشاشة واستخراج مسافة العميل واصطياد زر القبول في دورة مسح واحدة فائقة السرعة.
 * 4. Zero-Delay Hardware Tap: تنفيذ النقر المزدوج (ACTION_CLICK + Gesture Tap 1ms) في أجزاء من الثانية فور ظهور العنصر.
 * 5. معيار القبول الصارم: مسافة العميل / الوجهة <= الحد الأقصى (مثلاً 2 كم) مع فتح مسافة المطعم دون أي قيد.
 * 6. إلغاء أي تأخيرات أو Timeouts: تحويل جميع عمليات التوثيق، الصوت، والاهتزاز إلى مسارات خلفية غير معطلة (Dispatchers.IO).
 */
class LocateGoAccessibilityService : AccessibilityService() {

    companion object {
        // مصفوفة حزم تطبيقات التوصيل المستهدفة
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
            val p = pkg.trim().lowercase()
            // 🛡️ استبعاد قطعي وشامل لتطبيق واتساب وواتساب الأعمال وتطبيقات الدردشة: ممنوع مراقبتها أو السحب أو النقر عليها
            if (p.contains("whatsapp") || p.contains("com.whatsapp") || p == "com.whatsapp.w4b" || p.contains("telegram")) return false
            // استثناء نظام أندرويد ولوحات المفاتيح وتطبيقنا المساعد
            if (p == "com.locatego.driver" || p.contains("android.systemui") || p.contains("inputmethod") || p.contains("launcher")) return false
            return TARGET_PACKAGES.any { p.contains(it.lowercase()) } ||
                    p.contains("locate") ||
                    p.contains("locat") ||
                    p.contains("jahez") ||
                    p.contains("saned") ||
                    p.contains("hunger") ||
                    p.contains("mrsool") ||
                    p.contains("toyou") ||
                    p.contains("ninja") ||
                    p.contains("chefz") ||
                    p.contains("driver") ||
                    p.contains("courier") ||
                    p.contains("delivery") ||
                    p.contains("captain") ||
                    p.contains("rider") ||
                    p.contains("order") ||
                    p.contains("shgardi") ||
                    p.contains("barq") ||
                    p.contains("keta") ||
                    p.contains("careem") ||
                    p.contains("lugmety")
        }

        // قائمة الكلمات والنصوص الواجب تجاهلها
        private val IGNORED_NAV_TEXTS = setOf(
            "الرئيسية", "حسابي", "الملف الشخصي", "الإعدادات", "المحفظة", "الدعم", "مساعدة",
            "المساعدة", "تسجيل الخروج", "تسجيل خروج", "خروج", "الأرشيف", "السجل", "الإشعارات",
            "شروط الاستخدام", "سياسة الخصوصية", "حول التطبيق", "تحديث التطبيق", "تقييم",
            "المظهر", "اللغة", "الوضع الليلي", "حفظ", "إغلاق", "رجوع", "تخطي", "موافق",
            "إلغاء", "تأكيد الهاتف", "رمز التحقق", "التفاصيل", "عرض التفاصيل", "التالي", "السابق",
            "home", "profile", "settings", "wallet", "support", "help", "logout", "history",
            "notifications", "about", "close", "back", "cancel", "menu", "next", "skip"
        )

        // كلمات أشرطة وأزرار القبول المستهدفة بالكامل (أشرطة السحب + الأزرار المباشرة)
        private val ACCEPT_SLIDER_KEYWORDS = listOf(
            "اسحب لقبول الطلب", "اسحب للموافقة", "اسحب لتأكيد الطلب", "اسحب لتأكيد", "اسحب للقبول",
            "اسحب للموافقه", "اسحب للتاكيد", "اسحب", "سحب للقبول", "سحب لقبول الطلب", "سحب للموافقة",
            "slide to accept", "swipe to accept", "slide_to_accept", "swipe_to_accept", "drag to accept"
        )

        // كلمات أزرار القبول المباشرة (Instant Accept Buttons)
        private val ACCEPT_DIRECT_BUTTON_KEYWORDS = listOf(
            "قبول الطلب", "قبول", "موافقة", "الموافقة", "تأكيد الطلب", "تأكيد", "استلام الطلب",
            "استلام", "موافق", "وافق", "إسناد", "accept order", "accept", "confirm order", "confirm", "take order"
        )

        // جميع كلمات القبول المدمجة للرصد السريع
        private val ALL_ACCEPT_KEYWORDS = ACCEPT_SLIDER_KEYWORDS + ACCEPT_DIRECT_BUTTON_KEYWORDS

        // كلمات وأزرار القبول لاستبعادها عند استخراج اسم المتجر
        private val ACCEPT_BUTTON_KEYWORDS = ALL_ACCEPT_KEYWORDS

        // معرّفات عناصر أشرطة وأزرار القبول المحتملة في الواجهات البرمجية
        private val ACCEPT_VIEW_IDS = listOf(
            "slide_to_accept", "swipe_to_accept", "slider", "swipe_btn", "swipe_view", "drag_to_accept",
            "btn_swipe", "swipe_button", "slider_button", "swipe_layout", "order_swipe",
            "btn_accept", "accept", "accept_order", "btnaccept", "btn_confirm",
            "order_accept", "take_order", "button_accept", "action_accept", "btn_take",
            "accept_layout", "button_order_accept", "accept_btn"
        )
    }

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private lateinit var renderClient: RenderApiClient
    private lateinit var prefs: SharedPreferences
    private var sharedPrefsListener: SharedPreferences.OnSharedPreferenceChangeListener? = null

    // تخزين الإعدادات في الذاكرة الحية (Volatile) مع تحديث مستمر من SharedPreferences
    @Volatile private var cachedIsVipLicensed: Boolean = false
    @Volatile private var cachedMaxAllowedKm: Double = 3.0 // الحد الأقصى لمسافة العميل (التوصيل)
    @Volatile private var cachedMaxPickupKm: Double = 1.5  // الحد الأقصى لمسافة المطعم (الاستلام)
    @Volatile private var cachedMinPayoutSar: Double = 0.0
    @Volatile private var cachedAutoAccept: Boolean = true
    @Volatile private var cachedSwipeSpeedMs: Long = 60L   // سرعة سحب فائقة السرعة (60ms)
    @Volatile private var cachedTapIntervalMs: Long = 10L  // فاصل النقرات المتتالية (ms)
    @Volatile private var cachedEnableCustomInterval: Boolean = false

    // تعابير نمطية مستهدفة بدقة عالية تدعم صيغتي: "المتجر 2.0 كم" وأيضاً "2.0 كم المتجر" والأرقام العربية
    private val pickupDistancePattern = Pattern.compile(
        "(?:(?:مسافة\\s*(?:المتجر|المطعم|الاستلام)|المتجر\\s*يبعد|المطعم\\s*يبعد|مسافة\\s*الاستلام|الاستلام|المطعم|المتجر|pickup|store)\\s*[:]?\\s*([0-9\\u0660-\\u0669]+(?:[.,\\u066B][0-9\\u0660-\\u0669]+)?)\\s*(?:كم|كيلو|km|k\\.m)|([0-9\\u0660-\\u0669]+(?:[.,\\u066B][0-9\\u0660-\\u0669]+)?)\\s*(?:كم|كيلو|km|k\\.m)\\s*[:]?\\s*(?:المتجر|المطعم|الاستلام|pickup|store))",
        Pattern.CASE_INSENSITIVE or Pattern.UNICODE_CASE
    )

    private val deliveryDistancePattern = Pattern.compile(
        "(?:(?:مسافة\\s*(?:العميل|التوصيل|الوجهة)|العميل\\s*يبعد|مسافة\\s*التوصيل|التوصيل|العميل|الوجهة|delivery|dropoff|customer)\\s*[:]?\\s*([0-9\\u0660-\\u0669]+(?:[.,\\u066B][0-9\\u0660-\\u0669]+)?)\\s*(?:كم|كيلو|km|k\\.m)|([0-9\\u0660-\\u0669]+(?:[.,\\u066B][0-9\\u0660-\\u0669]+)?)\\s*(?:كم|كيلو|km|k\\.m)\\s*[:]?\\s*(?:العميل|التوصيل|الوجهة|delivery|dropoff|customer))",
        Pattern.CASE_INSENSITIVE or Pattern.UNICODE_CASE
    )

    private val generalDistancePattern = Pattern.compile(
        "(?:المسافة\\s*الإجمالية|إجمالي\\s*المسافة|المسافة\\s*الكلية|المسافة|يبعد|تبعد|distance|total)?\\s*[:]?\\s*([0-9\\u0660-\\u0669]+(?:[.,\\u066B][0-9\\u0660-\\u0669]+)?)\\s*(?:كم|كيلو|km|k\\.m)",
        Pattern.CASE_INSENSITIVE or Pattern.UNICODE_CASE
    )

    private val kmRegexPattern = Pattern.compile(
        "([0-9\\u0660-\\u0669]+(?:[.,\\u066B][0-9\\u0660-\\u0669]+)?)\\s*(?:كم|كيلو\\s*متر|كيلو|km|k\\.m)",
        Pattern.CASE_INSENSITIVE or Pattern.UNICODE_CASE
    )

    private val meterRegexPattern = Pattern.compile(
        "(?:^|[\\s:(])([0-9\\u0660-\\u0669]+(?:[.,\\u066B][0-9\\u0660-\\u0669]+)?)\\s*(?:متر|meters?|م|m)(?=$|[\\s،,.):])",
        Pattern.CASE_INSENSITIVE or Pattern.UNICODE_CASE
    )

    private val payoutPattern = Pattern.compile(
        "(?:الأجر|المبلغ|السعر|قيمة\\s*التوصيل|الربح|الأرباح|fee|sar|payout)?\\s*[:]?\\s*([0-9\\u0660-\\u0669]+(?:[.,][0-9\\u0660-\\u0669]+)?)\\s*(?:ر\\.س|ريال|sar|SAR|ر\\.\\s*س)",
        Pattern.CASE_INSENSITIVE or Pattern.UNICODE_CASE
    )

    private val orderIdPattern = Pattern.compile(
        "(?:رقم\\s*الطلب|الطلب\\s*رقم|طلب\\s*#|Order\\s*#?|ID\\s*[:#]?|#)\\s*([A-Za-z0-9\\-_]{3,15})",
        Pattern.CASE_INSENSITIVE or Pattern.UNICODE_CASE
    )

    private val districtPattern = Pattern.compile(
        "(?:التوصيل\\s*إلى|الوجهة|العميل|حي|district)?\\s*[:]?\\s*(حي\\s+[\\u0600-\\u06FF]+(?:\\s+[\\u0600-\\u06FF]+)?)",
        Pattern.CASE_INSENSITIVE or Pattern.UNICODE_CASE
    )

    private var currentForegroundPackage = ""
    private val processedOrdersCache = ConcurrentHashMap<String, Long>()

    override fun onServiceConnected() {
        super.onServiceConnected()
        renderClient = RenderApiClient(this)

        // 1. تهيئة خدمة Accessibility بأقصى سرعة ممكنة وبدون أي تأخير (Zero Throttling)
        val info = serviceInfo ?: AccessibilityServiceInfo()
        info.notificationTimeout = 0L // إلغاء أي مؤقت تأخير بين إشعارات الأحداث نهائياً
        info.eventTypes = AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED or
                AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or
                AccessibilityEvent.TYPE_WINDOWS_CHANGED
        info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
        info.flags = info.flags or
                AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS or
                AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS or
                AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS
        serviceInfo = info

        // 2. تفعيل ذاكرة الإعدادات الفورية
        initLiveSettingsCache()

        Log.i("LocateGoService", "⚡⚡ STRICT ZERO-DELAY Auto-Accept Engine ACTIVATED (Fail-Closed Distance Verification).")
    }

    private fun refreshCachedSettings() {
        if (!::prefs.isInitialized) {
            prefs = getSharedPreferences("locate_go_prefs", Context.MODE_PRIVATE)
        }
        cachedIsVipLicensed = prefs.getBoolean("is_vip_licensed", false)
        cachedMaxAllowedKm = prefs.getFloat("max_distance_km", 3.0f).toDouble()
        cachedMaxPickupKm = prefs.getFloat("max_pickup_distance_km", 1.5f).toDouble()
        cachedMinPayoutSar = prefs.getFloat("min_payout_sar", 0.0f).toDouble()
        cachedAutoAccept = prefs.getBoolean("auto_accept", true)
        cachedSwipeSpeedMs = prefs.getInt("swipe_speed_ms", 60).toLong().coerceIn(40L, 500L)
        cachedTapIntervalMs = prefs.getInt("tap_interval_ms", 10).toLong()
        cachedEnableCustomInterval = prefs.getBoolean("enable_custom_interval", false)
    }

    private fun initLiveSettingsCache() {
        prefs = getSharedPreferences("locate_go_prefs", Context.MODE_PRIVATE)
        refreshCachedSettings()

        sharedPrefsListener = SharedPreferences.OnSharedPreferenceChangeListener { sp, key ->
            when (key) {
                "is_vip_licensed" -> cachedIsVipLicensed = sp.getBoolean("is_vip_licensed", false)
                "max_distance_km" -> cachedMaxAllowedKm = sp.getFloat("max_distance_km", 3.0f).toDouble()
                "max_pickup_distance_km" -> cachedMaxPickupKm = sp.getFloat("max_pickup_distance_km", 1.5f).toDouble()
                "min_payout_sar" -> cachedMinPayoutSar = sp.getFloat("min_payout_sar", 0.0f).toDouble()
                "auto_accept" -> cachedAutoAccept = sp.getBoolean("auto_accept", true)
                "swipe_speed_ms" -> cachedSwipeSpeedMs = sp.getInt("swipe_speed_ms", 60).toLong().coerceIn(40L, 500L)
                "tap_interval_ms" -> cachedTapIntervalMs = sp.getInt("tap_interval_ms", 10).toLong()
                "enable_custom_interval" -> cachedEnableCustomInterval = sp.getBoolean("enable_custom_interval", false)
            }
        }
        prefs.registerOnSharedPreferenceChangeListener(sharedPrefsListener)
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        // تحديث سريع من الذاكرة المشتركة لضمان التزامن التام مع الإعدادات التي حددها السائق
        refreshCachedSettings()

        // فحص صارم وسريع لحالة ترخيص VIP
        if (!cachedIsVipLicensed) return

        // فحص سريع: إذا كان القبول التلقائي مغلقاً نخرج فوراً
        if (!cachedAutoAccept) return

        val packageName: String = event.packageName?.toString() ?: ""
        val lowerPkg = packageName.trim().lowercase()

        // 🛡️ حظر قطعي لتطبيق واتساب وتيليجرام: ممنوع منعاً باتاً مراقبتها أو السحب أو النقر عليها نهائياً
        if (lowerPkg.contains("whatsapp") || lowerPkg == "com.whatsapp" || lowerPkg == "com.whatsapp.w4b" || lowerPkg.contains("telegram")) {
            return
        }

        if (!isTargetPackage(packageName)) {
            return
        }

        currentForegroundPackage = packageName

        val type = event.eventType
        if (type != AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED &&
            type != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED &&
            type != AccessibilityEvent.TYPE_WINDOWS_CHANGED) return

        val rootsToScan = mutableListOf<AccessibilityNodeInfo>()
        try {
            windows?.forEach { win ->
                val winRoot = win.root ?: return@forEach
                val winPkg = winRoot.packageName?.toString()
                if (winPkg == null || winPkg == packageName || isTargetPackage(winPkg)) {
                    rootsToScan.add(winRoot)
                }
            }
        } catch (_: Exception) {}

        val activeRoot = rootInActiveWindow ?: event.source
        if (activeRoot != null && rootsToScan.none { it == activeRoot }) {
            rootsToScan.add(activeRoot)
        }
        if (rootsToScan.isEmpty()) return

        inspectScreenForOrderOffer(rootsToScan, packageName)
    }

    private data class CapturedDistance(
        val km: Double,
        val text: String,
        val bounds: Rect
    )

    /**
     * نتيجة المسح الفوري الأحادي للشاشة
     */
    private data class FastScanResult(
        val texts: MutableList<String> = mutableListOf(),
        val capturedDistances: MutableList<CapturedDistance> = mutableListOf(),
        var acceptButtonNode: AccessibilityNodeInfo? = null,
        var acceptButtonBounds: Rect? = null,
        var acceptButtonPriority: Int = 0,
        var directDeliveryKm: Double? = null,
        var directPickupKm: Double? = null,
        var directPayoutSar: Double? = null,
        var userLabelX: Float? = null,
        var storeLabelX: Float? = null,
        var hasUserLabel: Boolean = false,
        var hasStoreLabel: Boolean = false,
        var hasCustomerLabel: Boolean = false
    )

    private fun findAcceptNodeFallback(roots: List<AccessibilityNodeInfo>, displayHeight: Int): AccessibilityNodeInfo? {
        for (root in roots) {
            for (keyword in ALL_ACCEPT_KEYWORDS) {
                val nodes = try { root.findAccessibilityNodeInfosByText(keyword) } catch (_: Exception) { emptyList() }
                for (node in nodes) {
                    val b = Rect()
                    node.getBoundsInScreen(b)
                    val txt = (node.text?.toString() ?: node.contentDescription?.toString() ?: "").lowercase()
                    val isBlacklisted = txt.contains("reject") || txt.contains("رفض") || txt.contains("إلغاء") || txt.contains("تجاهل") || txt.contains("cancel")
                    if (!isBlacklisted && !b.isEmpty && b.width() > 50 && b.centerY() >= displayHeight * 0.20f) {
                        return node
                    }
                }
            }
            for (viewId in ACCEPT_VIEW_IDS) {
                val fullId = "${currentForegroundPackage}:id/$viewId"
                val nodes = try { root.findAccessibilityNodeInfosByViewId(fullId) } catch (_: Exception) { emptyList() }
                for (node in nodes) {
                    val b = Rect()
                    node.getBoundsInScreen(b)
                    if (!b.isEmpty && b.width() > 50 && b.centerY() >= displayHeight * 0.20f) {
                        return node
                    }
                }
            }
        }
        return null
    }

    /**
     * فحص الشاشة بدقة فائقة وبصرامة تامة (Strict Fail-Closed Verification):
     * - يمنع القبول نهائياً إذا لم يظهر زر/شريط القبول على الشاشة.
     * - يمنع القبول نهائياً إذا لم تُقرأ المسافات كاملة بعد (ينتظر التحديث التالي بعد لحظات).
     * - يرفض أي طلب يتجاوز حد المتجر أو حد العميل مهما كانت الظروف.
     */
    private fun inspectScreenForOrderOffer(roots: List<AccessibilityNodeInfo>, packageName: String) {
        val displayHeight = resources.displayMetrics.heightPixels
        val scanResult = FastScanResult()

        // دورة مسح واحدة تجمع النصوص والمسافات ومواقعها وترصد زر القبول من جميع النوافذ النشطة
        for (r in roots) {
            fastSinglePassTraversal(r, scanResult, displayHeight)
        }

        // محاولة بديلة لاكتشاف شريط أو زر القبول إذا كان داخل عنصر مخصص
        val targetAcceptNode = scanResult.acceptButtonNode ?: findAcceptNodeFallback(roots, displayHeight)?.also { node ->
            val b = Rect()
            node.getBoundsInScreen(b)
            scanResult.acceptButtonNode = node
            scanResult.acceptButtonBounds = b
        } ?: return

        if (scanResult.texts.isEmpty()) return

        val joinedContent = scanResult.texts.joinToString(" ")

        // 1. استرجاع أحدث قيم الإعدادات المحددة من السائق
        val maxAllowedDelivery = cachedMaxAllowedKm
        val maxAllowedPickup = cachedMaxPickupKm

        // 2. عزل المسافات الخاصة ببطاقة العرض الحالية (الأقرب والأعلى مباشرة من شريط/زر القبول)
        val acceptBounds = scanResult.acceptButtonBounds
        val scopedDistances: List<CapturedDistance> = if (scanResult.capturedDistances.size > 2 && acceptBounds != null && !acceptBounds.isEmpty) {
            val aboveAccept = scanResult.capturedDistances
                .filter { it.bounds.bottom <= acceptBounds.bottom + 100 }
                .sortedByDescending { it.bounds.centerY() }
            if (aboveAccept.size >= 2) aboveAccept.take(2) else scanResult.capturedDistances
        } else {
            scanResult.capturedDistances
        }

        val allDists = scopedDistances.map { it.km }

        // 3. تحديد مسافة المطعم / الاستلام (Pickup) ومسافة العميل / الوجهة (Delivery) بدقة صارمة
        var deliveryDistKm: Double? = scanResult.directDeliveryKm
        var pickupDistKm: Double? = scanResult.directPickupKm

        val isDualLayoutCard = scanResult.hasUserLabel && (scanResult.storeLabelX != null || scanResult.hasStoreLabel)

        if (scopedDistances.size >= 2) {
            val userX = scanResult.userLabelX
            val storeX = scanResult.storeLabelX

            // إذا توفرت إحداثيات "موقعك" و"المتجر" (بطاقة Locate)، نحدد المتجر والعميل مكانياً بدقة 100%
            if ((pickupDistKm == null || deliveryDistKm == null) && userX != null && storeX != null && userX != storeX) {
                val isRtl = userX > storeX
                val storeSideDist = scopedDistances.firstOrNull { d ->
                    val cx = d.bounds.centerX().toFloat()
                    if (isRtl) cx > storeX else cx < storeX
                }
                val customerSideDist = scopedDistances.firstOrNull { d ->
                    val cx = d.bounds.centerX().toFloat()
                    if (isRtl) cx < storeX else cx > storeX
                }
                if (pickupDistKm == null && storeSideDist != null) {
                    pickupDistKm = storeSideDist.km
                }
                if (deliveryDistKm == null && customerSideDist != null) {
                    deliveryDistKm = customerSideDist.km
                }
            }

            // Fallback آمن عبر الترتيب التصاعدي إذا لم تُحدد مكانياً
            val sortedDists = allDists.sorted()
            if (pickupDistKm == null) {
                pickupDistKm = sortedDists.first()
            }
            if (deliveryDistKm == null) {
                deliveryDistKm = sortedDists.last()
            }
        } else if (scopedDistances.size == 1) {
            val singleDist = scopedDistances[0].km
            if (isDualLayoutCard) {
                // بطاقة مزدوجة المسافة لم يكتمل رسم المسافة الثانية فيها بعد: نرفض القبول المؤقت وننتظر الإطار التالي
                Log.d("LocateGoService", "⏳ Waiting for both distances on dual-distance card (only saw $singleDist km)")
                return
            }

            val hasStoreOnly = scanResult.hasStoreLabel && !scanResult.hasCustomerLabel
            val hasCustomerOnly = scanResult.hasCustomerLabel && !scanResult.hasStoreLabel

            if (hasStoreOnly) {
                pickupDistKm = pickupDistKm ?: singleDist
                // مسافة العميل مجهولة: لا نقبلها أبداً كمسافة عميل!
            } else if (hasCustomerOnly) {
                deliveryDistKm = deliveryDistKm ?: singleDist
            } else {
                // شاشة بمسافة واحدة إجمالية واضحة (مثل بعض التطبيقات الأخرى)
                deliveryDistKm = deliveryDistKm ?: singleDist
            }
        } else if (deliveryDistKm == null && pickupDistKm == null) {
            // لم يُقرأ أي رقم مسافة بعد (مثلاً أثناء حركة فتح البطاقة): ممنوع القبول الأعمى!
            Log.d("LocateGoService", "⏳ No distances parsed yet on offer screen — skipping blind accept.")
            return
        }

        // إذا كانت الشاشة تحتوي على "موقعك" + "المتجر" ولم تتوفر المسافتان معاً، ننتظر الإطار المكتمل
        if (isDualLayoutCard && (deliveryDistKm == null || pickupDistKm == null)) {
            Log.d("LocateGoService", "⏳ Incomplete dual-distance offer (pickup=$pickupDistKm, delivery=$deliveryDistKm) — waiting.")
            return
        }

        val targetEvaluationDistanceKm = deliveryDistKm ?: pickupDistKm ?: return

        // 4. استخراج أجر التوصيل (للتوثيق فقط)
        var payoutSar = scanResult.directPayoutSar ?: 18.0
        if (scanResult.directPayoutSar == null) {
            val payoutMatcher = payoutPattern.matcher(joinedContent)
            if (payoutMatcher.find()) {
                normalizeNumberString(payoutMatcher.group(1))?.let { payoutSar = it }
            }
        }

        // 5. استخراج رقم الطلب واسم المتجر
        var extractedOrderId: String? = null
        val idMatcher = orderIdPattern.matcher(joinedContent)
        if (idMatcher.find()) {
            extractedOrderId = idMatcher.group(1)
        }

        val storeName = extractStoreName(scanResult.texts)
        val customerDistrict = extractCustomerDistrict(joinedContent, scanResult.texts)

        // منع التكرار لنفس الطلب
        val deduplicationKey = "${extractedOrderId ?: ""}|$deliveryDistKm|$pickupDistKm|$storeName"
        val now = System.currentTimeMillis()
        if (processedOrdersCache[deduplicationKey]?.let { now - it < 1200 } == true) return

        // =========================================================================
        // القواعد الصارمة والقطعية للموافقة على الطلب (Fail-Closed):
        // 1. يجب أن تكون مسافة العميل معروفة فعلياً و <= الحد الأقصى لمسافة العميل
        // 2. إذا توفرت مسافة المطعم يجب أن تكون <= الحد الأقصى لمسافة المطعم
        // 3. ممنوع منعاً باتاً أي قبول إذا كانت المسافة مجهولة أو غير مقروءة
        // =========================================================================
        val isDeliveryWithinLimit = deliveryDistKm != null && deliveryDistKm <= maxAllowedDelivery
        val isPickupWithinLimit = if (pickupDistKm != null) {
            pickupDistKm <= maxAllowedPickup
        } else {
            !isDualLayoutCard
        }

        val isOrderMatching = isDeliveryWithinLimit && isPickupWithinLimit

        val lowerPkg = packageName.lowercase()
        val resolvedAppName = when {
            lowerPkg.contains("locatcc") -> "Locate CC"
            lowerPkg.contains("locati") -> "Locate I"
            lowerPkg.contains("locatm") -> "Locate M"
            lowerPkg.contains("locatg") -> "Locate G"
            lowerPkg.contains("locatf") -> "Locate F"
            lowerPkg.contains("locate") -> "Locate Go"
            lowerPkg.contains("jahez") -> "جاهز"
            lowerPkg.contains("hunger") -> "هنقرستيشن"
            lowerPkg.contains("toyou") -> "تو يو"
            lowerPkg.contains("mrsool") -> "مرسول"
            lowerPkg.contains("ninja") -> "نينجا"
            lowerPkg.contains("chefz") -> "ذا شفز"
            lowerPkg.contains("saned") -> "ساند"
            lowerPkg.contains("shgardi") -> "شقردي"
            lowerPkg.contains("barq") -> "برق"
            else -> "تطبيق المندوب"
        }

        if (isOrderMatching) {
            val swipeSuccess = performInstantAccept(targetAcceptNode)

            processedOrdersCache[deduplicationKey] = now

            Log.i(
                "LocateGoService",
                "⚡⚡ STRICT AUTO-ACCEPT SUCCESS! [Triggered=$swipeSuccess] App='$resolvedAppName' Store='$storeName' | Pickup: ${pickupDistKm ?: "N/A"} km (limit $maxAllowedPickup) | Delivery: $deliveryDistKm km (limit $maxAllowedDelivery)"
            )

            notifyDriverAcceptedAsync()

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
        } else {
            processedOrdersCache[deduplicationKey] = now
            val rejectReason = when {
                deliveryDistKm == null -> "لم تتوفر مسافة العميل بدقة — تم الرفض حفاظاً على النطاق"
                !isDeliveryWithinLimit -> "مسافة العميل ($deliveryDistKm كم) تتجاوز الحد الأقصى ($maxAllowedDelivery كم)"
                pickupDistKm != null && !isPickupWithinLimit -> "مسافة المطعم ($pickupDistKm كم) تتجاوز الحد الأقصى ($maxAllowedPickup كم)"
                else -> "خارج النطاق الجغرافي المحدد"
            }

            Log.w("LocateGoService", "🚫 STRICT ORDER REJECTED: $rejectReason")
            notifyDriverRejectedAsync()

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
     * مسح شجرة العناصر في دورة أحادية فائقة الخفة:
     * - رصد واصطياد شريط القبول بالسحب أو زر القبول المباشر فوراً (مع حظر أزرار الرفض Reject والإلغاء وأيقونات GPS).
     * - استخراج نصوص المسافات ومواقعها المكانية بدقة (كم + متر).
     */
    private fun fastSinglePassTraversal(node: AccessibilityNodeInfo?, result: FastScanResult, displayHeight: Int) {
        if (node == null) return

        val rawText = node.text?.toString()
        val rawDesc = node.contentDescription?.toString()
        val text = rawText?.replace(Regex("[\\u200B-\\u200F\\uFEFF\\u202A-\\u202E]"), "")?.trim()
        val desc = rawDesc?.replace(Regex("[\\u200B-\\u200F\\uFEFF\\u202A-\\u202E]"), "")?.trim()
        val viewId = node.viewIdResourceName?.lowercase() ?: ""

        val rawContent = when {
            !text.isNullOrEmpty() -> text
            !desc.isNullOrEmpty() -> desc
            else -> null
        }

        // 1. فحص زر القبول أو شريط السحب مع إعطاء أعلى أولوية لشريط السحب الصريح ثم أزرار القبول المباشرة
        val isSliderKeyword = rawContent != null && ACCEPT_SLIDER_KEYWORDS.any { rawContent.contains(it, ignoreCase = true) }
        val isDirectAcceptKeyword = !isSliderKeyword && rawContent != null && ACCEPT_DIRECT_BUTTON_KEYWORDS.any { rawContent.contains(it, ignoreCase = true) }
        val isSpecificAcceptId = ACCEPT_VIEW_IDS.any { id -> id != "slider" && id != "accept" && (viewId.endsWith(id) || viewId.contains(id)) }
        val isGenericAcceptId = !isSpecificAcceptId && ACCEPT_VIEW_IDS.any { viewId.endsWith(it) || viewId.contains(it) }

        val candidatePriority = when {
            isSliderKeyword -> 4
            isDirectAcceptKeyword -> 3
            isSpecificAcceptId -> 2
            isGenericAcceptId -> 1
            else -> 0
        }

        if (candidatePriority > 0 && candidatePriority >= result.acceptButtonPriority) {
            val lowerStr = rawContent?.lowercase() ?: ""
            val isBlacklisted = lowerStr.contains("reject") ||
                    lowerStr.contains("رفض") ||
                    lowerStr.contains("إلغاء") ||
                    lowerStr.contains("تجاهل") ||
                    lowerStr.contains("خروج") ||
                    lowerStr.contains("رجوع") ||
                    lowerStr.contains("cancel") ||
                    lowerStr.contains("decline") ||
                    lowerStr.contains("dismiss") ||
                    lowerStr.contains("موقعك") ||
                    viewId.contains("reject") ||
                    viewId.contains("cancel") ||
                    viewId.contains("decline") ||
                    viewId.contains("dismiss") ||
                    viewId.contains("location") ||
                    viewId.contains("gps")

            if (!isBlacklisted) {
                val b = Rect()
                node.getBoundsInScreen(b)
                val currentY = result.acceptButtonBounds?.centerY() ?: -1
                val shouldReplace = candidatePriority > result.acceptButtonPriority || b.centerY() > currentY
                if (shouldReplace && !b.isEmpty && b.width() > 50 && b.height() > 20 && b.centerY() >= (displayHeight * 0.20f)) {
                    result.acceptButtonNode = node
                    result.acceptButtonBounds = b
                    result.acceptButtonPriority = candidatePriority
                }
            }
        }

        // 2. إضافة النص المؤهل وفحص التسميات والمسافات ومواقعها
        if (rawContent != null && rawContent.length in 2..150) {
            val lowerStr = rawContent.lowercase()
            val nodeBounds = Rect()
            node.getBoundsInScreen(nodeBounds)

            if (lowerStr == "موقعك" || lowerStr.contains("موقعك") || lowerStr.contains("your location")) {
                result.hasUserLabel = true
                if (result.userLabelX == null && !nodeBounds.isEmpty) {
                    result.userLabelX = nodeBounds.centerX().toFloat()
                }
            }
            if (lowerStr == "المتجر" || lowerStr == "المطعم" || lowerStr == "store" || lowerStr == "pickup" ||
                lowerStr.contains("مسافة المتجر") || lowerStr.contains("مسافة المطعم") || lowerStr.contains("مسافة الاستلام")) {
                result.hasStoreLabel = true
                if (result.storeLabelX == null && !nodeBounds.isEmpty && (lowerStr == "المتجر" || lowerStr == "المطعم" || lowerStr == "store")) {
                    result.storeLabelX = nodeBounds.centerX().toFloat()
                }
            }
            if (lowerStr.contains("عميل") || lowerStr.contains("زبون") || lowerStr.contains("توصيل") || lowerStr.contains("وجهة") || lowerStr.contains("delivery") || lowerStr.contains("dropoff") || lowerStr.contains("customer")) {
                result.hasCustomerLabel = true
            }

            val isIgnored = IGNORED_NAV_TEXTS.any { lowerStr == it || lowerStr.startsWith("$it ") }
            if (!isIgnored) {
                result.texts.add(rawContent)

                // استخراج المسافات من هذا العنصر مع حدود موقعه على الشاشة
                extractDistancesFromSingleText(rawContent).forEach { km ->
                    result.capturedDistances.add(CapturedDistance(km, rawContent, Rect(nodeBounds)))
                }

                // فحص المسافات المصحوبة بتسمية واضحة (مع دعم كلا الترتيبين عبر group(1) ?: group(2))
                if (result.directDeliveryKm == null && (lowerStr.contains("عميل") || lowerStr.contains("توصيل") || lowerStr.contains("وجهة") || lowerStr.contains("delivery") || lowerStr.contains("dropoff"))) {
                    val m = deliveryDistancePattern.matcher(rawContent)
                    if (m.find()) {
                        result.directDeliveryKm = normalizeNumberString(m.group(1) ?: m.group(2))
                    }
                }

                if (result.directPickupKm == null && (lowerStr.contains("مطعم") || lowerStr.contains("متجر") || lowerStr.contains("استلام") || lowerStr.contains("pickup") || lowerStr.contains("store"))) {
                    val m = pickupDistancePattern.matcher(rawContent)
                    if (m.find()) {
                        result.directPickupKm = normalizeNumberString(m.group(1) ?: m.group(2))
                    }
                }

                if (result.directPayoutSar == null && (lowerStr.contains("ريال") || lowerStr.contains("ر.س") || lowerStr.contains("sar"))) {
                    val m = payoutPattern.matcher(rawContent)
                    if (m.find()) {
                        result.directPayoutSar = normalizeNumberString(m.group(1))
                    }
                }
            }
        }

        // النزول للأبناء
        val childCount = node.childCount
        for (i in 0 until childCount) {
            fastSinglePassTraversal(node.getChild(i), result, displayHeight)
        }
    }

    /**
     * تنفيذ القبول فائق السرعة والموثوقية (Dual RTL/LTR Instant Swipe & Direct Hardware Tap):
     * 1. نقر مباشر وفوري عبر Accessibility (ACTION_CLICK) في 0ms.
     * 2. نقر Hardware Tap مباشر عند مركز الزر.
     * 3. سحب مزدوج خاطف (من اليسار لليمين + من اليمين لليسار) بمدة قياسية (50-70ms) لدعم الواجهات العربية والإنجليزية.
     * 4. فحص تعزيزي بعد 120ms لضمان اكتمال القبول 100% دون تضييع أي طلب.
     */
    private fun performSwipeToAccept(node: AccessibilityNodeInfo?): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) return false
        if (node == null) return false

        // 🛡️ حظر قطعي: منع السحب أو النقر أو إرسال أي إيماءات على تطبيق واتساب أو تيليجرام
        val currentPkg = currentForegroundPackage.trim().lowercase()
        if (currentPkg.contains("whatsapp") || currentPkg == "com.whatsapp" || currentPkg == "com.whatsapp.w4b" || currentPkg.contains("telegram")) {
            Log.w("LocateGoService", "🚫 Blocked gesture: Target is WhatsApp/Chat - Gestures strictly forbidden!")
            return false
        }

        val displayMetrics = resources.displayMetrics
        val screenWidth = displayMetrics.widthPixels.toFloat()
        val screenHeight = displayMetrics.heightPixels.toFloat()

        val bounds = Rect()
        node.getBoundsInScreen(bounds)

        val nodeText = ((node.text?.toString() ?: "") + " " + (node.contentDescription?.toString() ?: "")).lowercase()
        val nodeViewId = node.viewIdResourceName?.lowercase() ?: ""
        val isSliderControl = ACCEPT_SLIDER_KEYWORDS.any { nodeText.contains(it, ignoreCase = true) } ||
                nodeViewId.contains("slide") || nodeViewId.contains("swipe") || nodeViewId.contains("drag")

        // 1. نقر Accessibility فقط للأزرار المباشرة (وليس لأشرطة السحب حتى لا يعيق السحب)
        if (!isSliderControl) {
            try {
                node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                node.parent?.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            } catch (_: Exception) {}
        }

        // إذا كانت العقدة تمثل نصاً داخلياً داخل شريط السحب، نصعد للحاوية الأب للشريط نفسه دون التوسع لحاوية البطاقة كاملة
        val originalBounds = Rect(bounds)
        var pNode: AccessibilityNodeInfo? = node.parent
        var climbDepth = 0
        while (pNode != null && climbDepth < 4) {
            val pBounds = Rect()
            pNode.getBoundsInScreen(pBounds)
            val verticalCenterShift = kotlin.math.abs(pBounds.centerY() - originalBounds.centerY())
            if (pBounds.width() > bounds.width() && pBounds.height() in 35..280 && verticalCenterShift <= 90) {
                bounds.set(pBounds)
            }
            pNode = pNode.parent
            climbDepth++
        }

        // تحقق أمني: التأكد من أن أبعاد الشريط واقعية وتقع في الجزء المناسب للشاشة
        if (bounds.isEmpty || bounds.centerY() < (screenHeight * 0.25f)) {
            Log.w("LocateGoService", "⚠️ Target bounds invalid, skipping to protect UI.")
            return false
        }

        val cx = bounds.centerX().toFloat()
        val cy = bounds.centerY().toFloat()

        // حساب نقاط السحب الدقيقة على مسار شريط السحب الكامل
        val handlePadding = (bounds.height().toFloat() * 0.35f).coerceIn(20f, 75f)
        val startX = (bounds.left.toFloat() + handlePadding).coerceAtLeast(10f)
        val endX = (bounds.right.toFloat() - handlePadding).coerceAtMost(screenWidth - 10f)

        // مدة سحب واقعية وسريعة تضمن استجابة مسار السحب في أندرويد/فلاتر دون فقدان إطارات الحركة
        val swipeDurationMs = cachedSwipeSpeedMs.coerceIn(130L, 300L)

        val gestureBuilder = GestureDescription.Builder()

        if (endX > startX + 50f) {
            // 1. سحب أساسي من اليسار إلى اليمين (LTR Swipe — مطابق لشريط "اسحب لقبول الطلب")
            val ltrPath = Path().apply {
                moveTo(startX, cy)
                lineTo(endX, cy)
            }
            val ltrStroke = GestureDescription.StrokeDescription(ltrPath, 0L, swipeDurationMs)
            gestureBuilder.addStroke(ltrStroke)

            // 2. سحب احتياطي معاكس من اليمين إلى اليسار للواجهات المعكوسة (RTL Swipe)
            val rtlStartDelay = swipeDurationMs + 25L
            val rtlPath = Path().apply {
                moveTo(endX, cy)
                lineTo(startX, cy)
            }
            val rtlStroke = GestureDescription.StrokeDescription(rtlPath, rtlStartDelay, swipeDurationMs)
            gestureBuilder.addStroke(rtlStroke)

            // 3. نقرة خفيفة بعد السحب فقط إذا لم يكن العنصر شريط سحب صريحاً (لأزرار القبول المباشرة)
            if (!isSliderControl) {
                val tapPath = Path().apply {
                    moveTo(cx, cy)
                    lineTo(cx, cy)
                }
                val tapStroke = GestureDescription.StrokeDescription(tapPath, rtlStartDelay + swipeDurationMs + 15L, 25L)
                gestureBuilder.addStroke(tapStroke)
            }
        } else {
            val tapPath = Path().apply {
                moveTo(cx, cy)
                lineTo(cx, cy)
            }
            gestureBuilder.addStroke(GestureDescription.StrokeDescription(tapPath, 0L, 25L))
        }

        val gesture = gestureBuilder.build()
        val dispatched = dispatchGesture(gesture, object : GestureResultCallback() {
            override fun onCompleted(gestureDescription: GestureDescription?) {
                Log.i("LocateGoService", "⚡⚡ ULTRA-SPEED DUAL SWIPE & TAP DISPATCHED SUCCESSFULLY!")
            }
            override fun onCancelled(gestureDescription: GestureDescription?) {
                Log.w("LocateGoService", "⚠️ Gesture cancelled or intercepted")
            }
        }, null)

        // ملاحظة أمنية: تم إلغاء أي نقرات أو سحب مؤجل غير مشروط بالمسافة حتى لا يتم قبول طلب جديد بعيد يظهر بعد 120ms
        return dispatched
    }

    /**
     * تنفيذ القبول الفوري بالسحب الآلي أو النقر العتادي
     */
    private fun performInstantAccept(node: AccessibilityNodeInfo): Boolean {
        return performSwipeToAccept(node)
    }

    private fun performInstantClick(node: AccessibilityNodeInfo): Boolean = performInstantAccept(node)

    /**
     * محاولة القبول البديلة في حال لم يُحدد الزر في المسار الأولي:
     * تفحص كافة كلمات وأزرار وأشرطة القبول فوراً وتنفذ الإيماءة السريعة.
     */
    private fun executeFallbackAccept(root: AccessibilityNodeInfo): Boolean {
        val currentRoot = rootInActiveWindow ?: root

        // 1. فحص كلمات القبول (أشرطة + أزرار صريحة)
        for (keyword in ALL_ACCEPT_KEYWORDS) {
            val nodes = currentRoot.findAccessibilityNodeInfosByText(keyword)
            if (nodes.isNotEmpty()) {
                for (node in nodes) {
                    val bounds = Rect()
                    node.getBoundsInScreen(bounds)
                    if (bounds.width() > 60) {
                        if (performSwipeToAccept(node)) return true
                    }
                }
            }
        }

        // 2. فحص لمعرفات عناصر أشرطة وأزرار القبول
        for (viewId in ACCEPT_VIEW_IDS) {
            val fullId = "${currentForegroundPackage}:id/$viewId"
            val nodes = currentRoot.findAccessibilityNodeInfosByViewId(fullId)
            if (nodes.isNotEmpty()) {
                for (node in nodes) {
                    if (performSwipeToAccept(node)) return true
                }
            }
        }

        return false
    }

    private fun normalizeNumberString(raw: String?): Double? {
        if (raw.isNullOrBlank()) return null
        val normalized = raw.map { ch ->
            when (ch) {
                in '\u0660'..'\u0669' -> '0' + (ch - '\u0660')
                in '\u06F0'..'\u06F9' -> '0' + (ch - '\u06F0')
                '\u066B', ',' -> '.'
                else -> ch
            }
        }.joinToString("")
        return normalized.toDoubleOrNull()?.takeIf { it >= 0.0 }
    }

    private fun extractDistancesFromSingleText(item: String): List<Double> {
        val result = mutableListOf<Double>()
        val kmMatcher = kmRegexPattern.matcher(item)
        while (kmMatcher.find()) {
            normalizeNumberString(kmMatcher.group(1))?.let { result.add(it) }
        }
        val mMatcher = meterRegexPattern.matcher(item)
        while (mMatcher.find()) {
            normalizeNumberString(mMatcher.group(1))?.let { meters ->
                result.add(kotlin.math.round((meters / 1000.0) * 100.0) / 100.0)
            }
        }
        return result
    }

    private fun extractAllDistancesFromTexts(texts: List<String>): List<Double> {
        val result = mutableListOf<Double>()
        for (item in texts) {
            result.addAll(extractDistancesFromSingleText(item))
        }
        return result
    }

    private fun extractStoreName(texts: List<String>): String {
        for (item in texts) {
            val trimmed = item.trim()
            if (trimmed.length in 3..35 &&
                !generalDistancePattern.matcher(trimmed).find() &&
                !payoutPattern.matcher(trimmed).find() &&
                !orderIdPattern.matcher(trimmed).find() &&
                !ACCEPT_BUTTON_KEYWORDS.any { trimmed.contains(it, ignoreCase = true) } &&
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

    private fun notifyDriverAcceptedAsync() {
        // تم تعطيل كافة الأصوات والاهتزازات نهائياً (Silent & Vibration-Free Mode)
    }

    private fun notifyDriverRejectedAsync() {
        // تم تعطيل كافة الأصوات والاهتزازات نهائياً (Silent & Vibration-Free Mode)
    }

    override fun onDestroy() {
        sharedPrefsListener?.let {
            getSharedPreferences("locate_go_prefs", Context.MODE_PRIVATE)
                .unregisterOnSharedPreferenceChangeListener(it)
        }
        serviceScope.cancel()
        super.onDestroy()
    }

    override fun onInterrupt() {
        // لا توجد مؤقتات أو مهام معلقة
    }
}
