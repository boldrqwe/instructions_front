export function clampSnippet(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }
  const trimmed = value.slice(0, maxLength);
  const lastSpace = trimmed.lastIndexOf(' ');
  const safeSlice = lastSpace > 0 ? trimmed.slice(0, lastSpace) : trimmed;
  return `${safeSlice}…`;
}
