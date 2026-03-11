import { useState, useCallback } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, 
  ChevronRight, 
  Upload, 
  FolderOpen, 
  Search, 
  Sparkles, 
  FileText, 
  Rocket,
  Star,
  LayoutGrid,
  MessageSquare,
  Languages,
  Volume2,
  BookOpen
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface TutorialStep {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  features?: { icon: React.ElementType; label: string }[];
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: "Welcome to PDFNest",
    description: "Your smart PDF companion. Let's take a quick tour of the key features.",
    icon: FileText,
    color: "from-primary/20 to-primary/5",
  },
  {
    title: "Upload & Organize",
    description: "Drag & drop PDFs to upload. Create categories to keep files organized, and star important ones for quick access.",
    icon: Upload,
    color: "from-blue-500/20 to-blue-500/5",
    features: [
      { icon: Upload, label: "Drag & Drop" },
      { icon: FolderOpen, label: "Categories" },
      { icon: Star, label: "Favorites" },
    ],
  },
  {
    title: "Browse & Find",
    description: "Search files instantly, sort by name/date/size, and switch between list and grid views.",
    icon: Search,
    color: "from-emerald-500/20 to-emerald-500/5",
    features: [
      { icon: Search, label: "Search" },
      { icon: LayoutGrid, label: "Views" },
    ],
  },
  {
    title: "AI-Powered Tools",
    description: "Unlock powerful AI features to summarize, translate, chat with your PDFs, and more.",
    icon: Sparkles,
    color: "from-violet-500/20 to-violet-500/5",
    features: [
      { icon: FileText, label: "Summarize" },
      { icon: BookOpen, label: "Study Guide" },
      { icon: Volume2, label: "Voice Reader" },
      { icon: Languages, label: "Translate" },
      { icon: MessageSquare, label: "Chat" },
    ],
  },
  {
    title: "Resources",
    description: "Access lecture notes uploaded by course reps. Browse by department and course.",
    icon: FolderOpen,
    color: "from-amber-500/20 to-amber-500/5",
  },
  {
    title: "You're All Set!",
    description: "Start uploading PDFs and explore the AI tools. Your productivity journey begins now!",
    icon: Rocket,
    color: "from-primary/20 to-primary/5",
  },
];

interface NavigationTutorialProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NavigationTutorial({ open, onOpenChange }: NavigationTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const isMobile = useIsMobile();
  
  const handleComplete = useCallback(() => {
    localStorage.setItem("tutorial-completed", "true");
    onOpenChange(false);
    setCurrentStep(0);
  }, [onOpenChange]);
  
  const handleSkip = useCallback(() => {
    localStorage.setItem("tutorial-completed", "true");
    onOpenChange(false);
    setCurrentStep(0);
  }, [onOpenChange]);

  const goNext = useCallback(() => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep]);

  const goPrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x < -threshold) {
      goNext();
    } else if (info.offset.x > threshold) {
      goPrev();
    }
  }, [goNext, goPrev]);
  
  const currentStepData = TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
  const Icon = currentStepData.icon;

  const content = (
    <div className="flex flex-col h-full">
      {/* Progress Bar */}
      <div className="flex gap-1.5 px-6 pt-4">
        {TUTORIAL_STEPS.map((_, index) => (
          <motion.div
            key={index}
            className={cn(
              "h-1 rounded-full flex-1 transition-colors duration-300",
              index <= currentStep ? "bg-primary" : "bg-muted"
            )}
            initial={false}
            animate={{ 
              scaleX: index === currentStep ? 1 : 0.95,
              opacity: index <= currentStep ? 1 : 0.4
            }}
          />
        ))}
      </div>

      {/* Step Counter */}
      <div className="px-6 pt-3">
        <span className="text-xs text-muted-foreground font-medium">
          {currentStep + 1} of {TUTORIAL_STEPS.length}
        </span>
      </div>

      {/* Content with Swipe */}
      <motion.div
        className="flex-1 px-6 py-4 overflow-hidden"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="h-full flex flex-col"
          >
            {/* Icon Card */}
            <motion.div 
              className={cn(
                "w-20 h-20 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-4 mx-auto",
                currentStepData.color
              )}
              initial={{ scale: 0.8, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
              <Icon className="w-10 h-10 text-foreground" />
            </motion.div>

            {/* Title & Description */}
            <motion.h2 
              className="text-xl font-semibold text-center mb-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {currentStepData.title}
            </motion.h2>
            <motion.p 
              className="text-sm text-muted-foreground text-center leading-relaxed"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              {currentStepData.description}
            </motion.p>

            {/* Feature Icons Grid */}
            {currentStepData.features && (
              <motion.div 
                className="flex flex-wrap justify-center gap-3 mt-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {currentStepData.features.map((feature, idx) => (
                  <motion.div
                    key={feature.label}
                    className="flex flex-col items-center gap-1.5"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.25 + idx * 0.05 }}
                  >
                    <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
                      <feature.icon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {feature.label}
                    </span>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Swipe Hint (mobile only) */}
      {isMobile && currentStep < TUTORIAL_STEPS.length - 1 && (
        <motion.p
          className="text-[10px] text-muted-foreground/60 text-center pb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Swipe to navigate
        </motion.p>
      )}

      {/* Footer Actions */}
      <div className="px-6 pb-6 pt-2 flex items-center justify-between gap-3">
        {currentStep === 0 ? (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleSkip}
            className="text-muted-foreground"
          >
            Skip
          </Button>
        ) : (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={goPrev}
            className="text-muted-foreground"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        )}
        
        {isLastStep ? (
          <Button onClick={handleComplete} className="flex-1 max-w-[160px]">
            Get Started
            <Rocket className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={goNext} className="flex-1 max-w-[160px]">
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );

  // Mobile: Bottom Drawer
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Centered Dialog
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
        {content}
      </DialogContent>
    </Dialog>
  );
}
