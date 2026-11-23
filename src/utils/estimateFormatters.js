export function formatRub(value) {
  return new Intl.NumberFormat('ru-RU').format(Math.round(value)) + ' ₽';
}

/**
 * Безопасное копирование в буфер обмена для file:// и WebView
 * Без рывка скролла страницы и с поддержкой старых браузеров
 */
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {}

  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '0';
    ta.style.width = '1px';
    ta.style.height = '1px';
    ta.style.padding = '0';
    ta.style.border = 'none';
    ta.style.outline = 'none';
    ta.style.boxShadow = 'none';
    ta.style.background = 'transparent';
    ta.style.opacity = '0';
    ta.style.pointerEvents = 'none';
    document.body.appendChild(ta);
    ta.focus({ preventScroll: true });
    ta.select();
    ta.setSelectionRange(0, 999999);
    const success = document.execCommand('copy');
    document.body.removeChild(ta);
    return success;
  } catch (err) {
    console.error('Copy failed:', err);
    return false;
  }
}

export function generateAvitoText({ calculation, settings, facadeType, coupeFilling, drawers, clientInfo }) {
  if (!calculation.isValid) {
    return 'Укажите корректные размеры шкафа для формирования шаблона ответа клиенту.';
  }

  const { H, W, D, material, hardware, finalPrice, costPrice, deliveryInstallCost } = calculation;

  const optFinal = finalPrice;
  const econBaseCost = Math.round(costPrice * 0.8);
  const econFinal = Math.min(optFinal - 1500, Math.round(econBaseCost * 1.35 + deliveryInstallCost));
  const premFinal = Math.max(optFinal + 2500, Math.round(finalPrice * 1.32));

  let facadeLabel = 'Распашные створки ЛДСП';
  if (facadeType === 'sliding') {
    if (coupeFilling === 'mirror') facadeLabel = 'Система купе (Зеркало серебро с бронь-пленкой)';
    else if (coupeFilling === 'combo') facadeLabel = 'Система купе (Комби: ЛДСП + Зеркало)';
    else facadeLabel = 'Система купе (Полотна ЛДСП 16 мм)';
  } else if (facadeType === 'none') {
    facadeLabel = 'Открытый корпус (без фасадов)';
  }

  const drawersText = drawers === 0 ? 'без ящиков' : `${drawers} выкатных ящ.`;
  const greeting = clientInfo?.name ? `Здравствуйте, ${clientInfo.name}!` : `Здравствуйте!`;

  return [
    `${greeting} Сделал точный цеховой расчёт шкафа по размерам ${H}×${W}×${D} мм:`,
    ``,
    `📋 Комплектация:`,
    `• Материал: ${material.name}`,
    `• Фасады: ${facadeLabel}`,
    `• Фурнитура: ${hardware.name}`,
    `• Наполнение: ${calculation.sections} секции, ${calculation.shelvesCount} полок, ${drawersText}`,
    `• Раскрой на ЧПУ, кромление ПВХ, доставка и монтаж включены`,
    ``,
    `💰 Варианты исполнения (вилка цен):`,
    `1. «Эконом» (базовая комплектация): от ${formatRub(econFinal)}`,
    `2. «Оптимум» (как в описании выше): ${formatRub(optFinal)} — рекомендуемый вариант`,
    `3. «Премиум» (фасады МДФ/Egger + петли/направляющие Blum): от ${formatRub(premFinal)}`,
    ``,
    `⏱ Срок изготовления: 7–10 рабочих дней.${settings?.warrantyMonths > 0 ? ` Гарантия: ${settings.warrantyMonths} мес.` : ''}`,
    `Выезжаю на замер с образцами всех материалов и декоров. Напишите, когда вам удобно принять замерщика?`,
    ``,
    `Контакты мастера: ${settings.masterName}, тел. ${settings.masterPhone}`,
  ].join('\n');
}

