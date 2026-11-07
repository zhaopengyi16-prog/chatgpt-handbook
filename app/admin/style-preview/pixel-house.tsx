'use client';

import {useLayoutEffect,useRef} from 'react';
import HouseArt from './house';

export default function PixelHouse() {
  const frame = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const house = frame.current;
    if (!house) return;
    let disposed = false;
    const snap = () => {
      if (disposed || !house.getClientRects().length) return;
      house.style.translate = 'none';
      const art = house.querySelector('svg');
      if (!art) return;
      const rect = art.getBoundingClientRect();
      const x = rect.left + window.scrollX;
      const y = rect.top + window.scrollY;
      house.style.translate = `${Math.round(x) - x}px ${Math.round(y) - y}px`;
    };
    // ResizeObserver ignores transforms: snapping cannot cause a resize loop.
    // There is no scroll listener, frame loop or animated fractional movement.
    const observer = new ResizeObserver(snap);
    if (house.parentElement) observer.observe(house.parentElement);
    if (house.parentElement?.parentElement) observer.observe(house.parentElement.parentElement);
    snap();
    void document.fonts.ready.then(snap);
    return () => { disposed = true; observer.disconnect(); };
  }, []);
  return <div className="mm-house" aria-hidden="true" ref={frame}>
    <HouseArt/><span>MIAOMIAO HOUSE</span>
  </div>;
}
