import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Ruler,
  Layers,
  Wrench,
  Sliders,
  Calculator,
  Copy,
  Check,
  AlertTriangle,
  Plus,
  Minus,
  Package,
  Truck,
  MessageSquare,
  RotateCcw,
  Database,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Settings,
  Printer,
  Share2,
  User,
  MapPin,
  Sparkles,
} from 'lucide-react';
import {
  DEFAULT_SHEET_ID,
  STORAGE_CATALOG_KEY,
  fetchGoogleCatalog,
} from './services/catalogSync';
import {
  formatRub,
  copyToClipboard,
  generateAvitoText,
  generateMessengerText,
} from './utils/estimateFormatters';
import SettingsModal from './components/SettingsModal';
import PrintSheet from './components/PrintSheet';

const STORAGE_MULTI_ITEMS_KEY = 'furniture_calc_multi_items_v2';
const STORAGE_CLIENT_KEY = 'furniture_calc_client_v1';
const STORAGE_SETTINGS_KEY = 'furniture_calc_settings_v1';
const MAX_ITEMS = 25;

const DIMENSION_LIMITS = {
  height: { min: 400, max: 3500, label: 'Высота (В)', defaultVal: 2400, presets: [2000, 2200, 2400, 2600, 2700] },
  width: { min: 300, max: 5000, label: 'Ширина (Ш)', defaultVal: 1600, presets: [800, 1200, 1600, 2000, 2400] },
  depth: { min: 200, max: 1200, label: 'Глубина (Г)', defaultVal: 600, presets: [400, 450, 500, 600, 650] },
};

const PRESETS = [
  { id: 'penal', name: 'Пенал', h: 2200, w: 600, d: 550, drawers: 1, facadeType: 'hinged', coupeFilling: 'ldsp', desc: '2200×600×550' },
  { id: 'doors2', name: '2-створчатый', h: 2400, w: 1200, d: 600, drawers: 2, facadeType: 'hinged', coupeFilling: 'ldsp', desc: '2400×1200×600' },
  { id: 'doors3', name: '3-створчатый', h: 2400, w: 1600, d: 600, drawers: 2, facadeType: 'hinged', coupeFilling: 'ldsp', desc: '2400×1600×600' },
  { id: 'coupe', name: 'Купе 2 двери', h: 2400, w: 1600, d: 650, drawers: 2, facadeType: 'sliding', coupeFilling: 'mirror', desc: '2400×1600×650' },
  { id: 'wardrobe_open', name: 'Гардеробная', h: 2400, w: 2000, d: 600, drawers: 3, facadeType: 'none', coupeFilling: 'ldsp', desc: '2400×2000×600' },
];

const DEFAULT_MATERIALS = {
  base: { id: 'base', name: 'Базовый ЛДСП 16 мм', pricePerSheet: 3100, sheetAreaM2: 5.03 },
  lamarty: { id: 'lamarty', name: 'Lamarty 16 мм', pricePerSheet: 4100, sheetAreaM2: 5.03 },
  egger: { id: 'egger', name: 'Egger 16 мм', pricePerSheet: 5800, sheetAreaM2: 5.8 },
  mdf: { id: 'mdf', name: 'МДФ в плёнке', pricePerSheet: 7500, sheetAreaM2: 5.0 },
};

const DEFAULT_HARDWARE_TYPES = {
  standard: { id: 'standard', name: 'Стандарт', subtitle: 'Базовая комплектация', multiplier: 1.0 },
  softClose: { id: 'softClose', name: 'С доводчиками', subtitle: '+40% к фурнитуре', multiplier: 1.4 },
  blum: { id: 'blum', name: 'Премиум Blum', subtitle: '+90% к фурнитуре', multiplier: 1.9 },
};

export const DEFAULT_SETTINGS = {
  masterName: 'Мастерская корпусной мебели',
  masterPhone: '+7 (999) 000-00-00',
  taxRate: 6,
  workshopCutCost: 3500,
  deliveryInstallCost: 4500,
  hdfPricePerSheet: 1100,
  edgeRatePerMeter: 45,
  hingePrice: 180,
  slidingSystemPerDoor: 3800,
  mirrorPricePerM2: 2400,
  warrantyMonths: 12,
  baseHardwareRate: 1800,
  drawerHardwareRate: 1400,
};

export function createDefaultItem(num = 1) {
  return {
    id: `item_${Date.now()}_${num}`,
    name: `Изделие ${num}`,
    heightRaw: '2400',
    widthRaw: '1600',
    depthRaw: '600',
    materialId: 'base',
    hardwareId: 'standard',
    drawers: 2,
    facadeType: 'hinged',
    coupeFilling: 'ldsp',
    markup: 50,
    quantity: 1,
    isConfirmed: false,
  };
}

const DEFAULT_ITEMS = [createDefaultItem(1)];

function getStoredItems() {
  try {
    const saved = localStorage.getItem(STORAGE_MULTI_ITEMS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length >= 1) {
        return parsed.slice(0, MAX_ITEMS).map((it, idx) => ({
          ...createDefaultItem(idx + 1),
          ...it,
          id: it.id || `item_${idx + 1}`,
          name: it.name || `Изделие ${idx + 1}`,
          quantity: Math.max(1, Math.min(99, Number(it.quantity) || 1)),
          isConfirmed: Boolean(it.isConfirmed),
        }));
      }
    }
    // Миграция со старого ключа v1
    const oldV1 = localStorage.getItem('furniture_calc_state_v1');
    if (oldV1) {
      const p = JSON.parse(oldV1);
      const single = createDefaultItem(1);
      single.heightRaw = p.heightRaw || '2400';
      single.widthRaw = p.widthRaw || '1600';
      single.depthRaw = p.depthRaw || '600';
      single.materialId = p.materialId || 'base';
      single.hardwareId = p.hardwareId || 'standard';
      single.drawers = typeof p.drawers === 'number' ? p.drawers : 2;
      single.facadeType = p.facadeType || (p.hasDoors === false ? 'none' : 'hinged');
      single.coupeFilling = p.coupeFilling || 'ldsp';
      single.markup = p.markup || 50;
      return [single];
    }
  } catch (e) {
    console.warn('Failed to parse items', e);
  }
  return DEFAULT_ITEMS;
}

function getStoredClient() {
  try {
    const saved = localStorage.getItem(STORAGE_CLIENT_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn('Failed to parse client info', e);
  }
  return { name: '', phone: '', address: '' };
}

function getStoredSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        warrantyMonths: typeof parsed.warrantyMonths === 'number' ? parsed.warrantyMonths : 12,
      };
    }
  } catch (e) {
    console.warn('Failed to parse stored settings', e);
  }
  return DEFAULT_SETTINGS;
}

function getStoredCatalog() {
  try {
    const saved = localStorage.getItem(STORAGE_CATALOG_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.materials && Array.isArray(parsed.materials)) {
        const matMap = {};
        parsed.materials.forEach((m) => {
          matMap[m.id] = m;
        });
        const hwMap = {};
        if (parsed.hardwareTypes && Array.isArray(parsed.hardwareTypes)) {
          parsed.hardwareTypes.forEach((h) => {
            hwMap[h.id] = h;
          });
        }
        return {
          materials: Object.keys(matMap).length ? matMap : DEFAULT_MATERIALS,
          hardwareTypes: Object.keys(hwMap).length ? hwMap : DEFAULT_HARDWARE_TYPES,
          services: parsed.services || {},
          lastSyncTime: parsed.lastSyncTime || null,
        };
      }
    }
  } catch (e) {
    console.warn('Failed to parse stored catalog', e);
  }
  return {
    materials: DEFAULT_MATERIALS,
    hardwareTypes: DEFAULT_HARDWARE_TYPES,
    services: {},
    lastSyncTime: null,
  };
}

