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
      {/* Dark mode ambient gradient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden hidden dark:block z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-red-500/[0.04] blur-[150px]" />
        <div className="absolute top-[30%] right-[-15%] w-[45%] h-[45%] rounded-full bg-purple-500/[0.03] blur-[150px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] rounded-full bg-blue-500/[0.03] blur-[150px]" />
      </div>
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
