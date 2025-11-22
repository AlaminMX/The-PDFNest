import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StudyGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileId: string;
  fileName: string;
}

export function StudyGuideModal({ open, onOpenChange, fileId, fileName }: StudyGuideModalProps) {
  const [studyGuide, setStudyGuide] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && fileId) {
      loadStudyGuide();
    }
  }, [open, fileId]);

  const loadStudyGuide = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-study-guide', {
        body: { fileId }
      });

      if (error) throw error;
      setStudyGuide(data.studyGuide);
    } catch (error: any) {
      console.error("Error loading study guide:", error);
      toast.error(error.message || "Failed to generate study guide");
    } finally {
      setLoading(false);
    }
  };

  const renderContent = (content: any) => {
    if (typeof content === 'string') {
      return <pre className="whitespace-pre-wrap font-sans">{content}</pre>;
    }
    return <pre className="whitespace-pre-wrap font-sans">{JSON.stringify(content, null, 2)}</pre>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>AI Study Guide</DialogTitle>
          <DialogDescription>{fileName}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : studyGuide ? (
          <Tabs defaultValue="concepts" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="concepts">Key Concepts</TabsTrigger>
              <TabsTrigger value="definitions">Definitions</TabsTrigger>
              <TabsTrigger value="questions">Questions</TabsTrigger>
              <TabsTrigger value="review">Review</TabsTrigger>
            </TabsList>
            
            <TabsContent value="concepts">
              <ScrollArea className="h-[400px] pr-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {renderContent(studyGuide.keyConcepts || studyGuide.key_concepts || studyGuide)}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="definitions">
              <ScrollArea className="h-[400px] pr-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {renderContent(studyGuide.definitions || studyGuide.important_definitions || 'No definitions available')}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="questions">
              <ScrollArea className="h-[400px] pr-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {renderContent(studyGuide.practiceQuestions || studyGuide.practice_questions || 'No questions available')}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="review">
              <ScrollArea className="h-[400px] pr-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {renderContent(studyGuide.reviewPoints || studyGuide.review_points || 'No review points available')}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}