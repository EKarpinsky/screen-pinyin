import screenshot from 'screenshot-desktop';
import sharp from 'sharp';

export async function captureScreen(): Promise<Buffer> {
  const imgBuffer = await screenshot({ format: 'png' });
  return imgBuffer;
}

export async function cropImage(
  imageBuffer: Buffer,
  selection: { x: number; y: number; width: number; height: number }
): Promise<Buffer> {
  // Ensure we have valid dimensions
  const { x, y, width, height } = selection;
  
  if (width <= 0 || height <= 0) {
    throw new Error('Invalid selection dimensions');
  }

  const croppedBuffer = await sharp(imageBuffer)
    .extract({
      left: Math.round(x),
      top: Math.round(y),
      width: Math.round(width),
      height: Math.round(height),
    })
    .png()
    .toBuffer();

  return croppedBuffer;
}

