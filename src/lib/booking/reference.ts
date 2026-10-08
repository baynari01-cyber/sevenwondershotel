/** Human-friendly, unique-enough reservation references: SW-YYMM-XXXXX (letters avoid 0/O/1/I confusion). */
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function generateReference(now: Date = new Date(), entropy?: number): string {
  const yy = String(now.getUTCFullYear()).slice(2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  let n = typeof entropy === "number" ? (entropy * 2654435761 + now.getTime()) >>> 0 : Math.floor(Math.random() * 2 ** 32);
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += ALPHABET[n % ALPHABET.length];
    n = Math.floor(n / ALPHABET.length) ^ (i * 7919);
    n = n >>> 0;
  }
  return `SW-${yy}${mm}-${code}`;
}

export function isReferenceLike(value: string): boolean {
  return /^SW-\d{4}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{5}$/.test(value.trim().toUpperCase());
}