export default function App() {
  const [items, setItems] = useState(getStoredItems);
  const [activeItemIdx, setActiveItemIdx] = useState(0);
  const [clientInfo, setClientInfo] = useState(getStoredClient);
  const [settings, setSettings] = useState(getStoredSettings);
  const [catalogData, setCatalogData] = useState(getStoredCatalog);

  const [viewMode, setViewMode] = useState('master');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDbOpen, setIsDbOpen] = useState(false);
  const [sheetIdInput, setSheetIdInput] = useState(DEFAULT_SHEET_ID);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState(
    catalogData.lastSyncTime
      ? `Синхронизировано в ${catalogData.lastSyncTime}`
      : 'Активен встроенный прайс-лист цеха'
  );

  const [copiedAvito, setCopiedAvito] = useState(false);
  const [copiedMessenger, setCopiedMessenger] = useState(false);
  const [printNotice, setPrintNotice] = useState(false);

  // Безопасный индекс активного изделия
  const safeIdx = Math.min(Math.max(0, activeItemIdx), Math.max(0, items.length - 1));
  const activeItem = items[safeIdx] || items[0] || DEFAULT_ITEMS[0];

  const updateActiveItem = (updates) => {
    setItems((prev) => {
      const copy = [...prev];
      if (copy[safeIdx]) {
        copy[safeIdx] = { ...copy[safeIdx], ...updates };
      }
      return copy;
    });
  };

  const tabsContainerRef = useRef(null);

  const handleAddItem = () => {
    if (items.length >= MAX_ITEMS) return;
    const nextNum = items.length + 1;
    const newItem = createDefaultItem(nextNum);
    setItems((prev) => [...prev, newItem]);
    setActiveItemIdx(items.length);

    setTimeout(() => {
      if (tabsContainerRef.current) {
        tabsContainerRef.current.scrollTo({
          left: tabsContainerRef.current.scrollWidth,
          behavior: 'smooth',
        });
      }
    }, 60);
  };

  const handleRemoveItem = (idxToRemove, e) => {
    if (e) e.stopPropagation();
    if (items.length <= 1) return;

    setItems((prev) => {
      const remaining = prev.filter((_, idx) => idx !== idxToRemove);
      return remaining.map((it, idx) => ({
        ...it,
        name: it.name.startsWith('Изделие') ? `Изделие ${idx + 1}` : it.name,
      }));
    });

    setActiveItemIdx((prev) => {
      if (prev === idxToRemove) {
        return Math.max(0, idxToRemove - 1);
      }
      if (prev > idxToRemove) {
        return prev - 1;
      }
      return prev;
    });
  };

  // Автосохранение всех изделий в localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_MULTI_ITEMS_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to save multi items', e);
    }
  }, [items]);

  // Автосохранение данных клиента
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CLIENT_KEY, JSON.stringify(clientInfo));
    } catch (e) {
      console.warn('Failed to save client info', e);
    }
  }, [clientInfo]);

  const handleSaveSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(newSettings));
  };

  const handleNumericInput = (field, maxLength = 4) => (e) => {
    const cleaned = e.target.value.replace(/\D/g, '').slice(0, maxLength);
    updateActiveItem({ [field]: cleaned });
  };

  const stepDimension = (field, delta, limits) => {
    const current = Number(activeItem[field]) || limits.defaultVal;
    const next = Math.min(limits.max, Math.max(limits.min, current + delta));
    updateActiveItem({ [field]: String(next) });
  };

  const resetDimensions = () => {
    updateActiveItem({
      heightRaw: String(DIMENSION_LIMITS.height.defaultVal),
      widthRaw: String(DIMENSION_LIMITS.width.defaultVal),
      depthRaw: String(DIMENSION_LIMITS.depth.defaultVal),
      facadeType: 'hinged',
      coupeFilling: 'ldsp',
    });
  };

  const applyPreset = (preset) => {
    updateActiveItem({
      heightRaw: String(preset.h),
      widthRaw: String(preset.w),
      depthRaw: String(preset.d),
      drawers: preset.drawers,
      facadeType: preset.facadeType,
      coupeFilling: preset.coupeFilling,
    });
  };

  const activePreset = useMemo(() => {
    const h = Number(activeItem.heightRaw);
    const w = Number(activeItem.widthRaw);
    const d = Number(activeItem.depthRaw);
    return PRESETS.find(
      (p) =>
        p.h === h &&
        p.w === w &&
        p.d === d &&
        p.drawers === activeItem.drawers &&
        p.facadeType === activeItem.facadeType &&
        (p.facadeType !== 'sliding' || p.coupeFilling === activeItem.coupeFilling)
    );
  }, [activeItem]);

  const handleSyncFromGoogle = async () => {
    setSyncLoading(true);
    setSyncStatus('Загрузка прайса из Google Таблицы...');
    try {
      const data = await fetchGoogleCatalog(sheetIdInput, 'sheet');
      const matMap = {};
      data.materials.forEach((m) => {
        matMap[m.id] = m;
      });
      const hwMap = {};
      data.hardwareTypes.forEach((h) => {
        hwMap[h.id] = h;
      });

      const updatedMaterials = Object.keys(matMap).length ? matMap : DEFAULT_MATERIALS;
      const updatedHw = Object.keys(hwMap).length ? hwMap : DEFAULT_HARDWARE_TYPES;
      const nowStr = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

      const newCatalog = {
        materials: updatedMaterials,
        hardwareTypes: updatedHw,
        services: data.services,
        lastSyncTime: nowStr,
      };

      setCatalogData(newCatalog);
      localStorage.setItem(STORAGE_CATALOG_KEY, JSON.stringify(newCatalog));

      if (data.services.workshopCutCost || data.services.deliveryInstallCost) {
        const mergedSettings = {
          ...settings,
          workshopCutCost: data.services.workshopCutCost || settings.workshopCutCost,
          deliveryInstallCost: data.services.deliveryInstallCost || settings.deliveryInstallCost,
        };
        handleSaveSettings(mergedSettings);
      }

      setSyncStatus(`Успешно обновлено в ${nowStr} (${data.materials.length} поз.)`);
    } catch (err) {
      console.error(err);
      setSyncStatus('Ошибка синхронизации. Проверьте ID таблицы и доступ по ссылке.');
    } finally {
      setSyncLoading(false);
    }
  };

  // Валидация текущего активного изделия
  const validation = useMemo(() => {
    const parseDim = (raw, spec) => {
      const trimmed = String(raw || '').trim();
      if (trimmed === '') {
        return { value: 0, raw: trimmed, error: `Укажите размер (${spec.min}–${spec.max} мм)` };
      }
      const num = Number(trimmed);
      if (Number.isNaN(num) || !Number.isFinite(num)) {
        return { value: 0, raw: trimmed, error: 'Только цифры' };
      }
      if (num < spec.min || num > spec.max) {
        return { value: num, raw: trimmed, error: `Диапазон: ${spec.min}–${spec.max} мм` };
      }
      return { value: num, raw: trimmed, error: null };
    };

    const h = parseDim(activeItem.heightRaw, DIMENSION_LIMITS.height);
    const w = parseDim(activeItem.widthRaw, DIMENSION_LIMITS.width);
    const d = parseDim(activeItem.depthRaw, DIMENSION_LIMITS.depth);

    return { h, w, d, isValid: !h.error && !w.error && !d.error };
  }, [activeItem.heightRaw, activeItem.widthRaw, activeItem.depthRaw]);

  // Чистый расчет параметров для любого изделия
  const computeItemCalc = (item) => {
    const hNum = Number(item.heightRaw);
    const wNum = Number(item.widthRaw);
    const dNum = Number(item.depthRaw);

    const isValid =
      !isNaN(hNum) &&
      hNum >= DIMENSION_LIMITS.height.min &&
      hNum <= DIMENSION_LIMITS.height.max &&
      !isNaN(wNum) &&
      wNum >= DIMENSION_LIMITS.width.min &&
      wNum <= DIMENSION_LIMITS.width.max &&
      !isNaN(dNum) &&
      dNum >= DIMENSION_LIMITS.depth.min &&
      dNum <= DIMENSION_LIMITS.depth.max;

    const H = isValid ? hNum : DIMENSION_LIMITS.height.defaultVal;
    const W = isValid ? wNum : DIMENSION_LIMITS.width.defaultVal;
    const D = isValid ? dNum : DIMENSION_LIMITS.depth.defaultVal;

    const material = catalogData.materials[item.materialId] || Object.values(catalogData.materials)[0] || DEFAULT_MATERIALS.base;
    const hardware = catalogData.hardwareTypes[item.hardwareId] || Object.values(catalogData.hardwareTypes)[0] || DEFAULT_HARDWARE_TYPES.standard;

    const effectiveD = item.facadeType === 'sliding' ? Math.max(150, D - 100) : D;
    const sections = Math.max(1, Math.ceil(W / 900));
    const dividers = sections - 1;
    const sectionWidth = Math.max(200, Math.round((W - (dividers + 2) * 16) / sections));

    const sidesAreaM2 = ((2 + dividers) * (H * D)) / 1000000;
    const topBottomAreaM2 = (2 * (W * D) + 2 * (W * 100)) / 1000000;
    const carcaseAreaM2 = sidesAreaM2 + topBottomAreaM2;

    const shelvesCount = sections * 4;
    const shelvesAreaM2 = (shelvesCount * (sectionWidth * Math.max(150, effectiveD - 20))) / 1000000;

    let doorsAreaM2 = 0;
    let hingesCount = 0;
    let hingesCost = 0;
    let slidingCost = 0;
    let slidingDoorsCount = 0;
    let mirrorAreaM2 = 0;
    let mirrorCost = 0;

    if (item.facadeType === 'hinged') {
      doorsAreaM2 = (H * W) / 1000000;
      const hingesPerDoor = H <= 1000 ? 2 : H <= 1800 ? 3 : H <= 2400 ? 4 : 5;
      hingesCount = sections * hingesPerDoor;
      hingesCost = Math.round(hingesCount * settings.hingePrice * hardware.multiplier);
    } else if (item.facadeType === 'sliding') {
      slidingDoorsCount = sections <= 2 ? 2 : 3;
      slidingCost = Math.round(slidingDoorsCount * settings.slidingSystemPerDoor * hardware.multiplier);

      const fullFacadeArea = (H * W) / 1000000;
      if (item.coupeFilling === 'mirror') {
        doorsAreaM2 = 0;
        mirrorAreaM2 = fullFacadeArea;
        mirrorCost = Math.round(mirrorAreaM2 * (settings.mirrorPricePerM2 || 2400));
      } else if (item.coupeFilling === 'combo') {
        doorsAreaM2 = fullFacadeArea * 0.5;
        mirrorAreaM2 = fullFacadeArea * 0.5;
        mirrorCost = Math.round(mirrorAreaM2 * (settings.mirrorPricePerM2 || 2400));
      } else {
        doorsAreaM2 = fullFacadeArea;
      }
    }

    const singleDrawerBoxAreaM2 = (2 * effectiveD * 150 + 2 * sectionWidth * 150 + sectionWidth * effectiveD) / 1000000;
    const drawersAreaM2 = item.drawers * singleDrawerBoxAreaM2;
    const drawerHardwareCost = Math.round(item.drawers * settings.drawerHardwareRate * hardware.multiplier);

    const hdfAreaM2 = (H * W) / 1000000;
    const hdfSheetCount = Math.ceil(hdfAreaM2 / 5.8);
    const hdfCost = hdfSheetCount * settings.hdfPricePerSheet;

    const netPartsAreaM2 = carcaseAreaM2 + shelvesAreaM2 + doorsAreaM2 + drawersAreaM2;
    const edgeMeters = Math.round(netPartsAreaM2 * 3.2);
    const edgeCost = Math.round(edgeMeters * settings.edgeRatePerMeter);

    const areaLdsp = netPartsAreaM2 * 1.15;
    const sheetCount = Math.ceil(areaLdsp / material.sheetAreaM2);
    const sheetsCost = sheetCount * material.pricePerSheet;

    const baseHwCost = Math.round(settings.baseHardwareRate * hardware.multiplier);
    const hardwareCost = baseHwCost + drawerHardwareCost + hingesCost + slidingCost;

    const workshopCut = settings.workshopCutCost;
    const deliveryInstall = settings.deliveryInstallCost;
    const costPrice = sheetsCost + hdfCost + edgeCost + mirrorCost + workshopCut + hardwareCost;
    const finalPrice = Math.round(costPrice * (1 + item.markup / 100) + deliveryInstall);
    const netProfit = finalPrice - costPrice - deliveryInstall;
    const marginPercent = finalPrice > 0 ? Math.round((netProfit / finalPrice) * 100) : 0;

    const taxAmount = Math.round(finalPrice * (settings.taxRate / 100));
    const profitAfterTax = Math.round(netProfit - taxAmount);

    const totalSheetCapacity = sheetCount * material.sheetAreaM2;
    const utilizationPercent =
      totalSheetCapacity > 0 ? Math.min(100, Math.round((areaLdsp / totalSheetCapacity) * 100)) : 0;

    const quantity = Math.max(1, Math.min(99, Number(item.quantity) || 1));
    const isConfirmed = Boolean(item.isConfirmed);

    const unitFinalPrice = finalPrice;
    const unitCostPrice = costPrice;
    const unitProfitAfterTax = profitAfterTax;
    const unitSheetCount = sheetCount;
    const unitNetProfit = netProfit;
    const unitTaxAmount = taxAmount;

    return {
      itemId: item.id,
      itemName: item.name,
      quantity,
      isConfirmed,
      unitFinalPrice,
      unitCostPrice,
      unitProfitAfterTax,
      unitSheetCount,
      H,
      W,
      D,
      effectiveD,
      sections,
      shelvesCount,
      material,
      hardware,
      facadeType: item.facadeType,
      coupeFilling: item.coupeFilling,
      drawers: item.drawers,
      slidingDoorsCount,
      hingesCount,
      mirrorAreaM2,
      mirrorCost: mirrorCost * quantity,
      netPartsAreaM2: netPartsAreaM2 * quantity,
      areaLdsp: areaLdsp * quantity,
      sheetCount: unitSheetCount * quantity,
      sheetsCost: sheetsCost * quantity,
      hdfSheetCount: hdfSheetCount * quantity,
      hdfCost: hdfCost * quantity,
      edgeMeters: edgeMeters * quantity,
      edgeCost: edgeCost * quantity,
      hardwareCost: hardwareCost * quantity,
      workshopCutCost: workshopCut * quantity,
      deliveryInstallCost: deliveryInstall * quantity,
      costPrice: unitCostPrice * quantity,
      finalPrice: unitFinalPrice * quantity,
      netProfit: unitNetProfit * quantity,
      marginPercent,
      taxAmount: unitTaxAmount * quantity,
      profitAfterTax: unitProfitAfterTax * quantity,
      utilizationPercent,
      isValid,
    };
  };

  // Расчет всех изделий по объекту
  const allCalculations = useMemo(() => {
    return items.map((it) => computeItemCalc(it));
  }, [items, settings, catalogData]);

  const calculation = allCalculations[safeIdx] || allCalculations[0];

  // Сводные данные по объекту
  const multiSummary = useMemo(() => {
    const validOnes = allCalculations.filter((c) => c.isValid);
    const totalFinal = validOnes.reduce((acc, c) => acc + c.finalPrice, 0);
    const totalProfit = validOnes.reduce((acc, c) => acc + c.profitAfterTax, 0);
    return {
      validCount: validOnes.length,
      totalFinal,
      totalProfit,
    };
  }, [allCalculations]);

  const wireframeGeometry = useMemo(() => {
    const { H, W, D } = calculation;
    const maxW = 180;
    const maxH = 128;
    const ratio = W / H;
    const boxW = ratio > maxW / maxH ? maxW : Math.max(44, Math.round(maxH * ratio));
    const boxH = ratio > maxW / maxH ? Math.max(44, Math.round(maxW / ratio)) : maxH;
    const isoX = Math.min(28, Math.max(10, Math.round((D / 1200) * 28)));
    const isoY = Math.round(isoX * 0.55);
    const startX = Math.round((240 - (boxW + isoX)) / 2);
    const startY = Math.round((156 - (boxH + isoY)) / 2) + isoY;

    return { boxW, boxH, isoX, isoY, startX, startY };
  }, [calculation]);

  const handleCopyAvito = async () => {
    const text = generateAvitoText({
      calculation,
      settings,
      facadeType: activeItem.facadeType,
      coupeFilling: activeItem.coupeFilling,
      drawers: activeItem.drawers,
      clientInfo,
    });
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedAvito(true);
      setTimeout(() => setCopiedAvito(false), 2200);
    }
  };

  const handleCopyMessenger = async () => {
    const text = generateMessengerText({
      calculation,
      settings,
      facadeType: activeItem.facadeType,
      coupeFilling: activeItem.coupeFilling,
      drawers: activeItem.drawers,
      clientInfo,
      allCalculations,
    });
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedMessenger(true);
      setTimeout(() => setCopiedMessenger(false), 2200);
    }
  };

  const handlePrint = () => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
    const isInAppWebView =
      /Telegram|VKAndroidApp|Vkontakte|vkShare/i.test(ua) ||
      (typeof window !== 'undefined' && Boolean(window.TelegramWebviewProxy));

    if (typeof window === 'undefined' || typeof window.print !== 'function') {
      setPrintNotice(true);
      return;
    }

    if (isInAppWebView) {
      setPrintNotice(true);
    }

    try {
      window.print();
    } catch {
      setPrintNotice(true);
    }
  };

  const dimensionFields = [
    { id: 'height', raw: activeItem.heightRaw, setter: (val) => updateActiveItem({ heightRaw: val }), spec: DIMENSION_LIMITS.height, val: validation.h },
    { id: 'width', raw: activeItem.widthRaw, setter: (val) => updateActiveItem({ widthRaw: val }), spec: DIMENSION_LIMITS.width, val: validation.w },
    { id: 'depth', raw: activeItem.depthRaw, setter: (val) => updateActiveItem({ depthRaw: val }), spec: DIMENSION_LIMITS.depth, val: validation.d },
  ];

  return (
    <div className="print-root min-h-screen bg-[#F6F5F2] text-[#18181B] flex justify-center font-sans antialiased">
      {/* Печатный одностраничный бланк замера (виден только при window.print()) */}
      <PrintSheet
        calculation={calculation}
        settings={settings}
        facadeType={activeItem.facadeType}
        coupeFilling={activeItem.coupeFilling}
        drawers={activeItem.drawers}
        wireframeGeometry={wireframeGeometry}
        clientInfo={clientInfo}
        isConfirmed={activeItem.isConfirmed}
        allCalculations={allCalculations}
      />

      <main className="w-full max-w-[480px] min-w-0 min-h-screen bg-[#F6F5F2] flex flex-col pb-28 md:pb-8 border-x border-[#E4E4E7]/60 overflow-x-clip no-print">
        {/* Шапка приложения */}
        <header className="bg-[#FFFFFF] border-b border-[#E4E4E7] px-4 py-3 shadow-sm sticky top-0 z-20">
          <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-[#F4F4F5]">
            <div className="flex items-center gap-1.5 min-w-0">
              <Calculator className="w-4 h-4 text-[#059669] shrink-0" strokeWidth={2.2} />
              <span className="text-xs font-semibold uppercase tracking-wider text-[#71717A] truncate">
                {viewMode === 'master' ? 'Цеховой расчёт' : 'Смета заказчику'}
              </span>
            </div>
            {viewMode === 'master' && (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsDbOpen(!isDbOpen)}
                  className={`min-h-[40px] flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                    isDbOpen
                      ? 'border-[#059669] bg-[#ECFDF5] text-[#059669]'
                      : 'border-[#E4E4E7] bg-[#FAFAFA] text-[#71717A] hover:text-[#18181B]'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Прайс</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                  className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#18181B] border border-[#E4E4E7]"
                  title="Настройки цеха"
                  aria-label="Настройки цеха"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 min-w-0">
            <h1 className="text-base font-bold tracking-tight text-[#18181B] leading-tight truncate min-w-0">
              {viewMode === 'master' ? settings.masterName : 'Коммерческое предложение'}
            </h1>

            {/* Сегментированный переключатель Мастер / Клиент */}
            <div className="flex bg-[#F4F4F5] p-0.5 rounded-lg border border-[#E4E4E7] shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('master')}
                className={`min-h-[40px] px-3 rounded-md text-xs font-semibold transition-all flex items-center ${
                  viewMode === 'master'
                    ? 'bg-[#FFFFFF] text-[#18181B] shadow-sm'
                    : 'text-[#71717A] hover:text-[#18181B]'
                }`}
              >
                Мастер
              </button>
              <button
                type="button"
                onClick={() => setViewMode('client')}
                className={`min-h-[40px] px-3 rounded-md text-xs font-semibold transition-all flex items-center ${
                  viewMode === 'client'
                    ? 'bg-[#FFFFFF] text-[#059669] shadow-sm'
                    : 'text-[#71717A] hover:text-[#18181B]'
                }`}
              >
                Клиент
              </button>
            </div>
          </div>

          {/* Панель синхронизации цен с Google Диском */}
          {isDbOpen && viewMode === 'master' && (
            <div className="mt-2.5 p-3 rounded-lg border border-[#A7F3D0] bg-[#F0FDF4] text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#065F46] uppercase tracking-wide">Google Таблица</span>
                <a
                  href={`https://docs.google.com/spreadsheets/d/${sheetIdInput}/edit`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[11px] font-semibold text-[#059669] hover:underline"
                >
                  <span>Открыть ↗</span>
                </a>
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={sheetIdInput}
                  onChange={(e) => setSheetIdInput(e.target.value)}
                  className="min-w-0 flex-1 min-h-[40px] px-2.5 py-1 rounded-lg border border-[#A7F3D0] bg-[#FFFFFF] text-base md:text-xs font-mono text-[#18181B] focus:outline-none"
                />
                <button
                  type="button"
                  disabled={syncLoading}
                  onClick={handleSyncFromGoogle}
                  className="min-h-[40px] px-3 py-1 rounded-lg bg-[#059669] text-[#FFFFFF] font-semibold text-xs flex items-center gap-1 shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncLoading ? 'animate-spin' : ''}`} />
                  <span>Обновить</span>
                </button>
              </div>
              <div className="text-[10px] text-[#065F46]/80 break-words">{syncStatus}</div>
            </div>
          )}
        </header>

        <div className="px-4 py-3 space-y-3.5 min-w-0">
          {/* Мульти-смета: Вкладки изделий по объекту */}
          <section className="space-y-1.5 min-w-0">
            <div className="flex items-center justify-between text-xs px-0.5 min-h-[32px]">
              <div className="flex items-center gap-2">
                <span className="font-bold uppercase tracking-wider text-[11px] text-[#18181B]">ИЗДЕЛИЯ</span>
                <span className="text-[10px] text-[#059669] font-semibold bg-[#ECFDF5] px-2 py-0.5 rounded-full border border-[#A7F3D0] tabular-nums">
                  {items.length}/{MAX_ITEMS}
                </span>
              </div>

              <button
                type="button"
                disabled={items.length >= MAX_ITEMS}
                onClick={handleAddItem}
                className="min-h-[40px] px-3 py-1 rounded-lg border border-[#A7F3D0] bg-[#ECFDF5] hover:bg-[#D1FAE5] active:bg-[#A7F3D0] text-[#065F46] font-bold text-xs flex items-center gap-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                title={`Добавить ещё одно изделие (до ${MAX_ITEMS} шт.)`}
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Добавить</span>
              </button>
            </div>

            <div
              ref={tabsContainerRef}
              className="flex items-center gap-1.5 p-1 bg-[#FFFFFF] rounded-xl border border-[#E4E4E7] shadow-sm overflow-x-auto no-scrollbar scroll-smooth"
            >
              {items.map((it, idx) => {
                const isActive = safeIdx === idx;
                const calc = allCalculations[idx];
                return (
                  <div
                    key={it.id || idx}
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveItemIdx(idx)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActiveItemIdx(idx);
                      }
                    }}
                    className={`relative shrink-0 cursor-pointer min-w-[110px] max-w-[150px] min-h-[44px] flex-1 py-2 px-2.5 rounded-lg text-xs font-semibold flex flex-col items-center justify-center transition-all select-none ${
                      isActive
                        ? 'bg-[#059669] text-[#FFFFFF] shadow-sm'
                        : 'text-[#71717A] bg-transparent hover:bg-[#F4F4F5]'
                    }`}
                  >
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => handleRemoveItem(idx, e)}
                        className={`absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black leading-none transition-all ${
                          isActive
                            ? 'text-white bg-black/35 hover:bg-black/50 border border-white/50 shadow-sm'
                            : 'text-[#71717A] hover:text-[#DC2626] hover:bg-[#FEE2E2]'
                        }`}
                        title="Удалить изделие"
                        aria-label={`Удалить ${it.name}`}
                      >
                        ×
                      </button>
                    )}
                    <span className="truncate w-full text-center leading-tight pr-3 flex items-center justify-center gap-1">
                      <span className="truncate">{it.name}</span>
                      {it.isConfirmed && (
                        <span className={`text-[10px] font-bold ${isActive ? 'text-[#ECFDF5]' : 'text-[#059669]'}`}>
                          ✓
                        </span>
                      )}
                    </span>
                    <span className={`text-[10px] mt-0.5 tabular-nums ${isActive ? 'text-[#ECFDF5]' : 'text-[#71717A]'}`}>
                      {calc?.isValid ? formatRub(calc.finalPrice) : '—'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Сводная плашка по объекту (только если добавлено 2 и более изделий) */}
            {items.length > 1 && multiSummary.validCount > 1 && (
              <div className="p-2.5 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-between text-xs animate-fadeIn">
                <div className="flex items-center gap-1.5 text-[#065F46]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="font-semibold">
                    Итог по объекту ({multiSummary.validCount} {multiSummary.validCount <= 4 ? 'изделия' : 'изделий'}):
                  </span>
                </div>
                <div className="font-extrabold text-[#059669] text-sm tabular-nums">
                  {formatRub(multiSummary.totalFinal)}
                </div>
              </div>
            )}
          </section>

          {/* Данные клиента и адреса замера */}
          <section className="rounded-xl border border-[#E4E4E7] bg-[#FFFFFF] p-3 shadow-sm space-y-2">
            <div className="flex items-center gap-1.5 border-b border-[#F4F4F5] pb-1.5">
              <User className="w-3.5 h-3.5 text-[#059669]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#18181B]">Клиент и адрес замера</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <input
                type="text"
                placeholder="Имя заказчика"
                value={clientInfo.name}
                onChange={(e) => setClientInfo((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full min-h-[42px] px-2.5 py-1.5 rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] text-base md:text-xs focus:outline-none focus:border-[#059669]"
              />
              <input
                type="text"
                inputMode="tel"
                placeholder="Телефон"
                value={clientInfo.phone}
                onChange={(e) => setClientInfo((prev) => ({ ...prev, phone: e.target.value }))}
                className="w-full min-h-[42px] px-2.5 py-1.5 rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] text-base md:text-xs tabular-nums focus:outline-none focus:border-[#059669]"
              />
            </div>
            <div className="relative text-xs">
              <input
                type="text"
                placeholder="Адрес замера / монтажа (ул., дом, кв.)"
                value={clientInfo.address}
                onChange={(e) => setClientInfo((prev) => ({ ...prev, address: e.target.value }))}
                className="w-full min-h-[42px] px-2.5 py-1.5 pr-7 rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] text-base md:text-xs focus:outline-none focus:border-[#059669]"
              />
              <MapPin className="w-3.5 h-3.5 text-[#71717A] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </section>

          {/* Панель активного изделия: количество и фиксация замеров */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl border border-[#E4E4E7] bg-[#FFFFFF] shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#18181B]">Количество:</span>
              <div className="flex items-center border border-[#E4E4E7] rounded-lg overflow-hidden bg-[#FAFAFA]">
                <button
                  type="button"
                  disabled={activeItem.isConfirmed || (activeItem.quantity || 1) <= 1}
                  onClick={() => updateActiveItem({ quantity: Math.max(1, (activeItem.quantity || 1) - 1) })}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center font-bold text-sm text-[#71717A] hover:bg-[#F4F4F5] disabled:opacity-30 active:bg-[#E4E4E7] transition-colors"
                  aria-label="Уменьшить количество"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="min-w-[44px] px-1 text-center text-xs font-bold text-[#18181B] tabular-nums">
                  {activeItem.quantity || 1} шт.
                </span>
                <button
                  type="button"
                  disabled={activeItem.isConfirmed || (activeItem.quantity || 1) >= 99}
                  onClick={() => updateActiveItem({ quantity: Math.min(99, (activeItem.quantity || 1) + 1) })}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center font-bold text-sm text-[#71717A] hover:bg-[#F4F4F5] disabled:opacity-30 active:bg-[#E4E4E7] transition-colors"
                  aria-label="Увеличить количество"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => updateActiveItem({ isConfirmed: !activeItem.isConfirmed })}
              className={`min-h-[44px] px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                activeItem.isConfirmed
                  ? 'border border-[#E4E4E7] bg-[#F4F4F5] text-[#18181B] hover:bg-[#E4E4E7]'
                  : 'bg-[#059669] hover:bg-[#047857] text-[#FFFFFF]'
              }`}
            >
              {activeItem.isConfirmed ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-[#059669]" />
                  <span>Изменить замеры</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Подтвердить замеры</span>
                </>
              )}
            </button>
          </div>

          {activeItem.isConfirmed && (
            <div className="p-2.5 rounded-lg bg-[#F0FDF4] border border-[#A7F3D0] text-[11px] text-[#065F46] flex items-center gap-2 animate-fadeIn">
              <Check className="w-4 h-4 text-[#059669] shrink-0" />
              <span>Замеры зафиксированы от случайного изменения. Для редактирования нажмите «Изменить замеры».</span>
            </div>
          )}

          {/* Форма параметров изделия с защитой fieldset */}
          <fieldset
            disabled={activeItem.isConfirmed}
            className={`min-w-0 border-0 p-0 m-0 space-y-3.5 block transition-opacity ${
              activeItem.isConfirmed ? 'opacity-70 select-none' : ''
            }`}
          >
          {/* Быстрые шаблоны (пресеты) */}
          <section className="space-y-1">
            <div className="flex items-center justify-between text-xs text-[#71717A] px-0.5">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Шаблоны в 1 клик:</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {PRESETS.map((preset) => {
                const isActive = activePreset?.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={`min-w-0 p-2 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      isActive
                        ? 'border-[#059669] bg-[#ECFDF5] text-[#059669] shadow-sm'
                        : 'border-[#E4E4E7] bg-[#FFFFFF] text-[#18181B] hover:border-[#D4D4D8]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold leading-tight">{preset.name}</span>
                      {isActive && <CheckCircle2 className="w-3 h-3 text-[#059669]" />}
                    </div>
                    <div className="text-[10px] font-medium text-[#71717A] mt-0.5 tabular-nums">
                      {preset.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Ортогональный чертёж корпуса */}
          <section className="rounded-xl border border-[#E4E4E7] bg-[#FFFFFF] p-3.5 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#F4F4F5] pb-2 mb-2.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#71717A]">
                Схема корпуса
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-[#F4F4F5] text-[#71717A]">
                  {activeItem.facadeType === 'hinged' && 'Распашной'}
                  {activeItem.facadeType === 'sliding' && 'Купе'}
                  {activeItem.facadeType === 'none' && 'Открытый'}
                </span>
                <span className="text-xs font-semibold text-[#059669] tabular-nums">
                  {calculation.isValid
                    ? `${calculation.H}×${calculation.W}×${calculation.D} мм`
                    : 'Задайте размеры'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-3 items-center">
              <div className="col-span-7 rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] flex items-center justify-center p-1">
                <svg viewBox="0 0 240 164" className="w-full h-[130px]" role="img" aria-label="Чертёж шкафа">
                  <polygon
                    points={`${wireframeGeometry.startX},${wireframeGeometry.startY} ${
                      wireframeGeometry.startX + wireframeGeometry.isoX
                    },${wireframeGeometry.startY - wireframeGeometry.isoY} ${
                      wireframeGeometry.startX + wireframeGeometry.boxW + wireframeGeometry.isoX
                    },${wireframeGeometry.startY - wireframeGeometry.isoY} ${
                      wireframeGeometry.startX + wireframeGeometry.boxW
                    },${wireframeGeometry.startY}`}
                    fill="#F4F4F5"
                    stroke="#A1A1AA"
                    strokeWidth="1"
                  />
                  <polygon
                    points={`${wireframeGeometry.startX + wireframeGeometry.boxW},${wireframeGeometry.startY} ${
                      wireframeGeometry.startX + wireframeGeometry.boxW + wireframeGeometry.isoX
                    },${wireframeGeometry.startY - wireframeGeometry.isoY} ${
                      wireframeGeometry.startX + wireframeGeometry.boxW + wireframeGeometry.isoX
                    },${wireframeGeometry.startY + wireframeGeometry.boxH - wireframeGeometry.isoY} ${
                      wireframeGeometry.startX + wireframeGeometry.boxW
                    },${wireframeGeometry.startY + wireframeGeometry.boxH}`}
                    fill="#E4E4E7"
                    stroke="#A1A1AA"
                    strokeWidth="1"
                  />
                  <rect
                    x={wireframeGeometry.startX}
                    y={wireframeGeometry.startY}
                    width={wireframeGeometry.boxW}
                    height={wireframeGeometry.boxH}
                    fill={activeItem.facadeType === 'sliding' && activeItem.coupeFilling === 'mirror' ? '#E0F2FE' : '#FFFFFF'}
                    stroke="#059669"
                    strokeWidth="1.5"
                  />

                  {calculation.sections > 1 && (
                    <line
                      x1={wireframeGeometry.startX + wireframeGeometry.boxW / 2}
                      y1={wireframeGeometry.startY}
                      x2={wireframeGeometry.startX + wireframeGeometry.boxW / 2}
                      y2={
                        wireframeGeometry.startY +
                        wireframeGeometry.boxH -
                        Math.min(wireframeGeometry.boxH * 0.55, activeItem.drawers * 11)
                      }
                      stroke={activeItem.facadeType === 'none' ? '#059669' : '#D4D4D8'}
                      strokeWidth={activeItem.facadeType === 'none' ? '1.2' : '1'}
                      strokeDasharray={activeItem.facadeType === 'none' ? '3 2' : 'none'}
                    />
                  )}

                  {activeItem.facadeType === 'none' && (
                    <>
                      <line
                        x1={wireframeGeometry.startX + 2}
                        y1={wireframeGeometry.startY + wireframeGeometry.boxH * 0.28}
                        x2={wireframeGeometry.startX + wireframeGeometry.boxW - 2}
                        y2={wireframeGeometry.startY + wireframeGeometry.boxH * 0.28}
                        stroke="#CBD5E1"
                        strokeWidth="1"
                      />
                      <line
                        x1={wireframeGeometry.startX + 2}
                        y1={wireframeGeometry.startY + wireframeGeometry.boxH * 0.52}
                        x2={wireframeGeometry.startX + wireframeGeometry.boxW - 2}
                        y2={wireframeGeometry.startY + wireframeGeometry.boxH * 0.52}
                        stroke="#CBD5E1"
                        strokeWidth="1"
                      />
                    </>
                  )}

                  {activeItem.facadeType === 'sliding' && (
                    <line
                      x1={wireframeGeometry.startX + wireframeGeometry.boxW * 0.48}
                      y1={wireframeGeometry.startY}
                      x2={wireframeGeometry.startX + wireframeGeometry.boxW * 0.48}
                      y2={wireframeGeometry.startY + wireframeGeometry.boxH}
                      stroke="#059669"
                      strokeWidth="1.5"
                    />
                  )}

                  {Array.from({ length: activeItem.drawers }).map((_, idx) => {
                    const drawerZoneHeight = Math.min(wireframeGeometry.boxH * 0.55, activeItem.drawers * 11);
                    const singleH = drawerZoneHeight / activeItem.drawers;
                    const yPos = wireframeGeometry.startY + wireframeGeometry.boxH - (idx + 1) * singleH;
                    return (
                      <g key={idx}>
                        <rect
                          x={wireframeGeometry.startX + 2}
                          y={yPos}
                          width={wireframeGeometry.boxW - 4}
                          height={Math.max(4, singleH - 1)}
                          fill="#ECFDF5"
                          stroke="#059669"
                          strokeWidth="1"
                        />
                        <line
                          x1={wireframeGeometry.startX + wireframeGeometry.boxW / 2 - 8}
                          y1={yPos + singleH / 2}
                          x2={wireframeGeometry.startX + wireframeGeometry.boxW / 2 + 8}
                          y2={yPos + singleH / 2}
                          stroke="#18181B"
                          strokeWidth="1.2"
                        />
                      </g>
                    );
                  })}
                </svg>
              </div>

              <div className="col-span-5 flex flex-col justify-between space-y-1.5 text-xs tabular-nums">
                <div className="rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] p-1.5">
                  <div className="text-[10px] text-[#71717A]">Расход ЛДСП</div>
                  <div className="text-xs font-bold text-[#18181B] mt-0.5">
                    {calculation.isValid ? `${calculation.areaLdsp.toFixed(2)} м² (${calculation.sheetCount} л.)` : '—'}
                  </div>
                </div>

                {viewMode === 'master' ? (
                  <>
                    <div className="rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] p-1.5">
                      <div className="text-[10px] text-[#71717A]">Себестоимость</div>
                      <div className="text-xs font-bold text-[#18181B] mt-0.5">
                        {calculation.isValid ? formatRub(calculation.costPrice) : '—'}
                      </div>
                    </div>
                    <div className="rounded-lg border border-[#A7F3D0] bg-[#ECFDF5] p-1.5">
                      <div className="text-[10px] text-[#059669] font-medium">Чистая маржа</div>
                      <div className="text-xs font-bold text-[#059669] mt-0.5">
                        {calculation.isValid ? `${calculation.marginPercent}% (+${formatRub(calculation.profitAfterTax)})` : '—'}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] p-1.5">
                      <div className="text-[10px] text-[#71717A]">Секций / полок</div>
                      <div className="text-xs font-bold text-[#18181B] mt-0.5">
                        {calculation.isValid ? `${calculation.sections} / ${calculation.shelvesCount}` : '—'}
                      </div>
                    </div>
                    <div className="rounded-lg border border-[#A7F3D0] bg-[#ECFDF5] p-1.5">
                      <div className="text-[10px] text-[#059669]">Итоговая цена</div>
                      <div className="text-xs font-extrabold text-[#059669] mt-0.5">
                        {calculation.isValid ? formatRub(calculation.finalPrice) : '—'}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* 1. Габариты шкафа */}
          <section className="rounded-xl border border-[#E4E4E7] bg-[#FFFFFF] p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-[#F4F4F5] pb-2">
              <div className="flex items-center gap-1.5">
                <Ruler className="w-4 h-4 text-[#059669]" />
                <h2 className="text-sm font-semibold text-[#18181B]">1. Габариты (мм)</h2>
              </div>
              <button
                type="button"
                onClick={resetDimensions}
                className="flex items-center gap-1 text-xs font-medium text-[#71717A] hover:text-[#18181B]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Сброс
              </button>
            </div>

            {!validation.isValid && (
              <div className="rounded-lg border border-[#F59E0B] bg-[#FFFBEB] p-2 text-xs text-[#92400E] flex items-start gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#D97706]" />
                <div>Проверьте значения габаритов (В: 400–3500, Ш: 300–5000, Г: 200–1200)</div>
              </div>
            )}

            <div className="space-y-2.5">
              {dimensionFields.map(({ id, raw, setter, spec, val }) => (
                <div
                  key={id}
                  className={`rounded-lg border p-2.5 space-y-1.5 transition-colors ${
                    val.error ? 'border-[#F87171] bg-[#FEF2F2]' : 'border-[#E4E4E7] bg-[#FAFAFA]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <label htmlFor={`input-${id}`} className="text-xs font-semibold text-[#18181B]">
                      {spec.label}
                    </label>
                    <span className="text-[11px] text-[#71717A] tabular-nums">
                      {spec.min}–{spec.max} мм
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => stepDimension(id === 'height' ? 'heightRaw' : id === 'width' ? 'widthRaw' : 'depthRaw', -50, spec)}
                      className="min-w-[50px] min-h-[44px] rounded-lg border border-[#E4E4E7] bg-[#FFFFFF] text-xs font-semibold text-[#18181B] active:bg-[#F4F4F5] tabular-nums"
                    >
                      −50
                    </button>
                    <div className="relative flex-1 min-w-0">
                      <input
                        id={`input-${id}`}
                        type="text"
                        inputMode="numeric"
                        value={raw}
                        onChange={handleNumericInput(id === 'height' ? 'heightRaw' : id === 'width' ? 'widthRaw' : 'depthRaw', 4)}
                        placeholder={String(spec.defaultVal)}
                        className="w-full min-h-[44px] px-3 pr-8 rounded-lg text-base md:text-sm font-bold text-[#18181B] border border-[#D4D4D8] bg-[#FFFFFF] focus:outline-none focus:border-[#059669] tabular-nums"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#71717A] pointer-events-none">
                        мм
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => stepDimension(id === 'height' ? 'heightRaw' : id === 'width' ? 'widthRaw' : 'depthRaw', 50, spec)}
                      className="min-w-[50px] min-h-[44px] rounded-lg border border-[#E4E4E7] bg-[#FFFFFF] text-xs font-semibold text-[#18181B] active:bg-[#F4F4F5] tabular-nums"
                    >
                      +50
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {spec.presets.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setter(String(preset))}
                        className={`min-h-[40px] px-2.5 py-1 rounded-lg text-xs font-medium border tabular-nums ${
                          Number(raw) === preset
                            ? 'border-[#059669] bg-[#ECFDF5] text-[#059669]'
                            : 'border-[#E4E4E7] bg-[#FFFFFF] text-[#71717A]'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 2. Фасады, наполнение купе и материал */}
          <section className="rounded-xl border border-[#E4E4E7] bg-[#FFFFFF] p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-1.5 border-b border-[#F4F4F5] pb-2">
              <Layers className="w-4 h-4 text-[#059669]" />
              <h2 className="text-sm font-semibold text-[#18181B]">2. Фасады и материал</h2>
            </div>

            {/* Селектор типа фасадов (3 варианта) */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider block">
                Конструкция фасадов:
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => updateActiveItem({ facadeType: 'hinged' })}
                  className={`min-w-0 min-h-[44px] p-2 rounded-lg border text-left flex flex-col justify-between transition-all ${
                    activeItem.facadeType === 'hinged'
                      ? 'border-[#059669] bg-[#ECFDF5] text-[#059669] font-bold'
                      : 'border-[#E4E4E7] bg-[#FAFAFA] text-[#71717A]'
                  }`}
                >
                  <span className="text-xs">Распашные</span>
                  <span className="text-[10px] mt-0.5 opacity-80">Петли</span>
                </button>

                <button
                  type="button"
                  onClick={() => updateActiveItem({ facadeType: 'sliding' })}
                  className={`min-w-0 min-h-[44px] p-2 rounded-lg border text-left flex flex-col justify-between transition-all ${
                    activeItem.facadeType === 'sliding'
                      ? 'border-[#059669] bg-[#ECFDF5] text-[#059669] font-bold'
                      : 'border-[#E4E4E7] bg-[#FAFAFA] text-[#71717A]'
                  }`}
                >
                  <span className="text-xs">Купе</span>
                  <span className="text-[10px] mt-0.5 opacity-80">Трек</span>
                </button>

                <button
                  type="button"
                  onClick={() => updateActiveItem({ facadeType: 'none' })}
                  className={`min-w-0 min-h-[44px] p-2 rounded-lg border text-left flex flex-col justify-between transition-all ${
                    activeItem.facadeType === 'none'
                      ? 'border-[#059669] bg-[#ECFDF5] text-[#059669] font-bold'
                      : 'border-[#E4E4E7] bg-[#FAFAFA] text-[#71717A]'
                  }`}
                >
                  <span className="text-xs">Без фасадов</span>
                  <span className="text-[10px] mt-0.5 opacity-80">Открытый</span>
                </button>
              </div>
            </div>

            {/* Наполнение дверей купе (если выбрано купе) */}
            {activeItem.facadeType === 'sliding' && (
              <div className="p-2.5 rounded-lg border border-[#A7F3D0] bg-[#F0FDF4] space-y-1.5">
                <span className="text-[11px] font-bold text-[#065F46] uppercase tracking-wide block">
                  Наполнение дверей купе:
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateActiveItem({ coupeFilling: 'ldsp' })}
                    className={`min-w-0 min-h-[42px] py-1.5 px-2 rounded-md text-xs font-semibold border transition-all ${
                      activeItem.coupeFilling === 'ldsp'
                        ? 'border-[#059669] bg-[#059669] text-[#FFFFFF]'
                        : 'border-[#A7F3D0] bg-[#FFFFFF] text-[#065F46]'
                    }`}
                  >
                    ЛДСП 16
                  </button>
                  <button
                    type="button"
                    onClick={() => updateActiveItem({ coupeFilling: 'mirror' })}
                    className={`min-w-0 min-h-[42px] py-1.5 px-2 rounded-md text-xs font-semibold border transition-all ${
                      activeItem.coupeFilling === 'mirror'
                        ? 'border-[#059669] bg-[#059669] text-[#FFFFFF]'
                        : 'border-[#A7F3D0] bg-[#FFFFFF] text-[#065F46]'
                    }`}
                  >
                    Зеркало
                  </button>
                  <button
                    type="button"
                    onClick={() => updateActiveItem({ coupeFilling: 'combo' })}
                    className={`min-w-0 min-h-[42px] py-1.5 px-2 rounded-md text-xs font-semibold border transition-all ${
                      activeItem.coupeFilling === 'combo'
                        ? 'border-[#059669] bg-[#059669] text-[#FFFFFF]'
                        : 'border-[#A7F3D0] bg-[#FFFFFF] text-[#065F46]'
                    }`}
                  >
                    Комби 50/50
                  </button>
                </div>
                {activeItem.coupeFilling !== 'ldsp' && (
                  <div className="text-[10px] text-[#065F46]/80 pt-0.5">
                    Добавлено зеркало с бронь-пленкой: {calculation.mirrorAreaM2.toFixed(1)} м² (+{formatRub(calculation.mirrorCost)})
                  </div>
                )}
              </div>
            )}

            {/* Выбор материала */}
            <div className="pt-1">
              <span className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider block mb-1.5">
                Материал плиты:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {Object.values(catalogData.materials).map((mat) => {
                  const active = activeItem.materialId === mat.id;
                  return (
                    <button
                      key={mat.id}
                      type="button"
                      onClick={() => updateActiveItem({ materialId: mat.id })}
                      className={`min-w-0 min-h-[54px] p-2 rounded-lg text-left border flex flex-col justify-between transition-colors ${
                        active
                          ? 'border-[#059669] bg-[#059669] text-[#FFFFFF]'
                          : 'border-[#E4E4E7] bg-[#FAFAFA] text-[#18181B]'
                      }`}
                    >
                      <span className="text-xs font-bold leading-tight truncate w-full">{mat.name}</span>
                      <span
                        className={`text-xs font-semibold mt-0.5 tabular-nums ${
                          active ? 'text-[#ECFDF5]' : 'text-[#059669]'
                        }`}
                      >
                        {formatRub(mat.pricePerSheet)}/лист
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* 3. Фурнитура и ящики */}
          <section className="rounded-xl border border-[#E4E4E7] bg-[#FFFFFF] p-4 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#F4F4F5] pb-2">
              <div className="flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-[#059669]" />
                <h2 className="text-sm font-semibold text-[#18181B]">3. Фурнитура и ящики</h2>
              </div>
              {viewMode === 'master' && (
                <span className="text-xs font-bold text-[#059669] tabular-nums">
                  {formatRub(calculation.hardwareCost)}
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {Object.values(catalogData.hardwareTypes).map((hw) => {
                const active = activeItem.hardwareId === hw.id;
                return (
                  <button
                    key={hw.id}
                    type="button"
                    onClick={() => updateActiveItem({ hardwareId: hw.id })}
                    className={`min-w-0 min-h-[52px] p-2 rounded-lg text-left border flex flex-col justify-between ${
                      active
                        ? 'border-[#059669] bg-[#059669] text-[#FFFFFF]'
                        : 'border-[#E4E4E7] bg-[#FAFAFA] text-[#18181B]'
                    }`}
                  >
                    <span className="text-xs font-bold leading-tight break-words">{hw.name}</span>
                    <span className={`text-[10px] mt-0.5 break-words ${active ? 'text-[#ECFDF5]' : 'text-[#71717A]'}`}>
                      {hw.subtitle}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] p-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#71717A]">Выдвижные ящики (0–6 шт.)</span>
                <span className="text-xs font-bold text-[#059669] tabular-nums">{activeItem.drawers} шт.</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={activeItem.drawers <= 0}
                  onClick={() => updateActiveItem({ drawers: Math.max(0, activeItem.drawers - 1) })}
                  className="min-w-[44px] min-h-[44px] rounded-lg border border-[#E4E4E7] bg-[#FFFFFF] text-[#18181B] flex items-center justify-center disabled:opacity-30 shrink-0"
                  aria-label="Уменьшить количество ящиков"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <div className="grid grid-cols-7 gap-1 flex-1 min-w-0">
                  {[0, 1, 2, 3, 4, 5, 6].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => updateActiveItem({ drawers: num })}
                      className={`min-h-[44px] rounded-lg text-xs font-bold border tabular-nums ${
                        activeItem.drawers === num
                          ? 'border-[#059669] bg-[#059669] text-[#FFFFFF]'
                          : 'border-[#E4E4E7] bg-[#FFFFFF] text-[#71717A]'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={activeItem.drawers >= 6}
                  onClick={() => updateActiveItem({ drawers: Math.min(6, activeItem.drawers + 1) })}
                  className="min-w-[44px] min-h-[44px] rounded-lg border border-[#E4E4E7] bg-[#FFFFFF] text-[#18181B] flex items-center justify-center disabled:opacity-30 shrink-0"
                  aria-label="Увеличить количество ящиков"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>

          {/* 4. Наценка мастера (скрыта в режиме Клиент) */}
          {viewMode === 'master' && (
            <section className="rounded-xl border border-[#E4E4E7] bg-[#FFFFFF] p-4 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between border-b border-[#F4F4F5] pb-2">
                <div className="flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-[#059669]" />
                  <h2 className="text-sm font-semibold text-[#18181B]">4. Наценка цеха</h2>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-[#059669] tabular-nums">+{activeItem.markup}%</span>
                  <span className="text-[11px] text-[#71717A] ml-2 tabular-nums">
                    (Маржа {calculation.marginPercent}%)
                  </span>
                </div>
              </div>

              <div className="py-1">
                <input
                  type="range"
                  min={30}
                  max={80}
                  step={1}
                  value={activeItem.markup}
                  onChange={(e) => updateActiveItem({ markup: Number(e.target.value) })}
                  className="w-full"
                />
                <div className="flex flex-wrap justify-between gap-1 text-xs mt-1.5 tabular-nums">
                  {[30, 40, 50, 60, 70, 80].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => updateActiveItem({ markup: preset })}
                      className={`min-h-[40px] px-2.5 py-1 rounded-lg border text-xs font-medium ${
                        activeItem.markup === preset
                          ? 'border-[#059669] text-[#059669] bg-[#ECFDF5]'
                          : 'border-[#E4E4E7] text-[#71717A] bg-[#FAFAFA]'
                      }`}
                    >
                      {preset}%
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}
          </fieldset>

          {/* Финансовая сводка для Мастера */}
          {viewMode === 'master' ? (
            <section className="rounded-xl border-2 border-[#059669] bg-[#FFFFFF] p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-[#F4F4F5] pb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Package className="w-4 h-4 text-[#059669] shrink-0" />
                  <h2 className="text-sm font-bold text-[#18181B] truncate">Смета цеха: {activeItem.name}</h2>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#ECFDF5] text-[#059669] tabular-nums shrink-0">
                  Налог {settings.taxRate}%
                </span>
              </div>

              {calculation.isValid ? (
                <>
                  <div className="space-y-1.5 text-xs tabular-nums">
                    <div className="flex justify-between py-1 border-b border-[#F4F4F5]">
                      <div>
                        <div className="text-[#18181B] font-medium">
                          ЛДСП ({calculation.sheetCount} л. × {formatRub(calculation.material.pricePerSheet)})
                        </div>
                        <div className="text-[10px] text-[#71717A]">
                          Каркас, полки, короба {activeItem.drawers} ящ. (+15% раскрой)
                        </div>
                      </div>
                      <span className="text-[#18181B] font-bold">{formatRub(calculation.sheetsCost)}</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-[#F4F4F5]">
                      <span className="text-[#71717A]">Задняя стенка (ХДФ 3 мм, {calculation.hdfSheetCount} л.)</span>
                      <span className="text-[#18181B] font-semibold">{formatRub(calculation.hdfCost)}</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-[#F4F4F5]">
                      <span className="text-[#71717A]">Кромление ПВХ ({calculation.edgeMeters} п.м.)</span>
                      <span className="text-[#18181B] font-semibold">{formatRub(calculation.edgeCost)}</span>
                    </div>

                    {calculation.mirrorCost > 0 && (
                      <div className="flex justify-between py-1 border-b border-[#F4F4F5]">
                        <span className="text-[#71717A]">Зеркало купе с бронь-пленкой</span>
                        <span className="text-[#18181B] font-semibold">{formatRub(calculation.mirrorCost)}</span>
                      </div>
                    )}

                    <div className="flex justify-between py-1 border-b border-[#F4F4F5]">
                      <span className="text-[#71717A]">Распил и присадка цеха</span>
                      <span className="text-[#18181B] font-semibold">{formatRub(calculation.workshopCutCost)}</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-[#F4F4F5]">
                      <span className="text-[#71717A]">
                        Фурнитура ({calculation.hardware.name}
                        {activeItem.facadeType === 'hinged' && `, ${calculation.hingesCount} пет.`}
                        {activeItem.facadeType === 'sliding' && `, трек ${calculation.slidingDoorsCount} дв.`})
                      </span>
                      <span className="text-[#18181B] font-semibold">{formatRub(calculation.hardwareCost)}</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-[#F4F4F5]">
                      <span className="text-[#71717A] flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5 text-[#71717A]" />
                        Доставка и монтаж
                      </span>
                      <span className="text-[#18181B] font-semibold">
                        {formatRub(calculation.deliveryInstallCost)}
                      </span>
                    </div>
                  </div>

                  {/* 4 KPI карточки */}
                  <div className="grid grid-cols-2 gap-2 pt-1 tabular-nums">
                    <div className="rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] p-2">
                      <div className="text-[10px] text-[#71717A]">
                        {calculation.quantity > 1 ? `Себестоимость (${calculation.quantity} шт.)` : 'Себестоимость'}
                      </div>
                      <div className="text-xs font-bold text-[#18181B] mt-0.5">
                        {formatRub(calculation.costPrice)}
                      </div>
                    </div>
                    <div className="rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] p-2">
                      <div className="text-[10px] text-[#71717A]">
                        {calculation.quantity > 1 ? `Итог (${calculation.quantity} шт.)` : 'Итоговая цена'}
                      </div>
                      <div className="text-xs font-bold text-[#18181B] mt-0.5">
                        {formatRub(calculation.finalPrice)}
                      </div>
                      {calculation.quantity > 1 && (
                        <div className="text-[9px] text-[#71717A] mt-0.5">
                          {formatRub(calculation.unitFinalPrice)} / шт.
                        </div>
                      )}
                    </div>
                    <div className="rounded-lg border border-[#A7F3D0] bg-[#ECFDF5] p-2">
                      <div className="text-[10px] text-[#059669] font-medium">Маржа ({calculation.marginPercent}%)</div>
                      <div className="text-xs font-bold text-[#059669] mt-0.5">
                        +{formatRub(calculation.netProfit)}
                      </div>
                    </div>
                    <div className="rounded-lg border border-[#A7F3D0] bg-[#ECFDF5] p-2">
                      <div className="text-[10px] text-[#059669] font-medium">На руки (за выч. налога)</div>
                      <div className="text-xs font-bold text-[#059669] mt-0.5">
                        +{formatRub(calculation.profitAfterTax)}
                      </div>
                      {calculation.quantity > 1 && (
                        <div className="text-[9px] text-[#059669]/80 mt-0.5">
                          +{formatRub(calculation.unitProfitAfterTax)} / шт.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-3 text-center text-xs text-[#92400E] bg-[#FFFBEB] rounded-lg border border-[#FDE68A]">
                  Укажите размеры для формирования сметы
                </div>
              )}
            </section>
          ) : (
            /* Чистая презентационная смета для Заказчика */
            <section className="rounded-xl border-2 border-[#059669] bg-[#FFFFFF] p-4 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between border-b border-[#F4F4F5] pb-2.5">
                <div>
                  <span className="text-[10px] font-bold text-[#059669] uppercase tracking-wider block">
                    Официальный расчёт
                  </span>
                  <h2 className="text-sm font-bold text-[#18181B]">Смета: {activeItem.name}</h2>
                </div>
                {settings.warrantyMonths > 0 && (
                  <div className="flex items-center gap-1 text-xs text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded-full border border-[#A7F3D0]">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span className="font-semibold text-[11px] tabular-nums">
                      Гарантия {settings.warrantyMonths} мес.
                    </span>
                  </div>
                )}
              </div>

              {calculation.isValid ? (
                <>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-[#F4F4F5]">
                      <span className="text-[#71717A]">Габариты (В×Ш×Г)</span>
                      <span className="text-[#18181B] font-semibold tabular-nums">
                        {calculation.H} × {calculation.W} × {calculation.D} мм
                      </span>
                    </div>
                    {calculation.quantity > 1 && (
                      <div className="flex justify-between py-1 border-b border-[#F4F4F5] bg-[#F0FDF4] px-1.5 rounded">
                        <span className="text-[#065F46] font-medium">Количество изделий</span>
                        <span className="text-[#065F46] font-bold tabular-nums">
                          {calculation.quantity} шт. ({formatRub(calculation.unitFinalPrice)} / шт.)
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between py-1 border-b border-[#F4F4F5]">
                      <span className="text-[#71717A]">Материал корпуса</span>
                      <span className="text-[#18181B] font-semibold">{calculation.material.name}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#F4F4F5]">
                      <span className="text-[#71717A]">Фасады</span>
                      <span className="text-[#18181B] font-semibold">
                        {activeItem.facadeType === 'hinged' && `Распашные (${calculation.material.name})`}
                        {activeItem.facadeType === 'sliding' && `Купе (${activeItem.coupeFilling === 'mirror' ? 'Зеркало' : activeItem.coupeFilling === 'combo' ? 'Комби' : 'ЛДСП'})`}
                        {activeItem.facadeType === 'none' && 'Открытый корпус'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#F4F4F5]">
                      <span className="text-[#71717A]">Наполнение</span>
                      <span className="text-[#18181B] font-semibold tabular-nums">
                        {calculation.sections} секции, {calculation.shelvesCount} полок, {activeItem.drawers} ящ.
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#F4F4F5]">
                      <span className="text-[#71717A]">Фурнитура</span>
                      <span className="text-[#18181B] font-semibold">{calculation.hardware.name}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#F4F4F5]">
                      <span className="text-[#71717A]">Сервис</span>
                      <span className="text-[#059669] font-medium text-right">
                        ЧПУ распил, кромление, доставка и монтаж включены
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#F0FDF4] border border-[#A7F3D0] flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-semibold text-[#065F46] uppercase tracking-wide">
                        {calculation.quantity > 1
                          ? `Итого за ${calculation.quantity} шт. под ключ`
                          : 'Итоговая стоимость под ключ'}
                      </div>
                      <div className="text-[10px] text-[#065F46]/70">
                        {calculation.quantity > 1
                          ? `По ${formatRub(calculation.unitFinalPrice)} / шт. с монтажом`
                          : 'С доставкой и установкой'}
                      </div>
                    </div>
                    <div className="text-lg font-extrabold text-[#059669] tabular-nums">
                      {formatRub(calculation.finalPrice)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={handleCopyMessenger}
                      className="min-h-[42px] rounded-xl bg-[#059669] hover:bg-[#047857] text-[#FFFFFF] font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    >
                      {copiedMessenger ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                      <span>{copiedMessenger ? 'Скопировано!' : 'В мессенджер'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handlePrint}
                      className="min-h-[42px] rounded-xl border border-[#059669] bg-[#FFFFFF] text-[#059669] hover:bg-[#ECFDF5] font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Печать / PDF</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="py-3 text-center text-xs text-[#92400E] bg-[#FFFBEB] rounded-lg border border-[#FDE68A]">
                  Задайте размеры шкафа для формирования сметы
                </div>
              )}
            </section>
          )}

          {/* Карточка для отправки клиенту на Авито */}
          <section className="rounded-xl border border-[#E4E4E7] bg-[#FFFFFF] p-4 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#F4F4F5] pb-2">
              <div className="flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-[#059669]" />
                <h2 className="text-sm font-semibold text-[#18181B]">Ответ для чата Авито</h2>
              </div>
              <span className="text-[10px] text-[#71717A]">Вилка цен (3 тарифа)</span>
            </div>

            <pre className="w-full whitespace-pre-wrap font-sans text-xs leading-relaxed bg-[#FAFAFA] rounded-lg border border-[#E4E4E7] p-2.5 text-[#18181B] max-h-[130px] overflow-y-auto">
              {generateAvitoText({
                calculation,
                settings,
                facadeType: activeItem.facadeType,
                coupeFilling: activeItem.coupeFilling,
                drawers: activeItem.drawers,
                clientInfo,
              })}
            </pre>

            <button
              type="button"
              disabled={!calculation.isValid}
              onClick={handleCopyAvito}
              className="w-full min-h-[42px] rounded-xl bg-[#059669] hover:bg-[#047857] text-[#FFFFFF] font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
            >
              {copiedAvito ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Ответ скопирован для Авито</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Скопировать ответ с вилкой цен</span>
                </>
              )}
            </button>
          </section>
        </div>
      </main>

      {/* Уведомление при печати из встроенного браузера Telegram / ВК */}
      {printNotice && (
        <div className="fixed bottom-20 md:bottom-4 left-3 right-3 z-40 max-w-[460px] mx-auto rounded-xl border border-[#F59E0B] bg-[#FFFBEB] p-3 shadow-lg text-xs text-[#92400E] flex items-start gap-2.5 no-print">
          <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 leading-snug">
            <div className="font-bold text-[#78350F] mb-0.5">Печать / PDF может быть заблокирована</div>
            <div>
              Встроенный браузер Telegram или ВК ограничивает печать. Нажмите «⋯» и выберите{' '}
              <span className="font-semibold">Открыть в Safari / Chrome</span>.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPrintNotice(false)}
            aria-label="Закрыть подсказку"
            className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg text-[#92400E] hover:bg-[#FEF3C7] font-bold text-base leading-none shrink-0"
          >
            ×
          </button>
        </div>
      )}

      {/* Мобильный плавающий Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-[#FFFFFF]/95 backdrop-blur-md border-t border-[#E4E4E7] p-2.5 shadow-xl md:hidden no-print">
        <div className="max-w-[480px] mx-auto flex items-center justify-between gap-2.5">
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold text-[#71717A] tracking-wider truncate">
              {items.length > 1 && multiSummary.validCount > 1
                ? `Итог (${multiSummary.validCount} изд.)`
                : `${activeItem.name}${calculation.quantity > 1 ? ` (${calculation.quantity} шт.)` : ''}`}
            </div>
            <div className="text-base font-black text-[#059669] tabular-nums">
              {items.length > 1 && multiSummary.validCount > 1
                ? formatRub(multiSummary.totalFinal)
                : calculation.isValid
                ? formatRub(calculation.finalPrice)
                : '—'}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              disabled={!calculation.isValid}
              onClick={viewMode === 'master' ? handleCopyAvito : handleCopyMessenger}
              className="min-h-[44px] px-3 rounded-lg bg-[#059669] text-white text-xs font-semibold flex items-center gap-1 shadow-sm disabled:opacity-40"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{viewMode === 'master' ? 'Авито' : 'Смета'}</span>
            </button>
            <button
              type="button"
              disabled={!calculation.isValid}
              onClick={handlePrint}
              className="min-h-[44px] px-3 rounded-lg border border-[#059669] text-[#059669] bg-white text-xs font-semibold flex items-center gap-1 disabled:opacity-40"
              title="Печать PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Модальное окно настроек цеха и прайса */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        defaultSettings={DEFAULT_SETTINGS}
      />
    </div>
  );
}
