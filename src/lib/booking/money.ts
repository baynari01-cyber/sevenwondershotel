import Decimal from "decimal.js";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };

export type MoneyInput = Decimal | number | string;

export function money(value: MoneyInput): Decimal {
  return new Decimal(value);
}

/** Round to 2 decimals using half-up rounding (JOD is conventionally quoted with 2 or 3 decimals; demo uses 2). */
export function round2(value: Decimal): Decimal {
  return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function sum(values: Decimal[]): Decimal {
  return values.reduce((acc, v) => acc.plus(v), new Decimal(0));
}

export function toFixed2(value: Decimal): string {
  return round2(value).toFixed(2);
}

export function toNumber(value: Decimal): number {
  return round2(value).toNumber();
}
