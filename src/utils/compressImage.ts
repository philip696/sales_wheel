import * as ImageManipulator from 'expo-image-manipulator';

const MAX_DIMENSION = 1280;
const TARGET_SIZE_BYTES = 150 * 1024;
const MIN_QUALITY = 0.25;

const QUALITY_LEVELS = [0.7, 0.6, 0.5, 0.4, 0.3, MIN_QUALITY];

async function getFileSize(uri: string): Promise<number> {
  const response = await fetch(uri);
  const blob = await response.blob();
  return blob.size;
}

async function compressAtQuality(
  uri: string,
  quality: number,
  maxDimension: number,
): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [
      {
        resize: {
          width: maxDimension,
        },
      },
    ],
    {
      compress: quality,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );

  return result.uri;
}

/**
 * Compresses an attendance photo before upload.
 *
 * Goals:
 * - JPEG
 * - Maximum dimension: 1280px
 * - Target size: approximately <= 150 KB
 * - Never modifies the original camera file
 */
export async function compressAttendancePhoto(
  sourceUri: string,
): Promise<string> {
  let bestUri = sourceUri;
  let bestSize = Number.MAX_SAFE_INTEGER;

  // First pass: resize and progressively reduce JPEG quality.
  for (const quality of QUALITY_LEVELS) {
    const compressedUri = await compressAtQuality(
      sourceUri,
      quality,
      MAX_DIMENSION,
    );

    const size = await getFileSize(compressedUri);

    if (size < bestSize) {
      bestUri = compressedUri;
      bestSize = size;
    }

    if (size <= TARGET_SIZE_BYTES) {
      return compressedUri;
    }
  }

  // If quality alone wasn't enough, reduce dimensions.
  const smallerDimensions = [1024, 896, 768, 640];

  for (const dimension of smallerDimensions) {
    for (const quality of QUALITY_LEVELS) {
      const compressedUri = await compressAtQuality(
        sourceUri,
        quality,
        dimension,
      );

      const size = await getFileSize(compressedUri);

      if (size < bestSize) {
        bestUri = compressedUri;
        bestSize = size;
      }

      if (size <= TARGET_SIZE_BYTES) {
        return compressedUri;
      }
    }
  }

  // Return the smallest result we managed to produce.
  return bestUri;
}