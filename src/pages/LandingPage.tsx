import { LandingNav } from "@/components/landing/LandingNav";
import { CursorFollowEffect } from "@/components/landing/CursorFollowEffect";
import { HeroSection } from "@/components/landing/HeroSection";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { SolutionSection } from "@/components/landing/SolutionSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { TrustSection } from "@/components/landing/TrustSection";
import { ResourcesSection } from "@/components/landing/ResourcesSection";
import { WaitlistSection } from "@/components/landing/WaitlistSection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <CursorFollowEffect />
      <LandingNav />
      <main>
        <HeroSection />
        <ProblemSection />
        <SolutionSection />
        <FeaturesSection />
        <HowItWorksSection />
        <TrustSection />
        <ResourcesSection />
        <WaitlistSection />
        <FinalCTASection />
      </main>
      <LandingFooter />
    </div>
  );
}
