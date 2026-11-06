import React, { useState, useEffect, useRef, useCallback } from 'react';

/**
 * ImageCropModal — Canvas-based drag-to-crop for player photos.
 * Props:
 *   imageSrc   {string}  — data URL or object URL of the image to crop
 *   onConfirm  {fn}      — called with (croppedDataUrl: string)
 *   onClose    {fn}      — called when user cancels
 */
export default function ImageCropModal({ imageSrc, onConfirm, onClose }) {
  const canvasRef = useRef(null);
  const [imgEl, setImgEl] = useState(null);

  // Crop rect in image pixels
  const [cropRect, setCropRect] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const dragging = useRef(false);
  const startPt = useRef({ x: 0, y: 0 });
  const [scale, setScale] = useState(1); // canvas draw scale (image px → canvas px)

  // Load image
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.onload = () => {
      setImgEl(img);
      // Default crop = center 80% square
      const side = Math.round(Math.min(img.width, img.height) * 0.8);
      const x = Math.round((img.width - side) / 2);
      const y = Math.round((img.height - side) / 2);
      setCropRect({ x, y, w: side, h: side });
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Draw image + crop overlay onto canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgEl) return;
    const ctx = canvas.getContext('2d');

    // Fit image into 480px wide canvas
    const maxW = 480;
    const sc = Math.min(1, maxW / imgEl.width);
    setScale(sc);
    canvas.width = Math.round(imgEl.width * sc);
    canvas.height = Math.round(imgEl.height * sc);

    // Draw image
    ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);

    // Dark overlay outside crop
    ctx.fillStyle = 'rgba(0,0,0,0.60)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Clear crop area
    const cx = cropRect.x * sc;
    const cy = cropRect.y * sc;
    const cw = cropRect.w * sc;
    const ch = cropRect.h * sc;
    ctx.clearRect(cx, cy, cw, ch);
    ctx.drawImage(imgEl, cropRect.x, cropRect.y, cropRect.w, cropRect.h, cx, cy, cw, ch);

    // Crop border
    ctx.strokeStyle = '#ffd000';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx, cy, cw, ch);

    // Corner handles
    const hs = 10;
    ctx.fillStyle = '#ffd000';
    [[cx, cy], [cx + cw - hs, cy], [cx, cy + ch - hs], [cx + cw - hs, cy + ch - hs]].forEach(
      ([hx, hy]) => ctx.fillRect(hx, hy, hs, hs)
    );

    // Rule-of-thirds grid lines inside crop
    ctx.strokeStyle = 'rgba(255,208,0,0.3)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + (cw / 3) * i, cy);
      ctx.lineTo(cx + (cw / 3) * i, cy + ch);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy + (ch / 3) * i);
      ctx.lineTo(cx + cw, cy + (ch / 3) * i);
      ctx.stroke();
    }
  }, [imgEl, cropRect]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Convert canvas coordinates → image coordinates
  const canvasToImg = (cx, cy) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const sc = canvas.width / rect.width; // CSS scaling
    return {
      x: Math.round((cx - rect.left) * sc / scale),
      y: Math.round((cy - rect.top) * sc / scale),
    };
  };

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const onMouseDown = (e) => {
    dragging.current = true;
    const pt = canvasToImg(e.clientX, e.clientY);
    startPt.current = pt;
    setCropRect({ x: pt.x, y: pt.y, w: 0, h: 0 });
  };

  const onMouseMove = (e) => {
    if (!dragging.current || !imgEl) return;
    const pt = canvasToImg(e.clientX, e.clientY);
    const rawX = Math.min(startPt.current.x, pt.x);
    const rawY = Math.min(startPt.current.y, pt.y);
    const rawW = Math.abs(pt.x - startPt.current.x);
    const rawH = Math.abs(pt.y - startPt.current.y);
    setCropRect({
      x: clamp(rawX, 0, imgEl.width),
      y: clamp(rawY, 0, imgEl.height),
      w: clamp(rawW, 0, imgEl.width - rawX),
      h: clamp(rawH, 0, imgEl.height - rawY),
    });
  };

  const onMouseUp = () => {
    dragging.current = false;
    // If crop is too tiny, reset to full image
    if (cropRect.w < 10 || cropRect.h < 10) {
      if (imgEl) setCropRect({ x: 0, y: 0, w: imgEl.width, h: imgEl.height });
    }
  };

  // Touch support
  const getTouch = (e) => {
    const t = e.touches[0] || e.changedTouches[0];
    return { clientX: t.clientX, clientY: t.clientY };
  };

  const handleConfirm = () => {
    if (!imgEl) return;
    const offscreen = document.createElement('canvas');
    const finalW = Math.max(1, cropRect.w);
    const finalH = Math.max(1, cropRect.h);
    offscreen.width = finalW;
    offscreen.height = finalH;
    const ctx = offscreen.getContext('2d');
    ctx.drawImage(imgEl, cropRect.x, cropRect.y, finalW, finalH, 0, 0, finalW, finalH);
    const dataUrl = offscreen.toDataURL('image/png');
    onConfirm(dataUrl);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#111215] border border-[#262833] rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col gap-4 p-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-black text-base uppercase tracking-wide">Crop Player Photo</h2>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Drag on the image to select the crop area, then click <strong className="text-[#ffd000]">Apply Crop</strong>.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Canvas */}
        <div className="rounded-xl overflow-hidden border border-[#262833] bg-[#0a0b0d] flex items-center justify-center cursor-crosshair select-none">
          {imgEl ? (
            <canvas
              ref={canvasRef}
              className="max-w-full touch-none"
              style={{ display: 'block', cursor: 'crosshair' }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              onTouchStart={(e) => { e.preventDefault(); onMouseDown(getTouch(e)); }}
              onTouchMove={(e) => { e.preventDefault(); onMouseMove(getTouch(e)); }}
              onTouchEnd={(e) => { e.preventDefault(); onMouseUp(); }}
            />
          ) : (
            <div className="p-10 text-slate-500 text-xs">Loading image...</div>
          )}
        </div>

        {/* Crop info */}
        {imgEl && (
          <div className="text-[10px] font-mono text-slate-500 text-center">
            Crop Region: X:{cropRect.x} Y:{cropRect.y} &nbsp;|&nbsp; {cropRect.w} × {cropRect.h} px
            &nbsp;|&nbsp;
            <button
              onClick={() => setCropRect({ x: 0, y: 0, w: imgEl.width, h: imgEl.height })}
              className="text-[#ffd000] underline hover:no-underline"
            >
              Reset (Full Image)
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!imgEl}
            className="flex-1 py-2.5 rounded-xl bg-[#ffd000] hover:bg-yellow-400 text-[#0a0b0d] font-black text-xs uppercase tracking-wider transition disabled:opacity-50"
          >
            ✂ Apply Crop to Card
          </button>
        </div>
      </div>
    </div>
  );
}
