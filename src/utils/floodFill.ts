/**
 * Stack-based flood fill on RGBA ImageData. Mutates `data` in place.
 * Returns bounding box of changed pixels, or null if nothing changed.
 * `filled` (if provided) is set to 1 for each filled pixel index (y * width + x).
 */
export function floodFillImageData(
  imageData: ImageData,
  startX: number,
  startY: number,
  fillR: number,
  fillG: number,
  fillB: number,
  fillA: number,
  tolerance = 32,
  filled?: Uint8Array,
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  const { width, height, data } = imageData;
  if (startX < 0 || startY < 0 || startX >= width || startY >= height) {
    return null;
  }

  const startIdx = (startY * width + startX) * 4;
  const tr = data[startIdx]!;
  const tg = data[startIdx + 1]!;
  const tb = data[startIdx + 2]!;
  const ta = data[startIdx + 3]!;

  const match = (i: number) => {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    const a = data[i + 3]!;
    return (
      Math.abs(r - tr) <= tolerance &&
      Math.abs(g - tg) <= tolerance &&
      Math.abs(b - tb) <= tolerance &&
      Math.abs(a - ta) <= tolerance
    );
  };

  const targetSameAsFill =
    Math.abs(fillR - tr) <= tolerance &&
    Math.abs(fillG - tg) <= tolerance &&
    Math.abs(fillB - tb) <= tolerance &&
    Math.abs(fillA - ta) <= tolerance;

  if (targetSameAsFill) {
    return null;
  }

  const stack: Array<[number, number]> = [[startX, startY]];
  const visited = new Uint8Array(width * height);

  let minX = startX;
  let minY = startY;
  let maxX = startX;
  let maxY = startY;
  let changed = 0;

  while (stack.length > 0) {
    const popped = stack.pop();
    if (!popped) break;
    const [x, y] = popped;
    const vi = y * width + x;
    if (visited[vi]) continue;
    visited[vi] = 1;

    const i = vi * 4;
    if (!match(i)) continue;

    data[i] = fillR;
    data[i + 1] = fillG;
    data[i + 2] = fillB;
    data[i + 3] = fillA;
    if (filled) filled[vi] = 1;
    changed++;

    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;

    if (x > 0) stack.push([x - 1, y]);
    if (x < width - 1) stack.push([x + 1, y]);
    if (y > 0) stack.push([x, y - 1]);
    if (y < height - 1) stack.push([x, y + 1]);
  }

  if (changed === 0) return null;
  return { minX, minY, maxX, maxY };
}
