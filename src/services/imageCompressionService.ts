import * as ImageManipulator from 'expo-image-manipulator';

const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.7;

export type CompressedImage = {
  uri: string;
  width: number;
  height: number;
};

function getResizeAction(
  width: number,
  height: number
): ImageManipulator.Action | null {
  const longestSide = Math.max(width, height);

  // Do not upscale smaller images.
  if (longestSide <= MAX_DIMENSION) {
    return null;
  }

  const scale = MAX_DIMENSION / longestSide;

  return {
    resize: {
      width: Math.round(width * scale),
      height: Math.round(height * scale),
    },
  };
}

export async function compressAttendanceImage(
  imageUri: string
): Promise<CompressedImage> {
  if (!imageUri) {
    throw new Error('Attendance image URI is required');
  }

  // First read the image dimensions without changing the image.
  const initialResult = await ImageManipulator.manipulateAsync(
    imageUri,
    [],
    {
      compress: 1,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );

  const resizeAction = getResizeAction(
    initialResult.width,
    initialResult.height
  );

  const actions: ImageManipulator.Action[] = resizeAction
    ? [resizeAction]
    : [];

  const result = await ImageManipulator.manipulateAsync(
    imageUri,
    actions,
    {
      compress: JPEG_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
  };
}