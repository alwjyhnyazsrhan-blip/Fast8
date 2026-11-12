import React, { useState } from 'react';
import { 
  ListOrdered, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Navigation, 
  Coins, 
  Trash2, 
  Filter, 
  Sparkles, 
  AlertTriangle,
  ChevronRight,
  Zap,
  MapPin,
  Send,
  HelpCircle,
  Info,
  ShieldCheck
} from 'lucide-react';
import { OrderItem } from '../types';
import { APP_CONFIG } from '../utils/sampleData';

interface OrdersFeedProps {
  orders: OrderItem[];
  maxDistanceKm: number;
  maxPickupDistanceKm?: number;
  isRunning: boolean;
  onClearOrders: () => void;
  onTestCustomOrder: (orderData: {
    distanceKm?: number;
    pickupDistanceKm?: number;
    deliveryDistanceKm?: number;
    appName: string;
    storeName: string;
    payoutSar: number;
    storeLat?: number;
    storeLng?: number;
    customerLat?: number;
    customerLng?: number;
  }) => void;
  currentDeviceId?: string;
}

export const OrdersFeed: React.FC<OrdersFeedProps> = ({
  orders,
  maxDistanceKm,
  maxPickupDistanceKm = 1.5,
  isRunning,
  onClearOrders,
  onTestCustomOrder,
  currentDeviceId,
}) => {
  const [filter, setFilter] = useState<'all' | 'accepted' | 'rejected'>('all');
  const [testMode, setTestMode] = useState<'distance' | 'coordinates'>('distance');
  const [showTester, setShowTester] = useState<boolean>(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState<boolean>(false);

  // Form states
  const [customDistance, setCustomDistance] = useState<string>('1.8');
  const [customPickupDistance, setCustomPickupDistance] = useState<string>('1.2');
  const [customApp, setCustomApp] = useState<string>('locatego');
  const [customStore, setCustomStore] = useState<string>('مطعم الشيف يوسف');
  const [customPayout, setCustomPayout] = useState<string>('20');
  
  // Coordinate states
  const [storeLat, setStoreLat] = useState<string>('24.8120');
  const [storeLng, setStoreLng] = useState<string>('46.6350');
  const [customerLat, setCustomerLat] = useState<string>('24.8235');
  const [customerLng, setCustomerLng] = useState<string>('46.6430');

  const filteredOrders = orders.filter((ord) => {
    if (filter === 'accepted') return ord.status === 'accepted';
    if (filter === 'rejected') return ord.status === 'rejected';
    return true;
  });

  const handleSubmitTestOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const payout = parseFloat(customPayout) || 18;

    if (testMode === 'distance') {
      const delivDist = parseFloat(customDistance);
      const pickDist = parseFloat(customPickupDistance);
      if (!isNaN(delivDist) && delivDist > 0) {
        onTestCustomOrder({
          distanceKm: delivDist,
          deliveryDistanceKm: delivDist,
          pickupDistanceKm: !isNaN(pickDist) ? pickDist : undefined,
          appName: customApp,
          storeName: customStore,
          payoutSar: payout,
        });
      }
    } else {
      const sLat = parseFloat(storeLat);
      const sLng = parseFloat(storeLng);
      const cLat = parseFloat(customerLat);
      const cLng = parseFloat(customerLng);
      if (!isNaN(sLat) && !isNaN(sLng) && !isNaN(cLat) && !isNaN(cLng)) {
        onTestCustomOrder({
          appName: customApp,
          storeName: customStore,
          payoutSar: payout,
          storeLat: sLat,
          storeLng: sLng,
          customerLat: cLat,
          customerLng: cLng,
        });
      }
    }
  };

  return (
    <div className="bg-gradient-to-b from-[#121929] to-[#0c1220] rounded-2xl p-6 border border-slate-800 shadow-xl">
      {/* Header with Title and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <ListOrdered className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-white">سجل فحص طلبات التوصيل المباشرة</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {orders.length} طلب
            </span>
            {currentDeviceId && (
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-cyan-950/70 text-cyan-300 border border-cyan-500/30 font-mono font-bold" title="سجل الطلبات معزول لجهاز هذا المندوب فقط">
                المندوب: {currentDeviceId}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            سجل حقيقي للطلبات التي تم استلامها والتحقق من مسافتها الجغرافية عبر خوارزمية السيرفر
          </p>
        </div>

        {/* Filter buttons & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-900 rounded-xl p-1 border border-slate-800">
            <button
              id="filter-all-btn"
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
                filter === 'all'
                  ? 'bg-slate-800 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              الكل ({orders.length})
            </button>
            <button
              id="filter-accepted-btn"
              onClick={() => setFilter('accepted')}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-all flex items-center gap-1 ${
                filter === 'accepted'
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                  : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              المقبولة ({orders.filter((o) => o.status === 'accepted').length})
            </button>
            <button
              id="filter-rejected-btn"
              onClick={() => setFilter('rejected')}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-all flex items-center gap-1 ${
                filter === 'rejected'
                  ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30'
                  : 'text-slate-400 hover:text-rose-400'
              }`}
            >
              <XCircle className="w-3 h-3 text-rose-400" />
              المستبعدة ({orders.filter((o) => o.status === 'rejected').length})
            </button>
          </div>

          {/* Troubleshooting Help Button */}
          <button
            id="toggle-troubleshooting-btn"
            onClick={() => setShowTroubleshooting(!showTroubleshooting)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
              showTroubleshooting
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                : 'bg-slate-800 hover:bg-slate-700 text-amber-400 border-slate-700'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>لماذا لا تُقبل الطلبات؟</span>
          </button>

          {/* Toggle Custom Test Form */}
          <button
            id="toggle-custom-tester-btn"
            onClick={() => setShowTester(!showTester)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 text-cyan-400" />
            <span>{showTester ? 'إخفاء الفاحص' : 'فحص طلب يدوي / إحداثيات'}</span>
          </button>

          {/* Clear Orders Button */}
          {orders.length > 0 && (
            <button
              id="btn-clear-orders"
              onClick={onClearOrders}
              title="تفريغ سجل الطلبات من السيرفر"
              className="p-1.5 rounded-xl bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Troubleshooting Guide Card */}
      {showTroubleshooting && (
        <div className="mt-4 p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/30 border border-amber-500/40 shadow-xl space-y-3.5 text-xs animate-in fade-in">
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-amber-500/20 text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </span>
              <h3 className="font-extrabold text-sm text-white">دليل التحقق: لماذا قد لا يقبل التطبيق الطلبات؟</h3>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-950 text-amber-300 border border-amber-500/30">
              قائمة الفحص الفوري
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* 1. Tool Status */}
            <div className={`p-3 rounded-xl border ${
              isRunning ? 'bg-emerald-950/40 border-emerald-500/40' : 'bg-rose-950/50 border-rose-500/50'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-200">1. حالة تشغيل الأداة:</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isRunning ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white animate-pulse'
                }`}>
                  {isRunning ? 'مفعلة (شغالة)' : 'متوقفة (OFF)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {isRunning
                  ? 'الأداة تعمل بنشاط ومستعدة للرصد.'
                  : '⚠️ السبب الأكثر شيوعاً: الأداة في وضع الإيقاف! اضغط على الزر الدائري الكبير بالأعلى لتشغيلها.'}
              </p>
            </div>

            {/* 2. Customer Delivery Distance */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700/80">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-200">2. أقصى مسافة للعميل:</span>
                <span className="font-mono font-bold text-cyan-300 bg-slate-950 px-2 py-0.5 rounded border border-cyan-500/30">
                  {maxDistanceKm} كم
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                أي طلب تتجاوز مسافة العميل فيه <b className="text-white">({maxDistanceKm} كم)</b> يُستبعد فوراً. يمكنك رفع المسافة من بطاقة التحكم الرئيسية بالأعلى.
              </p>
            </div>

            {/* 3. Restaurant Pickup Distance */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700/80">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-200">3. أقصى مسافة للمطعم:</span>
                <span className="font-mono font-bold text-teal-300 bg-slate-950 px-2 py-0.5 rounded border border-teal-500/30">
                  {maxPickupDistanceKm} كم
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                إذا كان المطعم يبعد أكثر من <b className="text-white">({maxPickupDistanceKm} كم)</b> يُرفض الطلب لحماية وقتك.
              </p>
            </div>

            {/* 4. Android Accessibility Service */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700/80">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-200">4. إمكانية الوصول (أندرويد):</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/30">
                  Accessibility
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                في تطبيق الجوال: يجب تفعيل خدمة <b className="text-white">Locate Go</b> في إعدادات إمكانية الوصول لقراءة شريط السحب وتنفيذ القبول التلقائي.
              </p>
            </div>

            {/* 5. VIP License */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700/80">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-200">5. ترخيص VIP النشط:</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/30">
                  VIP Code
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                في حال انتهاء صلاحية كود الاشتراك أو تعطل الاتصال بالترخيص، يُقفل النظام آلياً ويمنع النقر لحماية التطبيق.
              </p>
            </div>

            {/* 6. Price Excluded Note */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-emerald-500/30">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-200">6. معيار السعر والأجر:</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                  مستبعد تماماً
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                تم استبعاد السعر تماماً من شروط القبول والرفض؛ يتم قبول الطلب <b className="text-emerald-300">بناءً على المسافة الجغرافية فقط</b> مهما كانت قيمة التوصيل.
              </p>
            </div>

            {/* 7. Swipe-to-accept Target */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700/80">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-200">7. شريط السحب:</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                  Swipe Slider
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                المحرك مبرمج خصيصاً لاصطياد أشرطة <b className="text-white">"اسحب للقبول / Slide to Accept"</b> دون الضغط على أزرار الرفض أو غيرها.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Real Order Testing Form Modal / Tray */}
      {showTester && (
        <form
          onSubmit={handleSubmitTestOrder}
          className="mt-4 p-4 rounded-xl bg-[#090d16] border border-cyan-500/30 space-y-4"
        >
          {/* Active Status Alert inside Tester */}
          {!isRunning && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 flex items-center justify-between gap-3 text-xs text-rose-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  <b>تنبيه: الأداة حالياً في وضع الإيقاف (متوقفة مؤقتاً).</b> سيتم تسجيل أي طلب ترسله كـ "مستبعد" بسبب إيقاف الأداة. اضغط على زر "تشغيل الأداة" الأخضر بالأعلى لتفعيل القبول.
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              إرسال طلب مباشر لسيرفر المعالجة للتحقق من المسافة وقرار القبول:
            </span>
            <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => setTestMode('distance')}
                className={`px-2.5 py-1 rounded-md ${
                  testMode === 'distance' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400'
                }`}
              >
                مسافة مباشرة (كم)
              </button>
              <button
                type="button"
                onClick={() => setTestMode('coordinates')}
                className={`px-2.5 py-1 rounded-md ${
                  testMode === 'coordinates' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400'
                }`}
              >
                إحداثيات جغرافية (GPS)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">اسم التطبيق:</label>
              <select
                value={customApp}
                onChange={(e) => setCustomApp(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
              >
                <option value="locatego">Locate Go (الرئيسي - Sa.lg.android.locate)</option>
                <option value="locatecc">Locate CC (كول سنتر - sa.lg.android.locatcc)</option>
                <option value="locatei">Locate I (فئة I - Sa.lg.android.locati)</option>
                <option value="locatem">Locate M (فئة M - sa.lg.android.locatm)</option>
                <option value="locateg">Locate G (فئة G - sa.lg.android.locatg)</option>
                <option value="locatef">Locate F (فئة F - Sa.lg.android.locatf)</option>
                <option value="jahez">جاهز (Jahez)</option>
                <option value="hungerstation">هنقرستيشن (HungerStation)</option>
                <option value="marsool">مرسول (Mrsool)</option>
                <option value="toyou">تويو (ToYou)</option>
                <option value="ninja">نينجا (Ninja)</option>
                <option value="chefz">ذا شفز (The Chefz)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">اسم المتجر / المطعم:</label>
              <input
                type="text"
                value={customStore}
                onChange={(e) => setCustomStore(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">
                أجر التوصيل (ر.س) <span className="text-emerald-400 text-[10px] font-bold">(مستبعد من شروط القبول)</span>:
              </label>
              <input
                type="number"
                step="1"
                min="5"
                value={customPayout}
                onChange={(e) => setCustomPayout(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            {testMode === 'distance' ? (
              <>
                <div>
                  <label className="text-slate-400 block mb-1">مسافة المطعم (الاستلام كم):</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="30"
                    value={customPickupDistance}
                    onChange={(e) => setCustomPickupDistance(e.target.value)}
                    className="w-full bg-slate-900 border border-teal-800/80 text-teal-300 font-bold font-mono rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-teal-400"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">مسافة العميل (التوصيل كم):</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.2"
                    max="30"
                    value={customDistance}
                    onChange={(e) => setCustomDistance(e.target.value)}
                    className="w-full bg-slate-900 border border-emerald-800/80 text-emerald-400 font-bold font-mono rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </>
            ) : null}
          </div>

          {testMode === 'coordinates' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div>
                <label className="text-slate-400 block mb-1">خط عرض المتجر (Store Lat):</label>
                <input
                  type="text"
                  value={storeLat}
                  onChange={(e) => setStoreLat(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 font-mono rounded-lg px-2 py-1"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">خط طول المتجر (Store Lng):</label>
                <input
                  type="text"
                  value={storeLng}
                  onChange={(e) => setStoreLng(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 font-mono rounded-lg px-2 py-1"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">خط عرض العميل (Customer Lat):</label>
                <input
                  type="text"
                  value={customerLat}
                  onChange={(e) => setCustomerLat(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 font-mono rounded-lg px-2 py-1"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">خط طول العميل (Customer Lng):</label>
                <input
                  type="text"
                  value={customerLng}
                  onChange={(e) => setCustomerLng(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 font-mono rounded-lg px-2 py-1"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-md active:scale-95 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>إرسال وتحقق في السيرفر</span>
            </button>
          </div>
        </form>
      )}

      {/* Orders List Feed */}
      <div className="mt-5 space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-slate-800 rounded-2xl">
            <Clock className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-300 font-bold text-sm">لا توجد طلبات في هذا التصنيف حالياً</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {isRunning
                ? 'الأداة متصلة بالسيرفر وجاهزة لمعالجة أي طلب وارد، يمكنك الضغط على "فحص طلب يدوي" لاختبار الخادم.'
                : 'قم بتشغيل الأداة (Start) للبدء في مراقبة الطلبات أو اضغط "فحص طلب فوري" لتجربة الرصد.'}
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isAccepted = order.status === 'accepted';
            const appConf = APP_CONFIG[order.appSource] || {
              name: order.appName,
              color: 'text-slate-300',
              bg: 'bg-slate-800',
              border: 'border-slate-700',
              logoText: order.appName,
            };

            const timeString = new Intl.DateTimeFormat('ar-SA', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }).format(new Date(order.detectedAt));

            return (
              <div
                key={order.id}
                className={`relative rounded-xl p-4 transition-all duration-200 border ${
                  isAccepted
                    ? 'bg-gradient-to-r from-emerald-950/20 via-slate-900 to-[#0d1424] border-emerald-500/30 hover:border-emerald-500/50'
                    : 'bg-gradient-to-r from-rose-950/20 via-slate-900 to-[#0d1424] border-rose-500/30 hover:border-rose-500/50'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  {/* Store info and app tag */}
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border ${appConf.bg} ${appConf.border} ${appConf.color}`}
                    >
                      {appConf.logoText}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-xs font-bold ${appConf.color}`}>
                          {appConf.name}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {order.id}
                        </span>
                        {order.deviceId && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-400 font-mono" title="معرف جهاز المندوب">
                            {order.deviceId}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          {timeString}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-white mt-1 flex items-center gap-2">
                        <span>{order.storeName}</span>
                        <span className="text-xs text-slate-400 font-normal">← {order.customerDistrict}</span>
                      </h4>

                      {(order.pickupDistanceKm != null || order.deliveryDistanceKm != null) && (
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400 font-mono">
                          {order.pickupDistanceKm != null && (
                            <span className="text-cyan-400">
                              المطعم: <strong className="font-bold">{order.pickupDistanceKm} كم</strong>
                            </span>
                          )}
                          {order.deliveryDistanceKm != null && (
                            <span className="text-amber-400">
                              العميل: <strong className="font-bold">{order.deliveryDistanceKm} كم</strong>
                            </span>
                          )}
                        </div>
                      )}

                      {order.rejectionReason && (
                        <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-1 font-medium">
                          <AlertTriangle className="w-3 h-3" />
                          {order.rejectionReason}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Distance, payout, and decision badge */}
                  <div className="flex items-center gap-4 self-end md:self-auto">
                    {/* Distance Badge */}
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-medium">المسافة الحقيقية:</span>
                      <span
                        className={`text-base font-black font-mono ${
                          isAccepted ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {order.distanceKm} كم
                      </span>
                    </div>

                    {/* Payout Badge */}
                    <div className="text-right bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-medium">الأجر:</span>
                      <span className="text-xs font-bold text-slate-200 font-mono">
                        {order.payoutSar} ر.س
                      </span>
                    </div>

                    {/* Final Decision Badge */}
                    <div
                      className={`px-3 py-2 rounded-xl flex items-center gap-1.5 text-xs font-bold border ${
                        isAccepted
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      }`}
                    >
                      {isAccepted ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>تم القبول الآلي بالسحب ⚡</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-rose-400" />
                          <span>مستبعد (تجاوز {maxDistanceKm} كم)</span>
                        </>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
