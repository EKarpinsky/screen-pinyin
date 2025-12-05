

interface SelectionRectangleProps {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function SelectionRectangle({ left, top, width, height }: SelectionRectangleProps) {
  return (
    <div
      className="absolute pointer-events-none"
      style={{ left, top, width, height }}
    >
      {/* Border */}
      <div className="absolute inset-0 border-2 border-[rgba(26,26,26,0.9)] bg-white/[0.03]" />

      {/* Dimensions label */}
      <div className="absolute -top-10 left-0 bg-black/85 px-3.5 py-2 text-[13px] font-mono text-white">
        {Math.round(width)} × {Math.round(height)}
      </div>
    </div>
  );
}

