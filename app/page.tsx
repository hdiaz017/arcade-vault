import type { Metadata } from "next";
import {
  ActivitySection,
  FinalCta,
  GamesPreview,
  HomeHero,
  PricingSection,
  StatsSection,
  WhySection,
} from "@/components/home-sections";

export const metadata: Metadata = {
  description:
    "Arcade Vault: juega gratis los mejores arcades clásicos en tu navegador, compite por el mejor puntaje y sube en el ranking global.",
};

export default function Home() {
  return (
    <div className="home fade-in">
      <HomeHero />
      <WhySection />
      <GamesPreview />
      <StatsSection />
      <ActivitySection />
      <PricingSection />
      <FinalCta />
    </div>
  );
}
