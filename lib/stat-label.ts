/** "104" → "100+",  "47" → "47+",  "1204" → "1,200+" */
export function statLabel(n: number): string {
  if (n >= 1000) return `${Math.floor(n / 100) * 100}+`.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (n >= 100) return `${Math.floor(n / 10) * 10}+`;
  return `${n}+`;
}
