import en from './en';
import si from './si';
import ta from './ta';

const catalogs = { en, si, ta };

function deepMerge(base, overlay) {
  const out = { ...base };
  Object.keys(overlay || {}).forEach((key) => {
    if (
      overlay[key] &&
      typeof overlay[key] === 'object' &&
      !Array.isArray(overlay[key])
    ) {
      out[key] = deepMerge(base[key] || {}, overlay[key]);
    } else {
      out[key] = overlay[key];
    }
  });
  return out;
}

export function t(key, lang = 'en') {
  const parts = key.split('.');
  const catalog = deepMerge(en, catalogs[lang] || {});
  let node = catalog;
  for (const p of parts) {
    node = node?.[p];
  }
  if (node === undefined && lang !== 'en') {
    return t(key, 'en');
  }
  return node ?? key;
}

export function isFullyTranslated(lang) {
  return lang === 'en';
}

export { en };
