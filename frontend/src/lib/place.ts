/** "City, Country" using the list separator of the current UI language. */
export function joinPlace(...parts: (string | null | undefined)[]): string {
  const sep = document.documentElement.lang === 'ar' ? '، ' : ', '
  return parts.filter(Boolean).join(sep)
}
