"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useLang } from "./LangProvider";

/**
 * A dinner's photos: the first at its own shape, the rest as square thumbnails.
 * Tapping any opens it full screen, uncropped, to swipe or arrow through.
 */
export function Gallery({ photos }: { photos: string[] }) {
  const { t } = useLang();
  const [open, setOpen] = useState<number | null>(null);
  const [lead, ...rest] = photos;

  return (
    <section className="ev-gallery" aria-label={t.evPhotos}>
      <button className="ev-shot lead" onClick={() => setOpen(0)} aria-label={t.phOpen(1, photos.length)}>
        <Image src={lead} alt="" width={1600} height={1067} sizes="(max-width: 1228px) 100vw, 1180px" priority />
      </button>
      {rest.length > 0 && (
        <div className="ev-thumbs">
          {rest.map((src, i) => (
            <button key={src} className="ev-shot" onClick={() => setOpen(i + 1)} aria-label={t.phOpen(i + 2, photos.length)}>
              <Image src={src} alt="" width={600} height={600} sizes="(max-width: 640px) 50vw, 390px" />
            </button>
          ))}
        </div>
      )}
      {open !== null && <Viewer photos={photos} index={open} onChange={setOpen} onClose={() => setOpen(null)} />}
    </section>
  );
}

function Viewer({ photos, index, onChange, onClose }: {
  photos: string[];
  index: number;
  onChange: (i: number) => void;
  onClose: () => void;
}) {
  const { t } = useLang();
  const touchX = useRef<number | null>(null);
  const go = (step: number) => onChange((index + step + photos.length) % photos.length);

  useEffect(() => {
    const keys = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onChange((index - 1 + photos.length) % photos.length);
      if (e.key === "ArrowRight") onChange((index + 1) % photos.length);
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", keys);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", keys);
    };
  }, [index, photos.length, onChange, onClose]);

  return (
    <div
      className="viewer"
      role="dialog"
      aria-modal="true"
      aria-label={t.phOpen(index + 1, photos.length)}
      onClick={onClose}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - (touchX.current ?? 0);
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      <Image key={photos[index]} className="viewer-img" src={photos[index]} alt="" fill sizes="100vw" />
      <button className="viewer-close label" onClick={onClose}>{t.phClose} ✕</button>
      {photos.length > 1 && (
        <>
          <button className="viewer-nav prev" onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label={t.phPrev}>←</button>
          <button className="viewer-nav next" onClick={(e) => { e.stopPropagation(); go(1); }} aria-label={t.phNext}>→</button>
          <span className="viewer-count label">{index + 1} / {photos.length}</span>
        </>
      )}
    </div>
  );
}
