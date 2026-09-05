"use client";

import { useEffect, useState, type ReactNode } from "react";

const SPLASH_MS = 2800;
const FADE_MS = 420;

export function BrandSplashGate({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const leaveTimer = window.setTimeout(() => setLeaving(true), SPLASH_MS - FADE_MS);
    const hideTimer = window.setTimeout(() => setVisible(false), SPLASH_MS);

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  return (
    <>
      {children}

      {visible && (
        <div
          className={`brand-splash ${leaving ? "brand-splash--leaving" : ""}`}
          role="status"
          aria-label="Loading Cwlwm Systems Field Intelligence"
        >
          <div className="brand-splash__wash brand-splash__wash--green" />
          <div className="brand-splash__wash brand-splash__wash--red" />
          <div className="brand-splash__knot-watermark brand-splash__knot-watermark--one" aria-hidden="true" />
          <div className="brand-splash__knot-watermark brand-splash__knot-watermark--two" aria-hidden="true" />

          <div className="brand-splash__content">
            <div className="brand-splash__logo-stage">
              <img
                src="/brand/cwlwm-systems-full.png"
                alt=""
                aria-hidden="true"
                className="brand-splash__logo brand-splash__logo--mono"
              />

              <img
                src="/brand/cwlwm-systems-full.png"
                alt="Cwlwm Systems"
                className="brand-splash__logo brand-splash__logo--color"
              />

              <span className="brand-splash__scanline" aria-hidden="true" />
            </div>

            <div className="brand-splash__product-name">Field Intelligence</div>

            <div className="brand-splash__progress" aria-hidden="true">
              <span className="brand-splash__progress-fill" />
              <span className="brand-splash__progress-shine" />
            </div>

            <div className="brand-splash__loading-text">
              <span>Loading</span>
              <span className="brand-splash__dots">...</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
