export function moneyToNumeric(value: number): string {
  return value.toFixed(2);
}

export function sumNumericMoney(values: string[]): number {
  const cents = values.reduce((total, value) => {
    const [whole = "0", fraction = ""] = value.split(".");
    const minor = BigInt(`${fraction}00`.slice(0, 2));
    return total + BigInt(whole) * 100n + minor;
  }, 0n);
  return Number(cents) / 100;
}
