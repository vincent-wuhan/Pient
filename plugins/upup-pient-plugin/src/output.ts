export interface BoundedOutput<T> {
  value: T;
  truncated: boolean;
}

export function limitItems<T>(items: readonly T[], limit: number): BoundedOutput<T[]> {
  const boundedLimit = Math.min(Math.max(Math.floor(limit), 0), 50);
  return {
    value: items.slice(0, boundedLimit),
    truncated: items.length > boundedLimit,
  };
}

export function truncateText(text: string, maxLength = 8_000): BoundedOutput<string> {
  const bound = Math.min(Math.max(Math.floor(maxLength), 200), 20_000);
  if (text.length <= bound) return { value: text, truncated: false };
  const marker = `\n\n[truncated; original ${text.length} chars]\n`;
  return {
    value: text.slice(0, bound - marker.length) + marker,
    truncated: true,
  };
}
