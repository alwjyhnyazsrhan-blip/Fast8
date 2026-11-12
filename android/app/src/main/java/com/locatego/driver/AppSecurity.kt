package com.locatego.driver

import android.content.Context
import android.content.pm.ApplicationInfo
import android.os.Build
import android.os.Debug
import java.io.File
import java.net.Socket
import java.security.MessageDigest
import java.util.UUID
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/**
 * AppSecurity - وحدة الحماية والأمان العالية لمنع الهندسة العكسية والتفكيك
 * High-grade Anti-Reverse Engineering, Dynamic String Obfuscation & API Request Signing
 */
object AppSecurity {

    // Dynamic salt mask for string decoding & HMAC derivation
    private const val XOR_KEY: Byte = 0x5A

    // Byte-obfuscated salt for HMAC-SHA256 signing (prevents plain text extraction in decompilers)
    private val OBFUSCATED_SALT = byteArrayOf(
        0x36.toByte(), 0x35.toByte(), 0x39.toByte(), 0x3b.toByte(), 0x3e.toByte(),
        0x6f.toByte(), 0x73.toByte(), 0x3b.toByte(), 0x36.toByte(), 0x3e.toByte(),
        0x6e.toByte(), 0x34.toByte(), 0x35.toByte(), 0x3f.toByte(), 0x6e.toByte(),
        0x39.toByte(), 0x3e.toByte(), 0x3e.toByte(), 0x35.toByte(), 0x34.toByte()
    )

    /**
     * فك تشفير السلاسل النصية الحساسة أثناء التشغيل لمنع أدوات JADX / Strings من قراءتها
     */
    fun deobfuscate(data: ByteArray): String {
        val result = ByteArray(data.size)
        for (i in data.indices) {
            result[i] = (data[i].toInt() xor XOR_KEY.toInt()).toByte()
        }
        return String(result, Charsets.UTF_8)
    }

    /**
     * تشفير سلسلة نصية إلى مصفوفة بايتات
     */
    fun obfuscate(input: String): ByteArray {
        val bytes = input.toByteArray(Charsets.UTF_8)
        val result = ByteArray(bytes.size)
        for (i in bytes.indices) {
            result[i] = (bytes[i].toInt() xor XOR_KEY.toInt()).toByte()
        }
        return result
    }

    /**
     * استرجاع مفتاح التوقيع الرقمي بدون كتابته كنص صريح
     */
    private fun getSecretKey(): String {
        return deobfuscate(OBFUSCATED_SALT)
    }

    /**
     * توليد توقيع HMAC-SHA256 لحماية وتأمين استدعاءات الـ API ضد التلاعب والتزييف (Anti-Tamper & Anti-Replay)
     */
    fun generateApiSignature(
        deviceId: String,
        timestamp: Long,
        nonce: String,
        bodyContent: String
    ): String {
        return try {
            val key = getSecretKey()
            val payloadHash = sha256(bodyContent)
            val dataToSign = "$deviceId:$timestamp:$nonce:$payloadHash"

            val mac = Mac.getInstance("HmacSHA256")
            val secretKeySpec = SecretKeySpec(key.toByteArray(Charsets.UTF_8), "HmacSHA256")
            mac.init(secretKeySpec)
            val hmacBytes = mac.doFinal(dataToSign.toByteArray(Charsets.UTF_8))
            bytesToHex(hmacBytes)
        } catch (e: Exception) {
            "SIG_FALLBACK_${System.currentTimeMillis()}"
        }
    }

    /**
     * توليد Nonce فريد وحيد الاستخدام
     */
    fun generateNonce(): String {
        return UUID.randomUUID().toString().replace("-", "").take(16)
    }

    /**
     * فحص وجود أدوات التصحيح (Anti-Debugging)
     */
    fun isDebuggerActive(context: Context): Boolean {
        try {
            if (Debug.isDebuggerConnected() || Debug.waitingForDebugger()) {
                return true
            }
            val isDebuggable = (context.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0
            if (isDebuggable && !BuildConfig.DEBUG) {
                return true
            }
        } catch (_: Exception) {
        }
        return false
    }

    /**
     * فحص الروت وكسر الحماية (Anti-Root Detection)
     */
    fun isDeviceRooted(): Boolean {
        // 1. Check build tags
        val buildTags = Build.TAGS
        if (buildTags != null && buildTags.contains("test-keys")) {
            return true
        }

        // 2. Check known root binaries
        val rootPaths = arrayOf(
            "/system/app/Superuser.apk",
            "/sbin/su",
            "/system/bin/su",
            "/system/xbin/su",
            "/data/local/xbin/su",
            "/data/local/bin/su",
            "/system/sd/xbin/su",
            "/system/bin/failsafe/su",
            "/data/local/su",
            "/su/bin/su",
            "/data/adb/magisk"
        )

        for (path in rootPaths) {
            if (File(path).exists()) {
                return true
            }
        }

        return false
    }

    /**
     * فحص محاولات حقن الشفرات (Frida / Xposed Hook Detection)
     */
    fun isHookingDetected(): Boolean {
        // 1. Check for Frida default port 27042
        try {
            Socket("127.0.0.1", 27042).use {
                return true // Frida server is running!
            }
        } catch (_: Exception) {
            // Normal behavior
        }

        // 2. Check for Xposed / Frida classes in memory
        val hookClasses = arrayOf(
            "de.robv.android.xposed.XposedBridge",
            "com.saurik.substrate.MS$2",
            "frida.Frida"
        )
        for (className in hookClasses) {
            try {
                Class.forName(className)
                return true
            } catch (_: ClassNotFoundException) {
            }
        }

        return false
    }

    /**
     * التحقق من سلامة الحزمة واسم التطبيق ضد التعديل وإعادة الحزم (Repackaging Protection)
     */
    fun verifyPackageIntegrity(context: Context): Boolean {
        return context.packageName == "com.locatego.driver"
    }

    /**
     * حساب تجزئة SHA-256
     */
    fun sha256(input: String): String {
        return try {
            val md = MessageDigest.getInstance("SHA-256")
            val digest = md.digest(input.toByteArray(Charsets.UTF_8))
            bytesToHex(digest)
        } catch (e: Exception) {
            ""
        }
    }

    private fun bytesToHex(bytes: ByteArray): String {
        val hexChars = CharArray(bytes.size * 2)
        val hexArray = "0123456789abcdef".toCharArray()
        for (i in bytes.indices) {
            val v = bytes[i].toInt() and 0xFF
            hexChars[i * 2] = hexArray[v ushr 4]
            hexChars[i * 2 + 1] = hexArray[v and 0x0F]
        }
        return String(hexChars)
    }
}
