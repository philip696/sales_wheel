export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidGpsAccuracy(
  accuracy: number | null | undefined,
  maxAccuracyMeters = 100
): boolean {
  if (accuracy == null || Number.isNaN(accuracy)) {
    return false;
  }
  return accuracy > 0 && accuracy <= maxAccuracyMeters;
}

export function sanitizeSearchQuery(query: string): string {
  return query.trim().slice(0, 100);
}
