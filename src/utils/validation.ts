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

export function isValidStoreCode(code: string): boolean {
  return code.trim().length >= 2 && code.trim().length <= 32;
}

export function isValidStoreName(name: string): boolean {
  return name.trim().length >= 2 && name.trim().length <= 120;
}

export function isValidLatitude(latitude: number): boolean {
  return Number.isFinite(latitude) && latitude >= -90 && latitude <= 90;
}

export function isValidLongitude(longitude: number): boolean {
  return Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
}

export function isValidRadiusMeters(radius: number): boolean {
  return Number.isFinite(radius) && radius > 0 && radius <= 5000;
}