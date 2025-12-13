import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, BookOpen, Volume2, Languages, MessageSquare, Sparkles, Lock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { usePDFFiles } from "@/hooks/usePDFFiles";
import { FilePicker } from "@/components/FilePicker";
import { PDFSummaryModal } from "@/components/PDFSummaryModal";
import { StudyGuideModal } from "@/components/StudyGuideModal";
import { PDFAudioPlayer } from "@/components/PDFAudioPlayer";
import { TranslatorModal } from "@/components/TranslatorModal";
import { PDFChatInterface } from "@/components/PDFChatInterface";
import { BottomNav } from "@/components/BottomNav";
import type { AIModalType } from "@/pages/Index";

const AI_FEATURES = [
  {
    id: "summary" as AIModalType,
    icon: FileText,
    title: "Summarize PDF",
    description: "Get a concise summary of your document's key points",
    gradient: "from-blue-500/20 to-cyan-500/20",
    iconColor: "text-blue-500",
  },
  {
    id: "study-guide" as AIModalType,
    icon: BookOpen,
    title: "Study Guide",
    description: "Generate comprehensive study materials from your PDF",
    gradient: "from-purple-500/20 to-pink-500/20",
    iconColor: "text-purple-500",
  },
  {
    id: "voice" as AIModalType,
    icon: Volume2,
    title: "Voice Reader",
    description: "Listen to your PDF content with natural text-to-speech",
    gradient: "from-green-500/20 to-emerald-500/20",
    iconColor: "text-green-500",
  },
  {
    id: "translate" as AIModalType,
    icon: Languages,
    title: "Translate",
    description: "Translate your documents into different languages",
    gradient: "from-orange-500/20 to-amber-500/20",
    iconColor: "text-orange-500",
  },
  {
    id: "chat" as AIModalType,
    icon: MessageSquare,
    title: "Chat with PDF",
    description: "Ask questions and get answers from your document",
    gradient: "from-red-500/20 to-rose-500/20",
    iconColor: "text-red-500",
  },
];

export default function AIFeatures() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { files, loading: filesLoading } = usePDFFiles(user?.id);
  
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [pendingFeature, setPendingFeature] = useState<AIModalType>(null);
  const [activeModal, setActiveModal] = useState<AIModalType>(null);
  const [selectedFile, setSelectedFile] = useState<{ id: string; name: string } | null>(null);

  const handleFeatureClick = (featureId: AIModalType) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    
    if (files.length === 0) {
      navigate("/?upload=true");
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
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 pb-20 md:pb-0">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Features
          </h1>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="p-4 md:p-6 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-2">AI-Powered PDF Tools</h2>
          <p className="text-muted-foreground">
            {user 
              ? "Select a feature to get started with your PDFs"
              : "Sign in to unlock powerful AI features for your documents"
            }
          </p>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {AI_FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            
            return (
              <motion.button
                key={feature.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleFeatureClick(feature.id)}
                className={`relative group p-6 rounded-xl border border-border bg-gradient-to-br ${feature.gradient} text-left transition-all hover:shadow-lg hover:border-primary/50`}
              >
                {!user && (
                  <div className="absolute top-3 right-3">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                <div className={`w-12 h-12 rounded-xl bg-background/80 flex items-center justify-center mb-4 ${feature.iconColor}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </motion.button>
            );
          })}
        </div>

        {!user && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 text-center"
          >
            <Button onClick={() => navigate("/auth")} size="lg">
              Sign Up for Free Access
            </Button>
          </motion.div>
        )}
      </main>

      <BottomNav isLoggedIn={!!user} userId={user?.id} />

      <FilePicker
        open={showFilePicker}
        onOpenChange={setShowFilePicker}
        files={files}
        onSelectFile={handleFileSelected}
        featureType={pendingFeature}
      />

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
