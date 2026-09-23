export function onlyDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, 8);
}

export function formatDni(value: string) {
  const digits = onlyDigits(value);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) {
    return `${digits.slice(0, digits.length - 3)}.${digits.slice(-3)}`;
  }
  return `${digits.slice(0, digits.length - 6)}.${digits.slice(-6, -3)}.${digits.slice(-3)}`;
}

export function isValidDni(value: string) {
  const digits = onlyDigits(value);
  return digits.length === 7 || digits.length === 8;
}
