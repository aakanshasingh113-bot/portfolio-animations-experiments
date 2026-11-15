"use client";

import dynamic from "next/dynamic";

const Splash = () => (
  <div className="grid h-dvh place-items-center bg-[#f7f5f0] text-[#0f5c56]" aria-busy="true">
    <p className="text-2xl font-semibold">Ledgerly</p>
  </div>
);

/** The prototype formats dates and reads the viewport, so it renders in the browser only. */
export const LedgerlyLoader = dynamic(() => import("./App"), { ssr: false, loading: Splash });
export const DesignSystemLoader = dynamic(() => import("./DesignSystem"), { ssr: false, loading: Splash });
