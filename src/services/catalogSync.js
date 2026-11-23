export const DEFAULT_SHEET_ID = '13ayOWuguJ7WKF5v3Y2OWCEFFJebbq45q9zre2FCTqj8';
export const DEFAULT_DOC_ID = '1Y4xbmQfNfod9OgWho3KisrtdUVzZwIo74VSbmhJ2ZJU';
export const STORAGE_CATALOG_KEY = 'furniture_calc_catalog_v1';

export async function fetchGoogleCatalog(sourceId = DEFAULT_SHEET_ID, mode = 'sheet') {
  const cleanId = (sourceId || '').trim();
  let url = cleanId;
  if (!cleanId.startsWith('http')) {
    url =
      mode === 'doc'
        ? `https://docs.google.com/document/d/${cleanId}/export?format=txt`
        : `https://docs.google.com/spreadsheets/d/${cleanId}/gviz/tq?tqx=out:csv`;
  }

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));

  const materials = [];
  const hardwareTypes = [];
  const services = {};

  for (const line of lines) {
    const delim = line.includes('|') ? '|' : line.includes(';') ? ';' : ',';
    const parts = line.split(delim).map((c) => c.replace(/^"|"$/g, '').trim());
    if (parts.length < 4) continue;
    const cat = parts[0].toLowerCase();
    const id = parts[1];
    const name = parts[2];
    const price = Number(String(parts[3]).replace(/[^\d.]/g, ''));
    const mult = Number(String(parts[4] || '1').replace(',', '.')) || 1;
    const note = parts[6] || '';

    if (cat === 'material' && name && price > 0) {
      materials.push({
        id: id || `mat_${materials.length}`,
        name,
        pricePerSheet: price,
        sheetAreaM2: 5.03,
      });
    } else if (cat === 'hardware' && name) {
      hardwareTypes.push({
        id: id || `hw_${hardwareTypes.length}`,
        name,
        subtitle: note || (mult > 1 ? `+${Math.round((mult - 1) * 100)}% к фурнитуре` : 'Базовая комплектация'),
        multiplier: mult,
      });
    } else if (cat === 'service' && price > 0) {
      if (id === 'drawer_rate') services.drawerHardwareRate = price;
      if (id === 'workshop_cut') services.workshopCutCost = price;
      if (id === 'delivery_install') services.deliveryInstallCost = price;
      if (id === 'sheet_area') services.sheetAreaM2 = price;
    }
  }

  return { materials, hardwareTypes, services };
}
