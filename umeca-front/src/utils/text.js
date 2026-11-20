export function toUpperNoAccent(str) {
  if (!str) return str;
  return str
    .toUpperCase()
    .split('')
    .map(c => c === 'Ñ' ? 'Ñ' : c.normalize('NFD').replace(/[̀-ͯ]/g, ''))
    .join('');
}
