# Hardened Android Obfuscation, Anti-Reverse Engineering & API Defense Implementation Plan

## Security Threat Model

### Component Overview
Locate Go Driver consists of a high-performance Android native application (Accessibility Service, Floating Overlay, GPS Tracking, Native Bridge) communicating directly with a Node.js/Express server (and web preview dashboard). The threat model centers on adversaries attempting to decompile, unpack, modify, and reverse engineer the APK (`.apk` / `.dex`), hook native routines via Frida/Xposed, sniff or replay network requests via proxy tools (Burp Suite, Charles Proxy), and manipulate distance/payout evaluation logic.

### Entry Points and Untrusted Inputs
| Entry Point | Type | Trusted? | Validation |
|---|---|---|---|
| Android APK Bytecode (.dex) | Binary / Bytecode | No (Target of Decompilation) | R8/ProGuard aggressive obfuscation, symbol stripping, package flattening, dead code removal |
| Native Strings in Memory/APK | String Literals | No | XOR byte-level obfuscation with dynamic key cycling |
| Runtime Environment (OS) | Process / System | No (Could be rooted/debugged) | Anti-debugging (`Debug.isDebuggerConnected()`, tracer pid), root detection (`su`, Magisk), Frida/Xposed hook detection |
| HTTP API (`/api/*`) | REST Endpoints | No | HMAC-SHA256 request signing (`X-Signature`), fresh timestamp validation (anti-replay), nonce verification, and device ID regex check |
| HTTP Request Payloads | JSON Body | No | Strict numerical bounds, range checks, type validation |

### Trust Boundaries and Auth Assumptions
- **Client (Android) to Server (Render Backend)**:
  - Untrusted boundary. Requests must carry cryptographically verifiable proof of authenticity (`X-Signature`, `X-Timestamp`, `X-Nonce`, `X-Device-Id`).
- **WebView to Native Bridge (`LocateGoNativeBridge`)**:
  - Bound via `@JavascriptInterface`. Only essential bridge methods exposed; internal security engines and credentials remain inaccessible to JS.
- **Data Isolation**:
  - Each courier's requests, location, and stats are strictly partitioned by sanitized `deviceId`.

### Sensitive Data Paths
| Data Type | Source | Destination | Protection |
|---|---|---|---|
| HMAC Signing Secret | Client / Server Config | Cryptographic Hash | Obfuscated at byte level in Android; never stored as plain string in `.dex` |
| Driver GPS Coordinates | FusedLocationProvider | Render API | Signed with HMAC-SHA256, transmitted over TLS |
| Order Evaluation Logic | Server / Accessibility | Database & Overlay | Verified by server-side Haversine formula; client cannot tamper with decision |

### Privileged Actions
| Action | Location | Guard |
|---|---|---|
| Auto-Accepting Orders | `LocateGoAccessibilityService` | Gated by master switch, strict distance thresholds, and accessibility security permissions |
| Updating Driver Location | `/api/location` | Nonce & timestamp validation, device sanitization |
| Evaluating Orders | `/api/orders/evaluate` | Server-authoritative distance calculation and signature validation |

### Priority Review Areas
1. **R8/ProGuard Rules (`proguard-rules.pro`)**: Enforce aggressive class flattening, source file stripping, repackaging, identifier scrambling, and removal of logging calls.
2. **Dynamic String Obfuscation (`AppSecurity.kt`)**: Eliminate plain strings for API URLs, headers, and secret keys in bytecode.
3. **Anti-Tampering & Anti-Hooking**: Detect debugger presence, root binaries, and hooking frameworks.
4. **HMAC-SHA256 API Request Signing (`server/security.ts` & `AppSecurity.kt`)**: Cryptographic signature verification with anti-replay protection.
5. **Web & Server Security Headers & Rate Limiting**: Defense-in-depth HTTP headers and request throttling.

---

## Proposed Changes

### 1. Android Build & ProGuard Hardening
- Update `/android/app/build.gradle`:
  - Enable `minifyEnabled true` and `shrinkResources true` on release (and provide hardened build configurations).
  - Enable R8 optimizations.
- Implement comprehensive `/android/app/proguard-rules.pro`:
  - `-repackageclasses ''`
  - `-allowaccessmodification`
  - `-optimizationpasses 5`
  - Strip `SourceFile`, `LineNumberTable`, `LocalVariableTable`.
  - Remove all `android.util.Log` calls in optimized release builds.
  - Preserve only required Android framework callbacks and `@JavascriptInterface` entry points.

### 2. Android Native Security Shield (`AppSecurity.kt`)
- Create `/android/app/src/main/java/com/locatego/driver/AppSecurity.kt`:
  - Runtime XOR string decoding for sensitive strings.
  - Anti-debugging & anti-root checks.
  - HMAC-SHA256 signature generator (`signRequest`).

### 3. Update Android API Client (`RenderApiClient.kt`)
- Integrate `AppSecurity`:
  - Obfuscate all API endpoints and sensitive strings.
  - Attach `X-Device-Id`, `X-Timestamp`, `X-Nonce`, `X-Signature` to all requests.

### 4. Server-Side Security Verification (`server/security.ts` & `server.ts`)
- Create `/server/security.ts`:
  - Verify HMAC-SHA256 signature, timestamp window (±5 mins), and nonce replay cache.
  - Enforce security headers (`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, etc.).
  - Enforce rate limiting per device/IP.
- Integrate into `/server.ts`.

### 5. Web Frontend Client & UI Security Status
- Create `/src/utils/security.ts` to sign dashboard requests so live preview works seamlessly.
- Update UI components to display real-time security shielding status (R8 Obfuscation Active, HMAC-SHA256 Signatures, Anti-Tamper Shield).

---

## Verification Plan

### Security Verification
- **Security Scan**: Inspect all newly created and modified files for common CWE vulnerabilities (XSS, injection, exposed secrets, missing auth boundaries). Resolve any detected issues immediately.
- **Security Audit**: Audit the implementation against the component's threat model (`## Security Threat Model`). Document all findings, dispositions, and remediations in `walkthrough.md` using the `generate-security-audit-report` skill.
- **Compilation & Linting**: Run `compile_applet` and `lint_applet` to guarantee complete build integrity.
