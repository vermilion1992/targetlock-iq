export function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function round(value: number, digits: number): string {
  if (!Number.isFinite(value)) return "--";
  return value.toFixed(digits);
}

export function signed(value: number, digits: number): string {
  if (!Number.isFinite(value)) return "--";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(digits)}`;
}

export function absDeg(value: number, digits: number): string {
  if (!Number.isFinite(value)) return "--";
  return `${Math.abs(value).toFixed(digits)} deg`;
}

export function sentenceStart(text: string): string {
  if (!text || text === "--") return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}
