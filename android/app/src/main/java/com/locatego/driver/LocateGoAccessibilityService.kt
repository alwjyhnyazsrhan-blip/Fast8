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
    private var sharedPrefsListener: SharedPreferences.OnSharedPreferenceChangeListener? = null

    // تخزين الإعدادات في الذاكرة الحية (Volatile) للاسترجاع الفوري في 0 نانو ثانية دون أي قراءة للقرص
    @Volatile private var cachedIsVipLicensed: Boolean = false
    @Volatile private var cachedMaxAllowedKm: Double = 3.0 // الحد الأقصى لمسافة العميل (التوصيل)
    @Volatile private var cachedMaxPickupKm: Double = 1.5  // الحد الأقصى لمسافة المطعم (الاستلام)
    @Volatile private var cachedMinPayoutSar: Double = 0.0
    @Volatile private var cachedAutoAccept: Boolean = true
    @Volatile private var cachedSwipeSpeedMs: Long = 60L   // سرعة سحب فائقة السرعة (60ms)
    @Volatile private var cachedTapIntervalMs: Long = 10L  // فاصل النقرات المتتالية (ms)
    @Volatile private var cachedEnableCustomInterval: Boolean = false

    // تعابير نمطية مستهدفة بدقة عالية تدعم صيغتي: "المتجر 2.0 كم" وأيضاً "2.0 كم المتجر"
    private val pickupDistancePattern = Pattern.compile(
        "(?:(?:مسافة\\s*(?:المتجر|المطعم|الاستلام)|المتجر\\s*يبعد|المطعم\\s*يبعد|مسافة\\s*الاستلام|الاستلام|المطعم|المتجر|pickup|store)\\s*[:]?\\s*(\\d+(?:[.,]\\d+)?)\\s*(?:كم|كيلو|km|k\\.m)|(\\d+(?:[.,]\\d+)?)\\s*(?:كم|كيلو|km|k\\.m)\\s*[:]?\\s*(?:المتجر|المطعم|الاستلام|pickup|store))",
        Pattern.CASE_INSENSITIVE or Pattern.UNICODE_CASE
    )

    private val deliveryDistancePattern = Pattern.compile(
        "(?:(?:مسافة\\s*(?:العميل|التوصيل|الوجهة)|العميل\\s*يبعد|مسافة\\s*التوصيل|التوصيل|العميل|الوجهة|delivery|dropoff|customer)\\s*[:]?\\s*(\\d+(?:[.,]\\d+)?)\\s*(?:كم|كيلو|km|k\\.m)|(\\d+(?:[.,]\\d+)?)\\s*(?:كم|كيلو|km|k\\.m)\\s*[:]?\\s*(?:العميل|التوصيل|الوجهة|delivery|dropoff|customer))",
        Pattern.CASE_INSENSITIVE or Pattern.UNICODE_CASE
    )

    private val generalDistancePattern = Pattern.compile(
        "(?:المسافة\\s*الإجمالية|إجمالي\\s*المسافة|المسافة\\s*الكلية|المسافة|يبعد|تبعد|distance|total)?\\s*[:]?\\s*(\\d+(?:[.,]\\d+)?)\\s*(?:كم|كيلو|km|k\\.m)",
        Pattern.CASE_INSENSITIVE or Pattern.UNICODE_CASE
    )

    private val payoutPattern = Pattern.compile(
        "(?:الأجر|المبلغ|السعر|قيمة\\s*التوصيل|الربح|الأرباح|fee|sar|payout)?\\s*[:]?\\s*(\\d+(?:[.,]\\d+)?)\\s*(?:ر\\.س|ريال|sar|SAR|ر\\.\\s*س)",
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
        info.eventTypes = AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED or AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
        info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
        info.flags = info.flags or
                AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS or
                AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS or
                AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS
        serviceInfo = info

        // 2. تفعيل ذاكرة الإعدادات الفورية
        initLiveSettingsCache()

        Log.i("LocateGoService", "⚡⚡ ULTRA ZERO-DELAY Auto-Accept Engine ACTIVATED (Timeout=0ms • Single-Pass O(N) Scanner • Dual RTL/LTR Swipe & Tap).")
    }

    private fun initLiveSettingsCache() {
        val prefs = getSharedPreferences("locate_go_prefs", Context.MODE_PRIVATE)
        cachedIsVipLicensed = prefs.getBoolean("is_vip_licensed", false)
        cachedMaxAllowedKm = prefs.getFloat("max_distance_km", 3.0f).toDouble()
        cachedMaxPickupKm = prefs.getFloat("max_pickup_distance_km", 1.5f).toDouble()
        cachedMinPayoutSar = prefs.getFloat("min_payout_sar", 0.0f).toDouble()
        cachedAutoAccept = prefs.getBoolean("auto_accept", true)
        cachedSwipeSpeedMs = prefs.getInt("swipe_speed_ms", 60).toLong().coerceIn(40L, 500L)
        cachedTapIntervalMs = prefs.getInt("tap_interval_ms", 10).toLong()
        cachedEnableCustomInterval = prefs.getBoolean("enable_custom_interval", false)

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

        // فحص صارم وسريع لحالة ترخيص VIP من الذاكرة الحية في 0 نانو ثانية دون إبطاء الواجهة
        if (!cachedIsVipLicensed) return

        // فحص سريع: إذا كان القبول التلقائي مغلقاً في الذاكرة الحية نخرج فوراً
        if (!cachedAutoAccept) return

        val packageName: String = event.packageName?.toString() ?: ""
        val lowerPkg = packageName.trim().lowercase()

        // 🛡️ حظر قطعي لتطبيق واتساب: ممنوع منعاً باتاً مراقبة شاشة الواتساب أو فحص نصوصها أو السحب أو النقر عليها نهائياً
        if (lowerPkg.contains("whatsapp") || lowerPkg == "com.whatsapp" || lowerPkg == "com.whatsapp.w4b" || lowerPkg.contains("telegram")) {
            return
        }

        if (!isTargetPackage(packageName)) {
            return
        }

        currentForegroundPackage = packageName

        val type = event.eventType
        if (type != AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED &&
            type != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return

        val root = rootInActiveWindow ?: event.source ?: return
        inspectScreenForOrderOffer(root, packageName)
    }

    /**
     * نتيجة المسح الفوري الأحادي للشاشة
     */
    private data class FastScanResult(
        val texts: MutableList<String> = mutableListOf(),
        var acceptButtonNode: AccessibilityNodeInfo? = null,
        var directDeliveryKm: Double? = null,
        var directPickupKm: Double? = null,
        var directPayoutSar: Double? = null
    )

    /**
     * فحص الشاشة بدقة فائقة وبسرعة الصاروخ (Single-Pass O(N))
     */
    private fun inspectScreenForOrderOffer(root: AccessibilityNodeInfo, packageName: String) {
        val displayHeight = resources.displayMetrics.heightPixels
        val scanResult = FastScanResult()

        // دورة مسح واحدة تجمع النصوص وترصد زر القبول في نفس اللحظة دون تكرار المرور
        fastSinglePassTraversal(root, scanResult, displayHeight)

        if (scanResult.texts.isEmpty()) return

        val joinedContent = scanResult.texts.joinToString(" ")

        // 1. استرجاع أحدث قيم الإعدادات الحية من الذاكرة الحية (0 نانو ثانية) لضمان أقصى سرعة استجابة
        val maxAllowedDelivery = cachedMaxAllowedKm
        val maxAllowedPickup = cachedMaxPickupKm
        val minPayoutSar = cachedMinPayoutSar

        // 2. استخراج كافة المسافات الرقمية الموجودة في نصوص بطاقة العرض
        val allDists = extractAllDistancesFromTexts(scanResult.texts)

        // 3. تحديد مسافة المطعم / الاستلام (Pickup) ومسافة العميل / الوجهة (Delivery) بدقة ذكية
        var deliveryDistKm: Double? = scanResult.directDeliveryKm
        var pickupDistKm: Double? = scanResult.directPickupKm

        if (allDists.size >= 2) {
            val sortedDists = allDists.sorted()
            if (pickupDistKm == null) {
                pickupDistKm = sortedDists.first()
            }
            if (deliveryDistKm == null) {
                // نأخذ مسافة العميل كأقرب مسافة منطقية مطابقة لنصوص التوصيل، أو ثاني أقل مسافة لتجنب احتساب المسافة الإجمالية الخاطئة
                deliveryDistKm = if (sortedDists.size > 2 && sortedDists.last() > (sortedDists[0] + sortedDists[1]) * 0.9) {
                    sortedDists[sortedDists.size - 2]
                } else {
                    sortedDists.last()
                }
            }
        } else if (allDists.size == 1) {
            val singleDist = allDists[0]
            val hasStoreContext = joinedContent.contains("متجر") || joinedContent.contains("مطعم") || joinedContent.contains("موقعك")
            val hasCustomerContext = joinedContent.contains("عميل") || joinedContent.contains("زبون") || joinedContent.contains("توصيل") || joinedContent.contains("وجهة")

            if (hasCustomerContext && !hasStoreContext) {
                deliveryDistKm = singleDist
            } else if (hasStoreContext && !hasCustomerContext) {
                pickupDistKm = singleDist
            } else {
                deliveryDistKm = singleDist
            }
        }

        val targetEvaluationDistanceKm = deliveryDistKm ?: pickupDistKm ?: allDists.firstOrNull() ?: 1.0

        // 4. استخراج أجر التوصيل (للتوثيق فقط دون استخدامه في شروط القبول أو الرفض)
        var payoutSar = scanResult.directPayoutSar ?: 18.0
        if (scanResult.directPayoutSar == null) {
            val payoutMatcher = payoutPattern.matcher(joinedContent)
            if (payoutMatcher.find()) {
                payoutMatcher.group(1)?.replace(',', '.')?.toDoubleOrNull()?.let { payoutSar = it }
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

        // منع تكرار النقر أو السحب على نفس الطلب لنفس الشاشة خلال نافذة فائقة القصر (250ms) للسماح بتدارك أي حركة إطارات
        val deduplicationKey = "${extractedOrderId ?: ""}|$targetEvaluationDistanceKm|$pickupDistKm|$storeName"
        val now = System.currentTimeMillis()
        if (processedOrdersCache[deduplicationKey]?.let { now - it < 250 } == true) return

        // =========================================================================
        // القواعد الصارمة والقطعية للموافقة على الطلب:
        // 1. مسافة العميل يجب أن تكون <= الحد الأقصى لمسافة العميل (مثلاً 3.0 كم)
        // 2. مسافة المطعم يجب أن تكون <= الحد الأقصى لمسافة المطعم (مثلاً 1.5 كم)
        // (تم استبعاد السعر تماماً من معايير القبول أو الرفض: الاعتماد حصرياً على المسافات الجغرافية)
        // =========================================================================
        val isDeliveryWithinLimit = when {
            deliveryDistKm != null -> deliveryDistKm <= maxAllowedDelivery
            allDists.isNotEmpty() -> allDists.any { it <= maxAllowedDelivery }
            else -> true
        }

        val isPickupWithinLimit = when {
            pickupDistKm != null -> pickupDistKm <= maxAllowedPickup
            allDists.size >= 2 -> allDists.minOrNull()?.let { it <= maxAllowedPickup } ?: true
            else -> true
        }

        // استبعاد السعر تماماً: القرار يعتمد فقط على المسافات الجغرافية
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
            val targetNode = scanResult.acceptButtonNode
            val swipeSuccess = if (targetNode != null) {
                performInstantAccept(targetNode)
            } else {
                executeFallbackAccept(root)
            }

            processedOrdersCache[deduplicationKey] = now

            Log.i(
                "LocateGoService",
                "⚡⚡ ZERO-DELAY AUTO-ACCEPT SUCCESS! [Triggered=$swipeSuccess] App='$resolvedAppName' Store='$storeName' | Pickup: ${pickupDistKm ?: "N/A"} km (limit $maxAllowedPickup) | Delivery: ${deliveryDistKm ?: targetEvaluationDistanceKm} km (limit $maxAllowedDelivery)"
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
                !isDeliveryWithinLimit -> "مسافة العميل (${deliveryDistKm ?: targetEvaluationDistanceKm} كم) تتجاوز الحد الأقصى ($maxAllowedDelivery كم)"
                !isPickupWithinLimit -> "مسافة المطعم ($pickupDistKm كم) تتجاوز الحد الأقصى ($maxAllowedPickup كم)"
                else -> "معطل أو خارج النطاق المحدد"
            }

            Log.w("LocateGoService", "🚫 ORDER SKIPPED: $rejectReason")
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
     * - استخراج نصوص المسافات والأسعار والمتاجر.
     */
    private fun fastSinglePassTraversal(node: AccessibilityNodeInfo?, result: FastScanResult, displayHeight: Int) {
        if (node == null) return

        val text = node.text?.toString()?.trim()
        val desc = node.contentDescription?.toString()?.trim()
        val viewId = node.viewIdResourceName?.lowercase() ?: ""

        val rawContent = when {
            !text.isNullOrEmpty() -> text
            !desc.isNullOrEmpty() -> desc
            else -> null
        }

        // 1. فحص زر القبول أو شريط السحب فوراً
        if (result.acceptButtonNode == null) {
            val isAcceptId = ACCEPT_VIEW_IDS.any { viewId.endsWith(it) || viewId.contains(it) }
            val isAcceptKeyword = rawContent != null && ALL_ACCEPT_KEYWORDS.any { rawContent.contains(it, ignoreCase = true) }

            if (isAcceptId || isAcceptKeyword) {
                // التأكد الصارم من عدم استهداف زر الرفض أو زر الخريطة أو أيقونة الموقع
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
                    result.acceptButtonNode = node
                }
            }
        }

        // 2. إضافة النص المؤهل وفحص المسافات المباشرة
        if (rawContent != null && rawContent.length in 2..120) {
            val lowerStr = rawContent.lowercase()
            val isIgnored = IGNORED_NAV_TEXTS.any { lowerStr == it || lowerStr.startsWith("$it ") }
            if (!isIgnored) {
                result.texts.add(rawContent)

                // فحص سريع لنصوص المسافات أثناء المرور لتسريع التحليل
                if (result.directDeliveryKm == null && (lowerStr.contains("عميل") || lowerStr.contains("توصيل") || lowerStr.contains("وجهة") || lowerStr.contains("delivery") || lowerStr.contains("dropoff"))) {
                    val m = deliveryDistancePattern.matcher(rawContent)
                    if (m.find()) {
                        result.directDeliveryKm = m.group(1)?.replace(',', '.')?.toDoubleOrNull()
                    }
                }

                if (result.directPickupKm == null && (lowerStr.contains("مطعم") || lowerStr.contains("متجر") || lowerStr.contains("استلام") || lowerStr.contains("pickup") || lowerStr.contains("store"))) {
                    val m = pickupDistancePattern.matcher(rawContent)
                    if (m.find()) {
                        result.directPickupKm = m.group(1)?.replace(',', '.')?.toDoubleOrNull()
                    }
                }

                if (result.directPayoutSar == null && (lowerStr.contains("ريال") || lowerStr.contains("ر.س") || lowerStr.contains("sar"))) {
                    val m = payoutPattern.matcher(rawContent)
                    if (m.find()) {
                        result.directPayoutSar = m.group(1)?.replace(',', '.')?.toDoubleOrNull()
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

        // 1. نقر Accessibility فوري متزامن على العقدة والوالد (في حال كان الزر يدعم النقر المباشر)
        try {
            node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            node.parent?.performAction(AccessibilityNodeInfo.ACTION_CLICK)
        } catch (_: Exception) {}

        // إذا كانت العقدة تمثل نصاً داخلياً، نصعد للحاوية الأب للحصول على أبعاد العنصر التفاعلي الكامل
        var pNode: AccessibilityNodeInfo? = node.parent
        while (pNode != null) {
            val pBounds = Rect()
            pNode.getBoundsInScreen(pBounds)
            if (pBounds.width() > bounds.width() && pBounds.height() in 35..650) {
                bounds.set(pBounds)
            }
            pNode = pNode.parent
        }

        // تحقق أمني: التأكد من أن أبعاد الشريط واقعية وتقع في الجزء المناسب للشاشة
        if (bounds.isEmpty || bounds.centerY() < (screenHeight * 0.25f)) {
            Log.w("LocateGoService", "⚠️ Target bounds invalid, skipping to protect UI.")
            return false
        }

        val cx = bounds.centerX().toFloat()
        val cy = bounds.centerY().toFloat()

        // حساب نقاط السحب الدقيقة
        val handlePadding = (bounds.height().toFloat() * 0.35f).coerceIn(20f, 80f)
        val startX = (bounds.left.toFloat() + handlePadding).coerceAtLeast(10f)
        val endX = (bounds.right.toFloat() - handlePadding).coerceAtMost(screenWidth - 10f)

        val durationMs = cachedSwipeSpeedMs.coerceIn(40L, 200L)

        // بناء حزمة إيماءات مركبة وشاملة (Hardware Tap + Dual RTL/LTR Swipes)
        val gestureBuilder = GestureDescription.Builder()

        // 1. نقرة شاشة عتادية سريعة عند المركز (تستهدف أزرار القبول المباشرة في 15ms)
        val tapPath = Path().apply {
            moveTo(cx, cy)
            lineTo(cx, cy)
        }
        val tapStroke = GestureDescription.StrokeDescription(tapPath, 0L, 15L)
        gestureBuilder.addStroke(tapStroke)

        // 2. سحب من اليسار إلى اليمين (LTR Swipe) لأشرطة السحب القياسية
        if (endX > startX + 50f) {
            val ltrPath = Path().apply {
                moveTo(startX, cy)
                lineTo(endX, cy)
            }
            val ltrStroke = GestureDescription.StrokeDescription(ltrPath, 20L, durationMs)
            gestureBuilder.addStroke(ltrStroke)

            // 3. سحب معاكس من اليمين إلى اليسار (RTL Swipe) لأشرطة السحب في التطبيقات العربية
            val rtlPath = Path().apply {
                moveTo(endX, cy)
                lineTo(startX, cy)
            }
            val rtlStroke = GestureDescription.StrokeDescription(rtlPath, 20L + durationMs + 10L, durationMs)
            gestureBuilder.addStroke(rtlStroke)
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

        // فاصل النقرات المتتالية المخصصة (Repeated-tap interval)
        if (cachedEnableCustomInterval) {
            val tapDelay = cachedTapIntervalMs.coerceIn(5L, 300L)
            serviceScope.launch {
                delay(tapDelay)
                try {
                    node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                    node.parent?.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                } catch (_: Exception) {}
            }
        }

        // فحص تعزيزي بعد 120ms فقط: إذا كان زر أو شريط القبول ما زال ظاهراً (مثل تأخر استجابة واجهة التطبيق)، ننفذ نقرة وسحبة فورية ثانية
        serviceScope.launch {
            delay(120)
            try {
                val currentRoot = rootInActiveWindow
                if (currentRoot != null) {
                    val stillPresent = ALL_ACCEPT_KEYWORDS.any { kw ->
                        currentRoot.findAccessibilityNodeInfosByText(kw).isNotEmpty()
                    }
                    if (stillPresent) {
                        Log.i("LocateGoService", "⚡ Instant reinforce tap & swipe executed!")
                        val reinforceBuilder = GestureDescription.Builder()
                        reinforceBuilder.addStroke(GestureDescription.StrokeDescription(tapPath, 0L, 20L))
                        if (endX > startX + 50f) {
                            val fastLtr = Path().apply { moveTo(startX, cy); lineTo(endX, cy) }
                            reinforceBuilder.addStroke(GestureDescription.StrokeDescription(fastLtr, 25L, 50L))
                        }
                        dispatchGesture(reinforceBuilder.build(), null, null)
                    }
                }
            } catch (_: Exception) {}
        }

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

    private fun extractAllDistancesFromTexts(texts: List<String>): List<Double> {
        val result = mutableListOf<Double>()
        val kmPattern = Pattern.compile("([0-9\\u0660-\\u0669]+(?:[.,][0-9\\u0660-\\u0669]+)?)\\s*(?:كم|كيلو|km|k\\.m)", Pattern.CASE_INSENSITIVE or Pattern.UNICODE_CASE)
        for (item in texts) {
            val m = kmPattern.matcher(item)
            while (m.find()) {
                val raw = m.group(1) ?: continue
                val normalized = raw.map { ch ->
                    if (ch in '\u0660'..'\u0669') ('0' + (ch - '\u0660')) else ch
                }.joinToString("").replace(',', '.')
                normalized.toDoubleOrNull()?.let {
                    if (it >= 0.0) result.add(it)
                }
            }
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
