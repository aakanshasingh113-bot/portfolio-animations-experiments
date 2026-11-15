import type { Metadata } from "next";
import { LedgerlyLoader } from "@/ledgerly/Loader";

export const metadata: Metadata = {
  title: "Ledgerly — interactive prototype",
  description: "A calm personal finance tracker: see where your money went in 3 seconds, log a spend in 3 taps, never feel judged.",
};

export default function Page() {
  return <LedgerlyLoader />;
}
