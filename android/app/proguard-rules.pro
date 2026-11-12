# =======================================================================
# Locate Go Driver - Maximum Security Obfuscation & R8/ProGuard Rules
# Designed to defeat decompilation (JADX, Apktool, Bytecode Viewer, IDA Pro)
# =======================================================================

# -----------------------------------------------------------------------
# 1. AGGRESSIVE COMPACTION & OBFUSCATION
# -----------------------------------------------------------------------
-optimizationpasses 5
-allowaccessmodification
-overloadaggressively
-repackageclasses ''
-flattenpackagehierarchy ''

# Renames all source files in stack traces to hide original filenames
-renamesourcefileattribute "SecureShield"

# Strip all debugging tables, local variable names, line numbers and metadata
# Only retain essential runtime annotations (e.g., JavascriptInterface)
-keepattributes *Annotation*,Signature,Exceptions
-dontskipnonpubliclibraryclasses
-dontskipnonpubliclibraryclassmembers

# -----------------------------------------------------------------------
# 2. ELIMINATE SENSITIVE LOGGING CALLS FROM BYTECODE
# Ensures decompiled APK does not contain debugging logs, URL prints, or telemetry
# -----------------------------------------------------------------------
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int d(...);
    public static int i(...);
    public static int w(...);
    public static int e(...);
    public static int wtf(...);
}

-assumenosideeffects class java.io.PrintStream {
    public void println(...);
    public void print(...);
}

# -----------------------------------------------------------------------
# 3. WEBVIEW & NATIVE BRIDGE PROTECTION
# Keep only the JavascriptInterface entry points required by WebView
# Heavily obfuscate all internal implementation logic, crypto, and helpers
# -----------------------------------------------------------------------
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

-keep class com.locatego.driver.LocateGoNativeBridge {
    public <init>(...);
    @android.webkit.JavascriptInterface <methods>;
}

# -----------------------------------------------------------------------
# 4. ANDROID SYSTEM COMPONENTS (Required for OS binding)
# -----------------------------------------------------------------------
-keep public class * extends android.app.Activity
-keep public class * extends android.app.Application
-keep public class * extends android.app.Service
-keep public class * extends android.content.BroadcastReceiver
-keep public class * extends android.content.ContentProvider
-keep public class * extends android.accessibilityservice.AccessibilityService
-keep public class * extends android.preference.Preference

-keepclassmembers class * extends android.app.Activity {
    public void *(android.view.View);
}

# Keep enum methods required by runtime
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Keep Parcelable and Serializable implementations
-keepclassmembers class * implements android.os.Parcelable {
    public static final ** CREATOR;
}

# -----------------------------------------------------------------------
# 5. OKHTTP & NETWORK CLIENT PROTECTION
# -----------------------------------------------------------------------
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**
-keepnames class okhttp3.internal.publicsuffix.PublicSuffixDatabase

# -----------------------------------------------------------------------
# 6. GSON & JSON SERIALIZATION
# -----------------------------------------------------------------------
-keepattributes *Annotation*
-dontwarn com.google.gson.**
-keep class com.google.gson.** { *; }

# -----------------------------------------------------------------------
# 7. COROUTINES & ANDROIDX RUNTIME
# -----------------------------------------------------------------------
-dontwarn kotlinx.coroutines.**
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}

# -----------------------------------------------------------------------
# 8. INTERNAL SECURITY & CRYPTO (Obfuscate completely!)
# -----------------------------------------------------------------------
# Force maximum obfuscation on internal helper classes
-keep,allowobfuscation,allowoptimization class com.locatego.driver.AppSecurity { *; }
-keep,allowobfuscation,allowoptimization class com.locatego.driver.RenderApiClient { *; }
