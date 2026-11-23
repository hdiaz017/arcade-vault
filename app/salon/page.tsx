import type { Metadata } from "next";
import HallClient from "@/components/hall-client";

export const metadata: Metadata = { title: "Salón de la Fama" };

export default function HallPage() {
  return <HallClient />;
}
