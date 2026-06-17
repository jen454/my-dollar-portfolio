import { useEffect, useRef, useState } from "react";
import { colors } from "@toss/tds-colors";

const SNAP_WIDTH = 130; // 수정 65px + 삭제 65px
const THRESHOLD = 40;

interface Props {
  children: React.ReactNode;
  onEdit: () => void;
  onDelete: () => void;
  openKey: string | null;
  itemKey: string;
  onSwipeOpen: (key: string) => void;
}

export function SwipeableItem({ children, onEdit, onDelete, openKey, itemKey, onSwipeOpen }: Props) {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef<number | null>(null);
  const isOpen = openKey === itemKey;

  useEffect(() => {
    if (!isOpen) setOffset(0);
  }, [isOpen]);

  function handleStart(clientX: number) {
    startXRef.current = clientX;
    setIsDragging(true);
  }

  function handleMove(clientX: number) {
    if (startXRef.current === null) return;
    const dx = clientX - startXRef.current;
    const base = isOpen ? -SNAP_WIDTH : 0;
    setOffset(Math.min(0, Math.max(-SNAP_WIDTH, base + dx)));
  }

  function handleEnd() {
    setIsDragging(false);
    startXRef.current = null;
    const snapThreshold = isOpen ? SNAP_WIDTH - THRESHOLD : THRESHOLD;
    if (-offset >= snapThreshold) {
      setOffset(-SNAP_WIDTH);
      onSwipeOpen(itemKey);
    } else {
      setOffset(0);
    }
  }

  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      {/* 액션 버튼 */}
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, display: "flex", width: SNAP_WIDTH }}>
        <button
          onClick={onEdit}
          style={{
            width: 65,
            background: colors.blue500,
            border: "none",
            cursor: "pointer",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          수정
        </button>
        <button
          onClick={onDelete}
          style={{
            width: 65,
            background: colors.red500,
            border: "none",
            cursor: "pointer",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          삭제
        </button>
      </div>

      {/* 콘텐츠 */}
      <div
        style={{
          transform: `translateX(${offset}px)`,
          transition: isDragging ? "none" : "transform 0.2s ease",
          background: colors.background,
          position: "relative",
          zIndex: 1,
          userSelect: "none",
        }}
        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}
        onMouseDown={(e) => handleStart(e.clientX)}
        onMouseMove={(e) => { if (startXRef.current !== null) handleMove(e.clientX); }}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
      >
        {children}
      </div>
    </div>
  );
}
