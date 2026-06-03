import { EPS } from "@/lib/drilling/geometry";
import { DEFAULT_MARGIN, type PlotRect } from "./chart-theme";

type Point = Record<string, number>;

export function bounds(points: Point[], xKey: string, yKey: string) {
  if (!points.length) return { minX: -10, maxX: 10, minY: -10, maxY: 10 };
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  points.forEach((point) => {
    minX = Math.min(minX, point[xKey]);
    maxX = Math.max(maxX, point[xKey]);
    minY = Math.min(minY, point[yKey]);
    maxY = Math.max(maxY, point[yKey]);
  });
  const padX = Math.max(8, (maxX - minX) * 0.14);
  const padY = Math.max(8, (maxY - minY) * 0.14);
  return { minX: minX - padX, maxX: maxX + padX, minY: minY - padY, maxY: maxY + padY };
}

export function makeScale(
  width: number,
  height: number,
  bound: ReturnType<typeof bounds>,
  margin = DEFAULT_MARGIN
) {
  const left = margin.left;
  const right = width - margin.right;
  const top = margin.top;
  const bottom = height - margin.bottom;
  const scaleX = (right - left) / Math.max(EPS, bound.maxX - bound.minX);
  const scaleY = (bottom - top) / Math.max(EPS, bound.maxY - bound.minY);
  const plot: PlotRect = { left, top, right, bottom };
  return {
    plot,
    x: (value: number) => left + (value - bound.minX) * scaleX,
    y: (value: number) => bottom - (value - bound.minY) * scaleY,
    bound,
  };
}

export type ChartScaleMap = ReturnType<typeof makeScale>;
