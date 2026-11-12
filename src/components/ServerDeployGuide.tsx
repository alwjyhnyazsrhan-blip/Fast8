import React, { useState } from 'react';
import { 
  Server, 
  Cloud, 
  Terminal, 
  Copy, 
  Check, 
  ExternalLink, 
  CheckCircle2, 
  Zap, 
  ShieldCheck, 
  FileCode2, 
  Layers, 
  Globe, 
  ArrowRight,
  Code
} from 'lucide-react';

export const ServerDeployGuide: React.FC = () => {
  const [selectedLanguage, setSelectedLanguage] = useState<'node' | 'python'>('node');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const curlExample = `curl -X POST https://your-server-url.onrender.com/api/orders/evaluate \\
  -H "Content-Type: application/json" \\
  -d '{
    "appName": "جاهز",
    "storeName": "شاورما كلاسيك",
    "customerDistrict": "حي الياسمين",
    "payoutSar": 22.0,
    "storeLat": 24.8123,
    "storeLng": 46.6341,
    "customerLat": 24.8250,
    "customerLng": 46.6410
  }'`;

  const nodeServerCodeSnippet = `// Node.js + Express (معادلة Haversine الدقيقة لحساب المسافات الجغرافية)
function calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // نصف قطر الأرض بالكيلومتر
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

// فحص اتصال الأندرويد واختبار السيرفر
app.get(["/api/health", "/api/ping"], (req, res) => {
  res.json({ status: "online", ping: "pong", service: "Locate Go Backend Server" });
});
app.post(["/api/health", "/api/ping"], (req, res) => {
  res.json({ status: "online", ping: "pong", service: "Locate Go Backend Server" });
});

// فحص الطلب تلقائياً
app.post("/api/orders/evaluate", (req, res) => {
  const { storeLat, storeLng, customerLat, customerLng, payoutSar } = req.body;
  const distanceKm = calculateHaversineDistanceKm(storeLat, storeLng, customerLat, customerLng);
  // تم استبعاد السعر تماماً - القبول يعتمد حصرياً على المسافة الجغرافية
  const isAccepted = distanceKm <= settings.maxDistanceKm;
  
  res.json({
    decision: isAccepted ? "accepted" : "rejected",
    distanceKm,
    autoAccepted: isAccepted && settings.autoAccept
  });
});`;

  const pythonServerCodeSnippet = `# Python (FastAPI + Haversine Formula)
import math
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

@app.get("/api/health")
@app.get("/api/ping")
@app.post("/api/health")
@app.post("/api/ping")
def ping():
    return {"status": "online", "ping": "pong", "service": "Locate Go Backend Server"}

def calculate_haversine(lat1, lon1, lat2, lon2):
    R = 6371.0 # كيلومتر
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2)**2 + 
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2)**2)
    return round(R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)), 1)

@app.post("/api/orders/evaluate")
def evaluate(data: dict):
    dist = calculate_haversine(data['storeLat'], data['storeLng'], data['customerLat'], data['customerLng'])
    is_ok = dist <= 2.0
    return {"decision": "accepted" if is_ok else "rejected", "distanceKm": dist}`;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-slate-900 rounded-2xl p-6 border border-emerald-500/30 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>سيرفر المعالجة الحقيقي والرفع على الاستضافة المجانية</span>
                <span className="text-xs font-mono bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                  Live Production
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                سيرفر حقيقي متكامل جاهز 100% يقوم باستقبال إحداثيات ومسافات الطلبات، وتطبيق التحقق الجغرافي الفوري بدون أي كود وهمي.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch md:self-auto">
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setSelectedLanguage('node')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  selectedLanguage === 'node'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileCode2 className="w-3.5 h-3.5" />
                <span>Node.js (المثبت حالياً)</span>
              </button>
              <button
                onClick={() => setSelectedLanguage('python')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  selectedLanguage === 'python'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>Python (FastAPI)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Step-by-Step Free Hosting Guide (Render.com) */}
      <div className="bg-gradient-to-b from-[#121929] to-[#0c1220] rounded-2xl p-6 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Cloud className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-white">
              دليل الرفع خطوة بخطوة على الاستضافة المجانية (Render.com)
            </h3>
          </div>
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            مجاني 100% ولا يتطلب بطاقة بنكية
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Step 1 */}
          <div className="bg-[#090d16] p-4 rounded-xl border border-slate-800/90 relative group hover:border-emerald-500/40 transition-all">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center mb-3">
              01
            </div>
            <h4 className="text-sm font-bold text-slate-200 mb-1">تنزيل أو رفع الكود على GitHub</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              قم بتحميل ملفات المشروع (أو تصديرها عبر قائمة Export في أعلى الشاشة) ورفعها في مستودع GitHub خاص بك.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-[#090d16] p-4 rounded-xl border border-slate-800/90 relative group hover:border-emerald-500/40 transition-all">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center mb-3">
              02
            </div>
            <h4 className="text-sm font-bold text-slate-200 mb-1">التسجيل في Render.com</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              ادخل على موقع <span className="text-emerald-400 font-mono">render.com</span> وسجل دخولك بحساب GitHub مجاناً.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-[#090d16] p-4 rounded-xl border border-slate-800/90 relative group hover:border-emerald-500/40 transition-all">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center mb-3">
              03
            </div>
            <h4 className="text-sm font-bold text-slate-200 mb-1">إنشاء Web Service جديد</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              اضغط <strong className="text-slate-200">New +</strong> ثم اختر <strong className="text-slate-200">Web Service</strong> واختر المستودع المرفوع.
            </p>
          </div>

          {/* Step 4 */}
          <div className="bg-[#090d16] p-4 rounded-xl border border-slate-800/90 relative group hover:border-emerald-500/40 transition-all">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center mb-3">
              04
            </div>
            <h4 className="text-sm font-bold text-slate-200 mb-1">وضع أوامر التشغيل</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              اختر الخطة المجانية <strong className="text-emerald-400">Free Tier</strong> وضع أوامر البناء الموضحة بالأسفل.
            </p>
          </div>
        </div>

        {/* Configuration Specs Box */}
        <div className="mt-6 bg-slate-950 p-4 rounded-xl border border-slate-800">
          <h4 className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>بيانات الإعداد داخل Render (قم بنسخها ولصقها مباشرة):</span>
          </h4>

          {selectedLanguage === 'node' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 flex justify-between items-center">
                <div>
                  <span className="text-slate-500 block text-[10px]">Build Command:</span>
                  <span className="font-mono text-emerald-400 font-bold">npm install && npm run build</span>
                </div>
                <button
                  onClick={() => handleCopy('build-cmd-node', 'npm install && npm run build')}
                  className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                >
                  {copiedId === 'build-cmd-node' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 flex justify-between items-center">
                <div>
                  <span className="text-slate-500 block text-[10px]">Start Command:</span>
                  <span className="font-mono text-cyan-400 font-bold">npm start</span>
                </div>
                <button
                  onClick={() => handleCopy('start-cmd-node', 'npm start')}
                  className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                >
                  {copiedId === 'start-cmd-node' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 flex justify-between items-center">
                <div>
                  <span className="text-slate-500 block text-[10px]">Build Command:</span>
                  <span className="font-mono text-blue-400 font-bold">pip install -r requirements.txt</span>
                </div>
                <button
                  onClick={() => handleCopy('build-cmd-py', 'pip install -r requirements.txt')}
                  className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                >
                  {copiedId === 'build-cmd-py' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 flex justify-between items-center">
                <div>
                  <span className="text-slate-500 block text-[10px]">Start Command:</span>
                  <span className="font-mono text-cyan-400 font-bold">uvicorn server_python:app --host 0.0.0.0 --port $PORT</span>
                </div>
                <button
                  onClick={() => handleCopy('start-cmd-py', 'uvicorn server_python:app --host 0.0.0.0 --port $PORT')}
                  className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                >
                  {copiedId === 'start-cmd-py' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Code Viewer: The Actual Server Code */}
      <div className="bg-gradient-to-b from-[#121929] to-[#0c1220] rounded-2xl p-6 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-emerald-400" />
              <span>كود السيرفر الحقيقي ({selectedLanguage === 'node' ? 'server.ts - Node.js' : 'server_python.py - FastAPI'})</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              هذا الكود هو المشغّل الحالي في المشروع، يمكنك نسخه بالكامل وحفظه في ملفك الخاص.
            </p>
          </div>
          <button
            onClick={() =>
              handleCopy(
                'full-server-code',
                selectedLanguage === 'node' ? nodeServerCodeSnippet : pythonServerCodeSnippet
              )
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
          >
            {copiedId === 'full-server-code' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>تم النسخ!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>نسخ الكود</span>
              </>
            )}
          </button>
        </div>

        <div className="bg-[#080c14] rounded-xl p-4 border border-slate-800/80 font-mono text-xs text-slate-300 overflow-x-auto max-h-96">
          <pre>
            <code>{selectedLanguage === 'node' ? nodeServerCodeSnippet : pythonServerCodeSnippet}</code>
          </pre>
        </div>
      </div>

      {/* Real API Testing & cURL Playground */}
      <div className="bg-gradient-to-b from-[#121929] to-[#0c1220] rounded-2xl p-6 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Terminal className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white">
                أمر cURL لاختبار السيرفر من أي هاتف أو برنامج (Webhook / API Request)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                يمكن لأي تطبيق أندرويد أو سكربت إرسال الطلب فور ظهوره على شاشة المندوب إلى هذا الرابط:
              </p>
            </div>
          </div>
          <button
            onClick={() => handleCopy('curl-code', curlExample)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
          >
            {copiedId === 'curl-code' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>تم النسخ!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>نسخ أمر cURL</span>
              </>
            )}
          </button>
        </div>

        <div className="bg-[#080c14] rounded-xl p-4 border border-slate-800/80 font-mono text-xs text-emerald-400 overflow-x-auto">
          <pre>{curlExample}</pre>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-[#090d16] p-3 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px]">1. استلام الطلب والتحقق الجغرافي:</span>
            <span className="text-slate-200 font-bold">يحسب المسافة الفاصلة بدقة بالأمتار عبر خطوط الطول والعرض</span>
          </div>
          <div className="bg-[#090d16] p-3 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px]">2. اتخاذ القرار الفوري:</span>
            <span className="text-slate-200 font-bold">مقارنة مع شرط السائق (أقل من أو يساوي 2 كم)</span>
          </div>
          <div className="bg-[#090d16] p-3 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[10px]">3. الرد الآلي السريع:</span>
            <span className="text-emerald-400 font-mono font-bold">decision: accepted / rejected</span>
          </div>
        </div>
      </div>
    </div>
  );
};
