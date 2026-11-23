import React, { useState, useEffect } from 'react';
import { X, Save, RotateCcw, Download, Upload, Check, AlertCircle } from 'lucide-react';

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  defaultSettings,
}) {
  const [activeTab, setActiveTab] = useState('rates');
  const [formData, setFormData] = useState({ ...settings });
  const [importError, setImportError] = useState(null);
  const [saveNotice, setSaveNotice] = useState(false);

  // Синхронизация формы при открытии модалки или внешнем обновлении настроек
  useEffect(() => {
    if (isOpen) {
      setFormData({ ...settings });
      setImportError(null);
    }
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleChange = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleNumberChange = (key, value) => {
    const cleaned = value.replace(/[^\d.]/g, '');
    setFormData((prev) => ({
      ...prev,
      [key]: cleaned,
    }));
  };

  const handleNumberBlur = (key, fallback = 0) => {
    setFormData((prev) => {
      const cur = prev[key];
      const num = Number(cur);
      return {
        ...prev,
        [key]: isNaN(num) || String(cur).trim() === '' ? fallback : num,
      };
    });
  };

  const handleSave = () => {
    const numericKeys = [
      'workshopCutCost',
      'deliveryInstallCost',
      'hdfPricePerSheet',
      'edgeRatePerMeter',
      'hingePrice',
      'slidingSystemPerDoor',
      'mirrorPricePerM2',
      'warrantyMonths',
      'baseHardwareRate',
      'drawerHardwareRate',
      'taxRate',
    ];

    const sanitized = { ...formData };
    numericKeys.forEach((k) => {
      sanitized[k] = Math.max(0, Number(sanitized[k]) || 0);
    });

    onSaveSettings(sanitized);
    setSaveNotice(true);
    setTimeout(() => {
      setSaveNotice(false);
      onClose();
    }, 500);
  };

  const handleReset = () => {
    if (window.confirm('Сбросить все цены и параметры цеха к стандартным значениям?')) {
      setFormData({ ...defaultSettings });
      onSaveSettings(defaultSettings);
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(formData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `furniture_calc_rates_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJson = (e) => {
    setImportError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (typeof parsed !== 'object' || parsed === null) {
          throw new Error('Файл не содержит валидный объект');
        }

        const requiredKeys = ['workshopCutCost', 'deliveryInstallCost', 'hdfPricePerSheet', 'edgeRatePerMeter'];
        for (const k of requiredKeys) {
          if (parsed[k] === undefined || typeof parsed[k] !== 'number' || parsed[k] < 0) {
            throw new Error(`Поле "${k}" отсутствует или содержит некорректное значение`);
          }
        }

        const merged = { ...defaultSettings, ...formData, ...parsed };
        setFormData(merged);
        onSaveSettings(merged);
        alert('Прайс-лист успешно загружен и сохранён!');
      } catch (err) {
        setImportError(err.message || 'Ошибка парсинга JSON');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-[460px] max-h-[90dvh] overflow-y-auto bg-[#FFFFFF] rounded-2xl border border-[#E4E4E7] shadow-xl flex flex-col text-[#18181B] font-sans">
        {/* Заголовок модального окна */}
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-[#E4E4E7]">
          <div className="min-w-0">
            <h3 className="text-base font-bold leading-tight">Настройки и прайс-лист цеха</h3>
            <p className="text-[11px] text-[#71717A] mt-0.5">Локальные ставки, реквизиты мастера и налоги</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть настройки"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#18181B] transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Навигационные табы */}
        <div className="shrink-0 flex border-b border-[#E4E4E7] px-4 pt-2 bg-[#FAFAFA] text-xs overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('rates')}
            className={`min-h-[44px] pb-2.5 px-3 font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'rates'
                ? 'border-[#059669] text-[#059669]'
                : 'border-transparent text-[#71717A] hover:text-[#18181B]'
            }`}
          >
            Цены и услуги
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('contacts')}
            className={`min-h-[44px] pb-2.5 px-3 font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'contacts'
                ? 'border-[#059669] text-[#059669]'
                : 'border-transparent text-[#71717A] hover:text-[#18181B]'
            }`}
          >
            Мастер и налог
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`min-h-[44px] pb-2.5 px-3 font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'backup'
                ? 'border-[#059669] text-[#059669]'
                : 'border-transparent text-[#71717A] hover:text-[#18181B]'
            }`}
          >
            Экспорт / Импорт
          </button>
        </div>

        {/* Тело модального окна с прокруткой */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {activeTab === 'rates' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="setting-workshopCutCost" className="block text-[11px] font-semibold text-[#71717A] mb-1">
                    Распил цеха (₽)
                  </label>
                  <input
                    id="setting-workshopCutCost"
                    type="text"
                    inputMode="decimal"
                    value={formData.workshopCutCost ?? ''}
                    onChange={(e) => handleNumberChange('workshopCutCost', e.target.value)}
                    onBlur={() => handleNumberBlur('workshopCutCost', defaultSettings.workshopCutCost)}
                    className="w-full min-h-[42px] px-3 rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] font-bold text-base md:text-sm tabular-nums focus:outline-none focus:border-[#059669]"
                  />
                </div>
                <div>
                  <label htmlFor="setting-deliveryInstallCost" className="block text-[11px] font-semibold text-[#71717A] mb-1">
                    Доставка и монтаж (₽)
                  </label>
                  <input
                    id="setting-deliveryInstallCost"
                    type="text"
                    inputMode="decimal"
                    value={formData.deliveryInstallCost ?? ''}
                    onChange={(e) => handleNumberChange('deliveryInstallCost', e.target.value)}
                    onBlur={() => handleNumberBlur('deliveryInstallCost', defaultSettings.deliveryInstallCost)}
                    className="w-full min-h-[42px] px-3 rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] font-bold text-base md:text-sm tabular-nums focus:outline-none focus:border-[#059669]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="setting-hdfPricePerSheet" className="block text-[11px] font-semibold text-[#71717A] mb-1">
                    Лист ХДФ 3 мм (₽ / 5.8 м²)
                  </label>
                  <input
                    id="setting-hdfPricePerSheet"
                    type="text"
                    inputMode="decimal"
                    value={formData.hdfPricePerSheet ?? ''}
                    onChange={(e) => handleNumberChange('hdfPricePerSheet', e.target.value)}
                    onBlur={() => handleNumberBlur('hdfPricePerSheet', defaultSettings.hdfPricePerSheet)}
                    className="w-full min-h-[42px] px-3 rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] font-bold text-base md:text-sm tabular-nums focus:outline-none focus:border-[#059669]"
                  />
                </div>
                <div>
                  <label htmlFor="setting-edgeRatePerMeter" className="block text-[11px] font-semibold text-[#71717A] mb-1">
                    Кромление ПВХ (₽ / п.м.)
                  </label>
                  <input
                    id="setting-edgeRatePerMeter"
                    type="text"
                    inputMode="decimal"
                    value={formData.edgeRatePerMeter ?? ''}
                    onChange={(e) => handleNumberChange('edgeRatePerMeter', e.target.value)}
                    onBlur={() => handleNumberBlur('edgeRatePerMeter', defaultSettings.edgeRatePerMeter)}
                    className="w-full min-h-[42px] px-3 rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] font-bold text-base md:text-sm tabular-nums focus:outline-none focus:border-[#059669]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="setting-hingePrice" className="block text-[11px] font-semibold text-[#71717A] mb-1">
                    Петля с доводчиком (₽/шт.)
                  </label>
                  <input
                    id="setting-hingePrice"
                    type="text"
                    inputMode="decimal"
                    value={formData.hingePrice ?? ''}
                    onChange={(e) => handleNumberChange('hingePrice', e.target.value)}
                    onBlur={() => handleNumberBlur('hingePrice', defaultSettings.hingePrice)}
                    className="w-full min-h-[42px] px-3 rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] font-bold text-base md:text-sm tabular-nums focus:outline-none focus:border-[#059669]"
                  />
                </div>
                <div>
                  <label htmlFor="setting-slidingSystemPerDoor" className="block text-[11px] font-semibold text-[#71717A] mb-1">
                    Трек купе (₽/дверь)
                  </label>
                  <input
                    id="setting-slidingSystemPerDoor"
                    type="text"
                    inputMode="decimal"
                    value={formData.slidingSystemPerDoor ?? ''}
                    onChange={(e) => handleNumberChange('slidingSystemPerDoor', e.target.value)}
                    onBlur={() => handleNumberBlur('slidingSystemPerDoor', defaultSettings.slidingSystemPerDoor)}
                    className="w-full min-h-[42px] px-3 rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] font-bold text-base md:text-sm tabular-nums focus:outline-none focus:border-[#059669]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="setting-mirrorPricePerM2" className="block text-[11px] font-semibold text-[#71717A] mb-1">
                    Зеркало купе (₽/м² с плёнкой)
                  </label>
                  <input
                    id="setting-mirrorPricePerM2"
                    type="text"
                    inputMode="decimal"
                    value={formData.mirrorPricePerM2 ?? ''}
                    onChange={(e) => handleNumberChange('mirrorPricePerM2', e.target.value)}
                    onBlur={() => handleNumberBlur('mirrorPricePerM2', defaultSettings.mirrorPricePerM2 || 2400)}
                    className="w-full min-h-[42px] px-3 rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] font-bold text-base md:text-sm tabular-nums focus:outline-none focus:border-[#059669]"
                  />
                </div>
                <div>
                  <label htmlFor="setting-drawerHardwareRate" className="block text-[11px] font-semibold text-[#71717A] mb-1">
                    Направляющие ящика (₽)
                  </label>
                  <input
                    id="setting-drawerHardwareRate"
                    type="text"
                    inputMode="decimal"
                    value={formData.drawerHardwareRate ?? ''}
                    onChange={(e) => handleNumberChange('drawerHardwareRate', e.target.value)}
                    onBlur={() => handleNumberBlur('drawerHardwareRate', defaultSettings.drawerHardwareRate)}
                    className="w-full min-h-[42px] px-3 rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] font-bold text-base md:text-sm tabular-nums focus:outline-none focus:border-[#059669]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="setting-baseHardwareRate" className="block text-[11px] font-semibold text-[#71717A] mb-1">
                  Базовый крепеж и ножки (₽)
                </label>
                <input
                  id="setting-baseHardwareRate"
                  type="text"
                  inputMode="decimal"
                  value={formData.baseHardwareRate ?? ''}
                  onChange={(e) => handleNumberChange('baseHardwareRate', e.target.value)}
                  onBlur={() => handleNumberBlur('baseHardwareRate', defaultSettings.baseHardwareRate)}
                  className="w-full min-h-[42px] px-3 rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] font-bold text-base md:text-sm tabular-nums focus:outline-none focus:border-[#059669]"
                />
              </div>
            </div>
          )}

          {activeTab === 'contacts' && (
            <div className="space-y-3.5">
              <div>
                <label htmlFor="setting-masterName" className="block text-[11px] font-semibold text-[#71717A] mb-1">
                  Название цеха / Мастер (для сметы)
                </label>
                <input
                  id="setting-masterName"
                  type="text"
                  value={formData.masterName ?? ''}
                  onChange={(e) => handleChange('masterName', e.target.value)}
                  placeholder="Мастерская мебели"
                  className="w-full min-h-[42px] px-3 rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] font-semibold text-base md:text-sm focus:outline-none focus:border-[#059669]"
                />
              </div>

              <div>
                <label htmlFor="setting-masterPhone" className="block text-[11px] font-semibold text-[#71717A] mb-1">
                  Телефон / Мессенджер
                </label>
                <input
                  id="setting-masterPhone"
                  type="text"
                  inputMode="tel"
                  value={formData.masterPhone ?? ''}
                  onChange={(e) => handleChange('masterPhone', e.target.value)}
                  placeholder="+7 (999) 000-00-00"
                  className="w-full min-h-[42px] px-3 rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] font-semibold text-base md:text-sm tabular-nums focus:outline-none focus:border-[#059669]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="setting-warrantyMonths" className="text-[11px] font-semibold text-[#71717A]">
                    Срок гарантии (мес.)
                  </label>
                  <span className="text-[10px] text-[#71717A]">0 — скрыть из смет</span>
                </div>
                <input
                  id="setting-warrantyMonths"
                  type="text"
                  inputMode="numeric"
                  value={formData.warrantyMonths ?? ''}
                  onChange={(e) => handleNumberChange('warrantyMonths', e.target.value)}
                  onBlur={() => handleNumberBlur('warrantyMonths', defaultSettings.warrantyMonths ?? 12)}
                  placeholder="12"
                  className="w-full min-h-[42px] px-3 rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] font-semibold text-base md:text-sm tabular-nums focus:outline-none focus:border-[#059669]"
                />
              </div>

              <div className="pt-2 border-t border-[#F4F4F5]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-[#71717A]">
                    Ставка налога (Самозанятый / УСН)
                  </span>
                  <span className="font-bold text-[#059669] tabular-nums">{formData.taxRate ?? 0}%</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 4, 6, 7].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => handleChange('taxRate', rate)}
                      className={`min-h-[42px] rounded-lg border font-semibold tabular-nums text-xs transition-colors ${
                        Number(formData.taxRate) === rate
                          ? 'border-[#059669] bg-[#ECFDF5] text-[#059669]'
                          : 'border-[#E4E4E7] bg-[#FAFAFA] text-[#71717A]'
                      }`}
                    >
                      {rate === 0 ? 'Без налога' : `${rate}%`}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-[#71717A] mt-1.5">
                  Налог рассчитывается от итоговой цены заказчика для точного вычисления чистой прибыли мастера.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl border border-[#E4E4E7] bg-[#FAFAFA] space-y-2">
                <div className="flex items-center gap-2 font-bold text-[#18181B]">
                  <Download className="w-4 h-4 text-[#059669]" />
                  <span>Экспорт прайса в JSON</span>
                </div>
                <p className="text-[11px] text-[#71717A]">
                  Сохраните текущие настройки и ставки цеха в файл для переноса на другой телефон или ПК.
                </p>
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="w-full min-h-[42px] rounded-lg border border-[#059669] bg-[#FFFFFF] text-[#059669] font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-[#ECFDF5] transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Скачать JSON файл</span>
                </button>
              </div>

              <div className="p-3.5 rounded-xl border border-[#E4E4E7] bg-[#FAFAFA] space-y-2">
                <div className="flex items-center gap-2 font-bold text-[#18181B]">
                  <Upload className="w-4 h-4 text-[#059669]" />
                  <span>Импорт прайса из JSON</span>
                </div>
                <p className="text-[11px] text-[#71717A]">
                  Загрузите ранее сохранённый файл настроек с автоматической валидацией параметров.
                </p>
                <label className="w-full min-h-[42px] rounded-lg bg-[#059669] text-[#FFFFFF] font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-[#047857] transition-colors cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Выбрать и загрузить JSON</span>
                  <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
                </label>
                {importError && (
                  <div className="flex items-center gap-1.5 text-xs text-[#DC2626] bg-[#FEF2F2] p-2 rounded-lg border border-[#FCA5A5]">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{importError}</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="w-full min-h-[40px] rounded-lg border border-[#E4E4E7] text-[#71717A] hover:text-[#DC2626] hover:border-[#DC2626] font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Сбросить к исходным цехам</span>
              </button>
            </div>
          )}
        </div>

        {/* Футер модального окна */}
        <div className="shrink-0 flex items-center justify-between gap-2 px-5 py-3.5 border-t border-[#E4E4E7] bg-[#FAFAFA]">
          <span className="text-[11px] text-[#71717A]">
            {saveNotice ? (
              <span className="text-[#059669] font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Сохранено в браузере
              </span>
            ) : (
              'Сохраняется локально'
            )}
          </span>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[42px] px-3.5 py-2 rounded-lg border border-[#E4E4E7] text-xs font-semibold text-[#71717A] hover:text-[#18181B]"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="min-h-[42px] px-4 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] text-[#FFFFFF] text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Сохранить</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