export function generateMessengerText({
  calculation,
  settings,
  facadeType,
  coupeFilling,
  drawers,
  clientInfo,
  allCalculations = [],
}) {
  if (!calculation.isValid) return '';

  const dateStr = new Date().toLocaleDateString('ru-RU');
  const lines = [];

  lines.push(`СМЕТА НА КОРПУСНУЮ МЕБЕЛЬ ПО ИНДИВИДУАЛЬНОМУ ПРОЕКТУ`);
  lines.push(`Дата: ${dateStr}`);
  lines.push(`Исполнитель: ${settings.masterName} (тел. ${settings.masterPhone})`);
  if (clientInfo?.name || clientInfo?.address || clientInfo?.phone) {
    const parts = [];
    if (clientInfo.name) parts.push(`Заказчик: ${clientInfo.name}`);
    if (clientInfo.phone) parts.push(`тел. ${clientInfo.phone}`);
    if (clientInfo.address) parts.push(`Адрес: ${clientInfo.address}`);
    lines.push(parts.join(' · '));
  }
  lines.push(`────────────────────────────────────────────`);

  // Если это мульти-заказ с несколькими валидными изделиями
  const validItems = allCalculations.filter((c) => c && c.isValid);
  if (validItems.length > 1) {
    let grandTotal = 0;
    lines.push(`СПИСОК ИЗДЕЛИЙ ПО ОБЪЕКТУ (${validItems.length} поз.):\n`);
    validItems.forEach((item, idx) => {
      grandTotal += item.finalPrice;
      let fLabel = `Распашные (${item.material.name})`;
      if (item.facadeType === 'sliding') {
        fLabel = item.coupeFilling === 'mirror' ? 'Купе (Зеркало)' : item.coupeFilling === 'combo' ? 'Купе (Комби)' : 'Купе (ЛДСП)';
      } else if (item.facadeType === 'none') {
        fLabel = 'Открытый корпус';
      }
      const qty = item.quantity || 1;
      const qtyStr = qty > 1 ? ` (${qty} шт.)` : '';
      const priceStr = qty > 1 ? `${formatRub(item.finalPrice)} (${formatRub(item.unitFinalPrice)} / шт.)` : formatRub(item.finalPrice);
      lines.push(`${idx + 1}. ${item.itemName || `Изделие ${idx + 1}`}: ${item.H}×${item.W}×${item.D} мм${qtyStr}`);
      lines.push(`   • Фасады: ${fLabel}, ${item.drawers} ящ. — ${priceStr}`);
    });
    lines.push(`\n────────────────────────────────────────────`);
    lines.push(`ОБЩАЯ СУММА ПО ВСЕМУ ОБЪЕКТУ: ${formatRub(grandTotal)}`);
    lines.push(`────────────────────────────────────────────`);
    lines.push(`В стоимость под ключ включены: ЧПУ раскрой, кромление ПВХ, присадка, доставка и монтаж.`);
    const warrantyMulti = settings?.warrantyMonths > 0 ? ` Гарантия: ${settings.warrantyMonths} мес.` : '';
    lines.push(`Срок готовности: 7–10 рабочих дней.${warrantyMulti}`);
    return lines.join('\n');
  }

  // Одиночный расчет
  const { H, W, D, sections, shelvesCount, material, hardware, finalPrice } = calculation;
  const drawersText = drawers === 0 ? 'без ящиков' : `${drawers} выкатных ящика(-ов)`;

  let facadeText = `Распашные створки (${material.name})`;
  if (facadeType === 'sliding') {
    const fCount = sections <= 2 ? 2 : 3;
    if (coupeFilling === 'mirror') facadeText = `Раздвижная система купе (${fCount} дв., зеркало с бронь-пленкой)`;
    else if (coupeFilling === 'combo') facadeText = `Раздвижная система купе (${fCount} дв., комбинированные ЛДСП + зеркало)`;
    else facadeText = `Раздвижная система купе (${fCount} дв., ЛДСП 16 мм)`;
  } else if (facadeType === 'none') {
    facadeText = 'Открытая система полок (без фасадов)';
  }

  lines.push(`1. Спецификация изделия:`);
  lines.push(`• Габариты (В×Ш×Г): ${H} × ${W} × ${D} мм`);
  const singleQty = calculation.quantity || 1;
  if (singleQty > 1) {
    lines.push(`• Количество: ${singleQty} шт. (${formatRub(calculation.unitFinalPrice)} / шт.)`);
  }
  lines.push(`• Каркас: ${material.name}`);
  lines.push(`• Фасады: ${facadeText}`);
  lines.push(`• Внутреннее наполнение: ${sections} секции, ${shelvesCount} полок, ${drawersText}`);
  lines.push(`• Комплектация фурнитуры: ${hardware.name}`);
  lines.push(`• Задняя стенка: ХДФ 3 мм (высокой плотности)`);
  lines.push(``);
  lines.push(`2. Производственные работы под ключ:`);
  lines.push(`• Высокоточный раскрой на станках с ЧПУ`);
  lines.push(`• Кромкооблицовка торцов ударопрочной кромкой ПВХ`);
  lines.push(`• Заводская присадка под крепежи и направляющие`);
  lines.push(`• Бережная доставка и профессиональная сборка`);
  lines.push(`────────────────────────────────────────────`);
  const totalLabel = singleQty > 1 ? `ИТОГОВАЯ СТОИМОСТЬ ЗА ${singleQty} ШТ. ПОД КЛЮЧ: ${formatRub(finalPrice)}` : `ИТОГОВАЯ СТОИМОСТЬ ПОД КЛЮЧ: ${formatRub(finalPrice)}`;
  lines.push(totalLabel);
  const warrantySingle = settings?.warrantyMonths > 0 ? ` Гарантия: ${settings.warrantyMonths} мес.` : '';
  lines.push(`Срок готовности: 7–10 рабочих дней.${warrantySingle}`);
  lines.push(`Условия: 50% предоплата при согласовании проекта, 50% после монтажа.`);

  return lines.join('\n');
}
