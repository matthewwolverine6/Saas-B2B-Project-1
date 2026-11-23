import React from 'react';
import { formatRub } from '../utils/estimateFormatters';

export default function PrintSheet({
  calculation,
  settings,
  facadeType,
  coupeFilling,
  drawers,
  wireframeGeometry,
  clientInfo,
  isConfirmed,
  allCalculations = [],
}) {
  if (!calculation.isValid) return null;

  const { H, W, D, sections, shelvesCount, material, hardware, finalPrice } = calculation;
  const dateStr = new Date().toLocaleDateString('ru-RU');
  const drawersText = drawers === 0 ? 'без ящиков' : `${drawers} выкатных ящ.`;
  const validAll = allCalculations.filter((c) => c && c.isValid);

  let facadeLabel = `Распашные створки (${material.name})`;
  if (facadeType === 'sliding') {
    const fCount = sections <= 2 ? 2 : 3;
    let fill = 'ЛДСП 16 мм';
    if (coupeFilling === 'mirror') fill = 'Зеркало с бронь-пленкой';
    if (coupeFilling === 'combo') fill = 'Комби (ЛДСП + Зеркало)';
    facadeLabel = `Система купе (${fCount} дв., ${fill})`;
  } else if (facadeType === 'none') {
    facadeLabel = 'Открытый корпус (без фасадов)';
  }

  return (
    <div className="print-only font-sans text-black p-2 bg-white max-w-[760px] mx-auto text-xs leading-normal">
      {/* Шапка бланка */}
      <div className="border-b-2 border-black pb-2 mb-2 flex justify-between items-start print-card break-inside-avoid">
        <div>
          <h1 className="text-lg font-bold tracking-tight uppercase leading-tight">{settings.masterName}</h1>
          <p className="text-[11px] text-gray-700 mt-0.5">
            Тел: {settings.masterPhone} · Индивидуальное изготовление мебели
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold uppercase tracking-wider">Бланк замера и смета</div>
          <div className="text-[11px] text-gray-600 mt-0.5 tabular-nums">Дата: {dateStr}</div>
          <div className="mt-1">
            {isConfirmed || calculation.isConfirmed ? (
              <span className="inline-block border border-black px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-white">
                ✔ Замеры согласованы
              </span>
            ) : (
              <span className="inline-block border border-dashed border-gray-400 px-1.5 py-0.5 text-[9px] text-gray-600 uppercase tracking-wide">
                Предварительный расчёт
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Данные клиента и адрес объекта */}
      <div className="border border-black p-2 mb-2.5 flex justify-between items-center text-[11px] bg-gray-50 print-card break-inside-avoid">
        <div>
          <span className="font-bold">Заказчик:</span> {clientInfo?.name ? clientInfo.name : '—'}
          {clientInfo?.phone && <span className="ml-2 font-mono">({clientInfo.phone})</span>}
        </div>
        <div>
          <span className="font-bold">Адрес замера / монтажа:</span> {clientInfo?.address ? clientInfo.address : 'Уточняется при договоре'}
        </div>
      </div>

      {/* Основной блок: Чертёж слева, спецификация справа */}
      <div className="grid grid-cols-12 gap-3 items-start mb-2.5 print-card break-inside-avoid">
        {/* Чертёж изделия */}
        <div className="col-span-5 border border-black p-1.5 flex flex-col items-center">
          <div className="text-[10px] font-bold uppercase mb-1 text-center">Ортогональная схема</div>
          <svg viewBox="0 0 240 164" className="w-full h-[125px]" role="img" aria-label="Схема шкафа">
            <polygon
              points={`${wireframeGeometry.startX},${wireframeGeometry.startY} ${
                wireframeGeometry.startX + wireframeGeometry.isoX
              },${wireframeGeometry.startY - wireframeGeometry.isoY} ${
                wireframeGeometry.startX + wireframeGeometry.boxW + wireframeGeometry.isoX
              },${wireframeGeometry.startY - wireframeGeometry.isoY} ${
                wireframeGeometry.startX + wireframeGeometry.boxW
              },${wireframeGeometry.startY}`}
              fill="#F4F4F5"
              stroke="#000"
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
              stroke="#000"
              strokeWidth="1"
            />
            <rect
              x={wireframeGeometry.startX}
              y={wireframeGeometry.startY}
              width={wireframeGeometry.boxW}
              height={wireframeGeometry.boxH}
              fill="#FFFFFF"
              stroke="#000"
              strokeWidth="1.5"
            />

            {sections > 1 && (
              <line
                x1={wireframeGeometry.startX + wireframeGeometry.boxW / 2}
                y1={wireframeGeometry.startY}
                x2={wireframeGeometry.startX + wireframeGeometry.boxW / 2}
                y2={
                  wireframeGeometry.startY +
                  wireframeGeometry.boxH -
                  Math.min(wireframeGeometry.boxH * 0.55, drawers * 11)
                }
                stroke="#666"
                strokeWidth="1"
                strokeDasharray={facadeType === 'none' ? '3 2' : 'none'}
              />
            )}

            {Array.from({ length: drawers }).map((_, idx) => {
              const drawerZoneHeight = Math.min(wireframeGeometry.boxH * 0.55, drawers * 11);
              const singleH = drawerZoneHeight / drawers;
              const yPos = wireframeGeometry.startY + wireframeGeometry.boxH - (idx + 1) * singleH;
              return (
                <g key={idx}>
                  <rect
                    x={wireframeGeometry.startX + 2}
                    y={yPos}
                    width={wireframeGeometry.boxW - 4}
                    height={Math.max(4, singleH - 1)}
                    fill="#F0FDF4"
                    stroke="#000"
                    strokeWidth="1"
                  />
                  <line
                    x1={wireframeGeometry.startX + wireframeGeometry.boxW / 2 - 8}
                    y1={yPos + singleH / 2}
                    x2={wireframeGeometry.startX + wireframeGeometry.boxW / 2 + 8}
                    y2={yPos + singleH / 2}
                    stroke="#000"
                    strokeWidth="1"
                  />
                </g>
              );
            })}
          </svg>
          <div className="text-center font-bold text-xs mt-0.5 tabular-nums">
            {H} × {W} × {D} мм
          </div>
        </div>

        {/* Спецификация изделия */}
        <div className="col-span-7 border border-black p-2.5 space-y-1 text-[11px]">
          <div className="text-[10px] font-bold uppercase border-b border-black pb-0.5 mb-1">
            Спецификация материалов и наполнения
          </div>
          <div className="flex justify-between py-0.5 border-b border-gray-200">
            <span className="text-gray-600">Габариты (В×Ш×Г):</span>
            <span className="font-bold tabular-nums">{H} × {W} × {D} мм</span>
          </div>
          {calculation.quantity > 1 && (
            <div className="flex justify-between py-0.5 border-b border-gray-200 bg-gray-50 px-1">
              <span className="text-gray-700 font-semibold">Количество:</span>
              <span className="font-bold tabular-nums">{calculation.quantity} шт.</span>
            </div>
          )}
          <div className="flex justify-between py-0.5 border-b border-gray-200">
            <span className="text-gray-600">Материал корпуса:</span>
            <span className="font-bold">{material.name}</span>
          </div>
          <div className="flex justify-between py-0.5 border-b border-gray-200">
            <span className="text-gray-600">Фасадная система:</span>
            <span className="font-bold">{facadeLabel}</span>
          </div>
          <div className="flex justify-between py-0.5 border-b border-gray-200">
            <span className="text-gray-600">Наполнение:</span>
            <span className="font-bold tabular-nums">{sections} секции, {shelvesCount} полок, {drawersText}</span>
          </div>
          <div className="flex justify-between py-0.5 border-b border-gray-200">
            <span className="text-gray-600">Фурнитура:</span>
            <span className="font-bold">{hardware.name}</span>
          </div>
          <div className="flex justify-between py-0.5 border-b border-gray-200">
            <span className="text-gray-600">Задняя стенка:</span>
            <span className="font-bold">ХДФ 3 мм высокой плотности</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-gray-600">Облицовка торцов:</span>
            <span className="font-bold">Кромка ПВХ 1.0 мм (ЧПУ)</span>
          </div>
        </div>
      </div>

      {/* Комплекс работ под ключ */}
      <div className="border border-black p-2 mb-2.5 print-card break-inside-avoid">
        <div className="text-[10px] font-bold uppercase mb-1">Включено в стоимость заказа под ключ:</div>
        <div className="grid grid-cols-3 gap-1.5 text-[10px]">
          <div>✔ Раскрой деталей на ЧПУ</div>
          <div>✔ Присадка отверстий</div>
          <div>✔ Монтаж и регулировка</div>
          <div>✔ Облицовка кромкой ПВХ</div>
          <div>✔ Доставка на адрес</div>
          {settings?.warrantyMonths > 0 && (
            <div>✔ Гарантия {settings.warrantyMonths} мес.</div>
          )}
        </div>
      </div>

      {/* Сводный перечень изделий по объекту (если в заказе 2+ изделия) */}
      {validAll.length > 1 && (
        <div className="border border-black p-2 mb-2 bg-gray-50 text-[10px] print-card break-inside-avoid">
          <div className="flex justify-between items-center font-bold uppercase mb-1 border-b border-gray-300 pb-0.5">
            <span>Все изделия на замере ({validAll.length} поз.):</span>
            <span className="font-black tabular-nums">
              Общий итог по заказу: {formatRub(validAll.reduce((acc, c) => acc + c.finalPrice, 0))}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
            {validAll.map((item, idx) => (
              <div key={idx} className="flex justify-between py-0.5 border-b border-gray-200 print-row break-inside-avoid">
                <span className="truncate pr-1">
                  {idx + 1}. {item.itemName || `Изделие ${idx + 1}`} ({item.H}×{item.W}×{item.D}{item.quantity > 1 ? `, ${item.quantity} шт.` : ''})
                </span>
                <span className="font-bold tabular-nums shrink-0">{formatRub(item.finalPrice)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Финансовый итог */}
      <div className="border-2 border-black p-2.5 mb-3 flex justify-between items-center bg-gray-50 print-card break-inside-avoid">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider">
            {calculation.quantity > 1
              ? `Итоговая стоимость за ${calculation.quantity} шт. под ключ:`
              : 'Итоговая стоимость под ключ:'}
          </div>
          <div className="text-[10px] text-gray-600">
            {calculation.quantity > 1
              ? `По ${formatRub(calculation.unitFinalPrice)} / шт. (материалы, фурнитура, доставка и монтаж)`
              : 'Материалы, фурнитура, доставка и профессиональный монтаж'}
          </div>
        </div>
        <div className="text-xl font-black tabular-nums">{formatRub(finalPrice)}</div>
      </div>

      {/* Условия и подписи */}
      <div className="space-y-3 pt-1 print-card break-inside-avoid">
        <div className="text-[10px] text-gray-700 leading-tight">
          <strong>Порядок оплаты:</strong> 50% аванс при подписании договора, окончательный расчёт 50% после приёмки работ.
          Срок изготовления: 7–10 рабочих дней.
        </div>

        <div className="grid grid-cols-2 gap-6 pt-3 border-t border-gray-400">
          <div>
            <div className="text-[11px] font-bold mb-3">Заказчик: {clientInfo?.name ? clientInfo.name : ''}</div>
            <div className="border-b border-black pb-1 mb-0.5"></div>
            <div className="text-[9px] text-gray-500 flex justify-between">
              <span>(подпись)</span>
              <span>(Ф.И.О.)</span>
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold mb-3">Исполнитель ({settings.masterName}):</div>
            <div className="border-b border-black pb-1 mb-0.5"></div>
            <div className="text-[9px] text-gray-500 flex justify-between">
              <span>(подпись)</span>
              <span>(Ф.И.О.)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
