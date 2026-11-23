import {
  ActivitySection,
  FinalCta,
  GamesPreview,
  HomeHero,
  PricingSection,
  StatsSection,
  WhySection,
} from "@/components/home-sections";

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
