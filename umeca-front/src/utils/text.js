export function toUpperNoAccent(str) {
  if (!str) return str;
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
}
