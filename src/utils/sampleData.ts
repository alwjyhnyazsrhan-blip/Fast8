import { OrderItem, AppSource } from '../types';

export const APP_CONFIG: Record<AppSource, { name: string; color: string; bg: string; border: string; logoText: string }> = {
  jahez: {
    name: 'جاهز (Jahez)',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    logoText: 'جاهز',
  },
  hungerstation: {
    name: 'هنقرستيشن (HungerStation)',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    logoText: 'HS',
  },
  marsool: {
    name: 'مرسول (Mrsool)',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    logoText: 'مرسول',
  },
  toyou: {
    name: 'تويو (ToYou)',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    logoText: 'ToYou',
  },
  ninja: {
    name: 'نينجا (Ninja)',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    logoText: 'Ninja',
  },
  chefz: {
    name: 'ذا شفز (The Chefz)',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    logoText: 'Chefz',
  },
  locatego: {
    name: 'Locate Go (الرئيسي)',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    logoText: 'LG',
  },
  locatecc: {
    name: 'Locate CC (كول سنتر)',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    logoText: 'LCC',
  },
  locatei: {
    name: 'Locate I (فئة I)',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    logoText: 'LI',
  },
  locatem: {
    name: 'Locate M (فئة M)',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    logoText: 'LM',
  },
  locateg: {
    name: 'Locate G (فئة G)',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    logoText: 'LG-G',
  },
  locatef: {
    name: 'Locate F (فئة F)',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    logoText: 'LF',
  },
};

export const resolveAppSource = (appNameOrPkg?: string): AppSource => {
  if (!appNameOrPkg) return 'jahez';
  const lower = appNameOrPkg.toLowerCase();
  if (lower.includes('locatcc') || lower.includes('locate cc')) return 'locatecc';
  if (lower.includes('locati') || lower.includes('locate i')) return 'locatei';
  if (lower.includes('locatm') || lower.includes('locate m')) return 'locatem';
  if (lower.includes('locatg') || lower.includes('locate g')) return 'locateg';
  if (lower.includes('locatf') || lower.includes('locate f')) return 'locatef';
  if (lower.includes('locate')) return 'locatego';
  if (lower.includes('هنقر') || lower.includes('hunger')) return 'hungerstation';
  if (lower.includes('مرسول') || lower.includes('mrsool') || lower.includes('marsool')) return 'marsool';
  if (lower.includes('تويو') || lower.includes('toyou')) return 'toyou';
  if (lower.includes('نينجا') || lower.includes('ninja')) return 'ninja';
  if (lower.includes('شفز') || lower.includes('chefz')) return 'chefz';
  return 'jahez';
};

export const INITIAL_ORDERS: OrderItem[] = [];

