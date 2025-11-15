import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

const TUTORIAL_STEPS = [
  {
    title: "Welcome to PDFNest!",
    description: "Let's take a quick tour of the features to help you organize your PDF documents efficiently.",
    emoji: "📚",
  },
  {
    title: "Upload PDFs",
    description: "Drag and drop PDF files onto the upload area, or click the upload button to browse your files. You can upload multiple files at once.",
    emoji: "📤",
  },
  {
    title: "Organize with Categories",
    description: "Create custom categories to organize your files. Use the sidebar to add new categories, or click the + button. Each file can be assigned to one category.",
    emoji: "📁",
  },
  {
    title: "Search & Sort",
    description: "Use the search bar to find files by name. Sort your files by name, date, or size using the sort dropdown. Toggle between ascending and descending order.",
    emoji: "🔍",
  },
  {
    title: "Mark Favorites",
    description: "Click the star icon on any file to mark it as a favorite. Access all your favorite files quickly from the Favorites category in the sidebar.",
    emoji: "⭐",
  },
  {
    title: "File Actions",
    description: "Each file has multiple actions: rename, preview, download, change category, and delete. On mobile, tap the three dots menu to access all actions.",
    emoji: "⚙️",
  },
  {
    title: "Bulk Operations",
    description: "Select multiple files using the checkboxes, then perform bulk actions like moving to a category or deleting multiple files at once.",
    emoji: "✨",
  },
  {
    title: "Sidebar Navigation",
    description: "On mobile, tap the menu icon to open the sidebar. On desktop, you can collapse the sidebar to save space. All your categories and navigation options are here.",
    emoji: "🧭",
  },
];

interface NavigationTutorialProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NavigationTutorial({ open, onOpenChange }: NavigationTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  
  const handleComplete = () => {
    localStorage.setItem("tutorial-completed", "true");
    onOpenChange(false);
    setCurrentStep(0);
  };
  
  const handleSkip = () => {
    localStorage.setItem("tutorial-completed", "true");
    onOpenChange(false);
    setCurrentStep(0);
  };
  
  const currentStepData = TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{currentStepData.title}</DialogTitle>
          <DialogDescription>{currentStepData.description}</DialogDescription>
        </DialogHeader>
        
        <div className="text-6xl text-center py-8">
          {currentStepData.emoji}
        </div>
        
        <div className="flex items-center justify-center gap-1 py-2">
          {TUTORIAL_STEPS.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 rounded-full transition-all ${
                index === currentStep
                  ? "w-6 bg-primary"
                  : index < currentStep
                  ? "w-1.5 bg-primary/50"
                  : "w-1.5 bg-muted"
              }`}
            />
          ))}
        </div>
        
        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <span className="text-sm text-muted-foreground">
            {currentStep + 1} / {TUTORIAL_STEPS.length}
          </span>
          <div className="flex gap-2">
            {currentStep === 0 && (
              <Button variant="ghost" onClick={handleSkip}>
                Skip Tutorial
              </Button>
            )}
            {currentStep > 0 && (
              <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
            {isLastStep ? (
              <Button onClick={handleComplete}>
                Get Started
              </Button>
            ) : (
              <Button onClick={() => setCurrentStep(currentStep + 1)}>
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
