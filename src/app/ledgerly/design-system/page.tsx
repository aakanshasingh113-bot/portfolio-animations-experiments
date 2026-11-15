import type { Metadata } from "next";
import { DesignSystemLoader } from "@/ledgerly/Loader";

export const metadata: Metadata = { title: "Ledgerly — design system" };

export default function Page() {
  return <DesignSystemLoader />;
}
