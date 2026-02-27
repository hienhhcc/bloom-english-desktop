"use client";

export function TitleBar() {
  const handleDoubleClick = () => {
    if (typeof window !== "undefined" && (window as any).windowControls) {
      (window as any).windowControls.toggleMaximize();
    }
  };

  return (
    <div
      onDoubleClick={handleDoubleClick}
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      className="fixed top-0 left-0 right-0 h-9 z-50 select-none"
    />
  );
}
