import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function FinalCTASection() {
  return (
    <section className="py-24 md:py-32">
      <div className="container mx-auto px-4 max-w-3xl text-center space-y-8">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
          Start organizing your academic life.
        </h2>
        <p className="text-muted-foreground text-lg">
          Takes less than a minute to get started.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button asChild size="lg" className="gap-2 text-base px-8 h-12 rounded-xl shadow-lg shadow-primary/20">
            <Link to="/auth">
              Create Free Account
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="text-base px-8 h-12 rounded-xl">
            <Link to="/afit-pdfs">
              Browse Resources
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
