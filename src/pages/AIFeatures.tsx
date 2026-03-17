import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, BookOpen, Volume2, Languages, MessageSquare, Sparkles, Lock, ArrowLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { useSession } from "@/hooks/useSession";
import { usePDFFiles } from "@/hooks/usePDFFiles";
import { FilePicker } from "@/components/FilePicker";
import { PDFSummaryModal } from "@/components/PDFSummaryModal";
import { StudyGuideModal } from "@/components/StudyGuideModal";
import { PDFAudioPlayer } from "@/components/PDFAudioPlayer";
import { TranslatorModal } from "@/components/TranslatorModal";
import { PDFChatInterface } from "@/components/PDFChatInterface";
import { SmartBottomNav } from "@/components/SmartBottomNav";
import type { AIModalType } from "@/pages/Index";

const AI_FEATURES = [
  {
    id: "summary" as AIModalType,
    icon: FileText,
    title: "Summarize",
    description: "Get key points instantly",
    gradient: "from-blue-500 to-cyan-500",
    bgGradient: "from-blue-500/10 to-cyan-500/10",
  },
  {
    id: "study-guide" as AIModalType,
    icon: BookOpen,
    title: "Study Guide",
    description: "Generate study materials",
    gradient: "from-purple-500 to-pink-500",
    bgGradient: "from-purple-500/10 to-pink-500/10",
  },
  {
    id: "voice" as AIModalType,
    icon: Volume2,
    title: "Voice Reader",
    description: "Listen to your PDFs",
    gradient: "from-green-500 to-emerald-500",
    bgGradient: "from-green-500/10 to-emerald-500/10",
  },
  {
    id: "translate" as AIModalType,
    icon: Languages,
    title: "Translate",
    description: "Convert to any language",
    gradient: "from-orange-500 to-amber-500",
    bgGradient: "from-orange-500/10 to-amber-500/10",
  },
  {
    id: "chat" as AIModalType,
    icon: MessageSquare,
    title: "Chat",
    description: "Ask questions about content",
    gradient: "from-red-500 to-rose-500",
    bgGradient: "from-red-500/10 to-rose-500/10",
  },
];

export default function AIFeatures() {
  const navigate = useNavigate();
  const { user } = useSession();
  const { files, loading: filesLoading } = usePDFFiles(user?.id);
  
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [pendingFeature, setPendingFeature] = useState<AIModalType>(null);
  const [activeModal, setActiveModal] = useState<AIModalType>(null);
  const [selectedFile, setSelectedFile] = useState<{ id: string; name: string } | null>(null);

  const handleFeatureClick = (featureId: AIModalType) => {
    if (!user) {
      sessionStorage.setItem("redirectAfterLogin", "/ai-features");
      navigate("/auth");
      return;
    }
    
    if (filesLoading) {
      // Still loading, open picker anyway — it will show loading state
      setPendingFeature(featureId);
      setShowFilePicker(true);
      return;
    }
    
    if (files.length === 0) {
      navigate("/dashboard?upload=true");
      return;
    }
    
    setPendingFeature(featureId);
    setShowFilePicker(true);
  };

  const handleFileSelected = (fileId: string, fileName: string) => {
    setSelectedFile({ id: fileId, name: fileName });
    setActiveModal(pendingFeature);
    setShowFilePicker(false);
    setPendingFeature(null);
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">AI Features</h1>
          </div>
          <NotificationBell /><ThemeToggle />
        </div>
      </header>

      <main className="p-4 md:p-6 max-w-2xl mx-auto">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl mb-4 shadow-lg">
            <Sparkles className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-3xl font-bold mb-2">AI Tools</h2>
          <p className="text-muted-foreground">
            {user 
              ? "Tap a feature to get started"
              : "Sign in to unlock AI features"
            }
          </p>
        </motion.div>

        {/* Feature List */}
        <div className="space-y-3">
          {AI_FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            
            return (
              <motion.button
                key={feature.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.08 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleFeatureClick(feature.id)}
                className={`w-full p-4 rounded-2xl border border-border bg-gradient-to-r ${feature.bgGradient} text-left transition-all hover:shadow-md hover:border-primary/30 flex items-center gap-4`}
              >
                {/* Icon */}
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center shadow-lg`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>

                {/* Arrow or Lock */}
                {user ? (
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <Lock className="w-5 h-5 text-muted-foreground" />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Sign up CTA */}
        {!user && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8"
          >
            <Button 
              onClick={() => navigate("/auth")} 
              size="lg" 
              className="w-full h-14 text-lg rounded-2xl"
            >
              Sign Up for Free
            </Button>
          </motion.div>
        )}
      </main>

      <SmartBottomNav />

      {/* File Picker Sheet */}
      <FilePicker
        open={showFilePicker}
        onOpenChange={setShowFilePicker}
        files={files}
        onSelectFile={handleFileSelected}
        featureType={pendingFeature}
      />

      {/* AI Modals */}
      <PDFSummaryModal
        open={activeModal === 'summary'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        fileId={selectedFile?.id || ''}
        fileName={selectedFile?.name || ''}
      />

      <StudyGuideModal
        open={activeModal === 'study-guide'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        fileId={selectedFile?.id || ''}
        fileName={selectedFile?.name || ''}
      />

      <PDFAudioPlayer
        open={activeModal === 'voice'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        fileId={selectedFile?.id || ''}
        fileName={selectedFile?.name || ''}
      />

      <TranslatorModal
        open={activeModal === 'translate'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        fileId={selectedFile?.id || ''}
        fileName={selectedFile?.name || ''}
      />

      <PDFChatInterface
        open={activeModal === 'chat'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        fileId={selectedFile?.id || ''}
        fileName={selectedFile?.name || ''}
      />
    </div>
  );
}
