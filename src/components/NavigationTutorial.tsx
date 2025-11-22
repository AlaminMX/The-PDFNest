import { useState, useEffect } from "react";
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

interface TutorialStep {
  title: string;
  description: string;
  emoji: string;
  highlight?: string | null;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: "Welcome to PDFNest! 📚",
    description: "Let's explore all the powerful features to help you organize and work with your PDF documents.",
    emoji: "👋",
    highlight: null
  },
  {
    title: "Upload PDFs 📤",
    description: "Drag and drop PDF files onto the upload area, or click the upload button. Upload multiple files at once with ease!",
    emoji: "📤",
    highlight: "upload-area"
  },
  {
    title: "Storage Limit 💾",
    description: "Each account has 300MB of total storage space. Monitor your usage in the sidebar's storage indicator at the bottom.",
    emoji: "💾",
    highlight: "storage-indicator"
  },
  {
    title: "Organize with Categories 📁",
    description: "Create custom categories in the sidebar to organize your files. Assign each file to a category for better organization.",
    emoji: "📁",
    highlight: null
  },
  {
    title: "Search & Filter 🔍",
    description: "Use the search bar to find files by name. Sort your files by name, date, or size using the sort dropdown.",
    emoji: "🔍",
    highlight: "search-bar"
  },
  {
    title: "Mark Favorites ⭐",
    description: "Click the star icon on any file to mark it as a favorite. Access all favorites quickly from the Favorites category.",
    emoji: "⭐",
    highlight: null
  },
  {
    title: "View Modes 👁️",
    description: "Switch between List view and Grid view using the toggle buttons in the header. Choose what works best for you!",
    emoji: "👁️",
    highlight: "view-toggle"
  },
  {
    title: "AI Summarization 📄",
    description: "Get instant AI-powered summaries of your PDFs. Click any file's AI menu → Summarize to extract key points.",
    emoji: "📄",
    highlight: null
  },
  {
    title: "Study Guide Generator 📚",
    description: "Generate comprehensive study guides with key concepts, definitions, practice questions, and review points.",
    emoji: "📚",
    highlight: null
  },
  {
    title: "Voice Reader 🔊",
    description: "Listen to your PDFs with text-to-speech. Navigate page by page and control playback speed.",
    emoji: "🔊",
    highlight: null
  },
  {
    title: "PDF Translator 🌐",
    description: "Translate PDFs to 20+ languages including Spanish, French, German, Chinese, Japanese, and more!",
    emoji: "🌐",
    highlight: null
  },
  {
    title: "Chat with PDF 💬",
    description: "Ask questions about your PDF content. The AI will answer based on the document with relevant excerpts.",
    emoji: "💬",
    highlight: null
  },
  {
    title: "File Actions ⚙️",
    description: "Rename, preview, download, change category, or delete files. On mobile, tap the three dots menu for all actions.",
    emoji: "⚙️",
    highlight: null
  },
  {
    title: "Bulk Operations ✨",
    description: "Select multiple files using checkboxes, then move them to categories or delete them all at once.",
    emoji: "✨",
    highlight: null
  },
  {
    title: "Dark Mode 🌙",
    description: "Toggle between light and dark themes using the theme switcher in the header. Your preference is saved automatically.",
    emoji: "🌙",
    highlight: "theme-toggle"
  },
  {
    title: "Mobile Support 📱",
    description: "PDFNest works great on mobile! Tap the menu icon to open the sidebar and access all features on the go.",
    emoji: "📱",
    highlight: null
  },
  {
    title: "You're Ready! 🚀",
    description: "You now know all of PDFNest's features. Start uploading PDFs and explore the AI-powered tools to boost your productivity!",
    emoji: "🚀",
    highlight: null
  }
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

  // Highlighting effect
  useEffect(() => {
    if (open && currentStepData.highlight) {
      const element = document.getElementById(currentStepData.highlight);
      if (element) {
        element.classList.add('tutorial-highlight');
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
    return () => {
      document.querySelectorAll('.tutorial-highlight').forEach(el => {
        el.classList.remove('tutorial-highlight');
      });
    };
  }, [currentStep, open, currentStepData.highlight]);
  
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
