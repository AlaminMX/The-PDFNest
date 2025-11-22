import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Sparkles, BookOpen, Copy, Download, Lightbulb, MessageSquare, CheckCircle } from "lucide-react";
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

  const [activeTab, setActiveTab] = useState("concepts");

  const renderContent = (content: any) => {
    if (typeof content === 'string') {
      return <div className="whitespace-pre-wrap font-sans leading-relaxed text-foreground">{content}</div>;
    }
    if (Array.isArray(content)) {
      return (
        <ul className="space-y-2">
          {content.map((item, idx) => (
            <li key={idx} className="flex gap-2">
              <span className="text-primary mt-1">•</span>
              <span className="flex-1">{typeof item === 'string' ? item : JSON.stringify(item)}</span>
            </li>
          ))}
        </ul>
      );
    }
    return <div className="whitespace-pre-wrap font-sans leading-relaxed text-foreground">{JSON.stringify(content, null, 2)}</div>;
  };

  const handleCopySection = (sectionName: string, content: any) => {
    const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    navigator.clipboard.writeText(text);
    toast.success(`${sectionName} copied to clipboard`);
  };

  const handleDownloadAll = () => {
    const sections = [
      { title: 'Key Concepts', content: studyGuide?.keyConcepts || studyGuide?.key_concepts || '' },
      { title: 'Definitions', content: studyGuide?.definitions || studyGuide?.important_definitions || '' },
      { title: 'Practice Questions', content: studyGuide?.practiceQuestions || studyGuide?.practice_questions || '' },
      { title: 'Review Points', content: studyGuide?.reviewPoints || studyGuide?.review_points || '' }
    ];

    const fullText = sections.map(section => {
      const content = typeof section.content === 'string' ? section.content : JSON.stringify(section.content, null, 2);
      return `=== ${section.title.toUpperCase()} ===\n\n${content}\n\n`;
    }).join('\n');

    const blob = new Blob([fullText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}-study-guide.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Study guide downloaded");
  };

  const tabIcons = {
    concepts: Lightbulb,
    definitions: BookOpen,
    questions: MessageSquare,
    review: CheckCircle
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">AI Study Guide</DialogTitle>
                <DialogDescription className="text-xs mt-1">{fileName}</DialogDescription>
              </div>
            </div>
            {loading && (
              <Badge variant="secondary" className="gap-1.5">
                <Sparkles className="h-3 w-3 animate-pulse" />
                Generating
              </Badge>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="relative">
              <Loader2 className="h-14 w-14 animate-spin text-primary" />
              <Sparkles className="h-6 w-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary animate-pulse" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">Creating comprehensive study guide...</p>
              <p className="text-xs text-muted-foreground">Analyzing content and generating learning materials</p>
            </div>
          </div>
        ) : studyGuide ? (
          <div className="flex flex-col h-full">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <div className="px-6 pt-2">
                <TabsList className="grid w-full grid-cols-4 h-auto p-1">
                  <TabsTrigger value="concepts" className="gap-2 py-2.5">
                    <Lightbulb className="h-4 w-4" />
                    <span className="hidden sm:inline">Key Concepts</span>
                    <span className="sm:hidden">Concepts</span>
                  </TabsTrigger>
                  <TabsTrigger value="definitions" className="gap-2 py-2.5">
                    <BookOpen className="h-4 w-4" />
                    <span className="hidden sm:inline">Definitions</span>
                    <span className="sm:hidden">Terms</span>
                  </TabsTrigger>
                  <TabsTrigger value="questions" className="gap-2 py-2.5">
                    <MessageSquare className="h-4 w-4" />
                    <span className="hidden sm:inline">Questions</span>
                    <span className="sm:hidden">Q&A</span>
                  </TabsTrigger>
                  <TabsTrigger value="review" className="gap-2 py-2.5">
                    <CheckCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">Review</span>
                    <span className="sm:hidden">Review</span>
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="concepts" className="flex-1 px-6 py-4 mt-0">
                <ScrollArea className="h-full pr-4" style={{ maxHeight: "calc(90vh - 280px)" }}>
                  <Card className="p-6 bg-muted/30 border-muted">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-primary" />
                        Key Concepts
                      </h3>
                      <Button variant="ghost" size="sm" onClick={() => handleCopySection('Key Concepts', studyGuide.keyConcepts || studyGuide.key_concepts)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {renderContent(studyGuide.keyConcepts || studyGuide.key_concepts || studyGuide)}
                    </div>
                  </Card>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="definitions" className="flex-1 px-6 py-4 mt-0">
                <ScrollArea className="h-full pr-4" style={{ maxHeight: "calc(90vh - 280px)" }}>
                  <Card className="p-6 bg-muted/30 border-muted">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b">
                      <h3 className="font-semibold flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                        Important Definitions
                      </h3>
                      <Button variant="ghost" size="sm" onClick={() => handleCopySection('Definitions', studyGuide.definitions || studyGuide.important_definitions)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {renderContent(studyGuide.definitions || studyGuide.important_definitions || 'No definitions available')}
                    </div>
                  </Card>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="questions" className="flex-1 px-6 py-4 mt-0">
                <ScrollArea className="h-full pr-4" style={{ maxHeight: "calc(90vh - 280px)" }}>
                  <Card className="p-6 bg-muted/30 border-muted">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b">
                      <h3 className="font-semibold flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-primary" />
                        Practice Questions
                      </h3>
                      <Button variant="ghost" size="sm" onClick={() => handleCopySection('Practice Questions', studyGuide.practiceQuestions || studyGuide.practice_questions)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {renderContent(studyGuide.practiceQuestions || studyGuide.practice_questions || 'No questions available')}
                    </div>
                  </Card>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="review" className="flex-1 px-6 py-4 mt-0">
                <ScrollArea className="h-full pr-4" style={{ maxHeight: "calc(90vh - 280px)" }}>
                  <Card className="p-6 bg-muted/30 border-muted">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b">
                      <h3 className="font-semibold flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-primary" />
                        Review Points
                      </h3>
                      <Button variant="ghost" size="sm" onClick={() => handleCopySection('Review Points', studyGuide.reviewPoints || studyGuide.review_points)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {renderContent(studyGuide.reviewPoints || studyGuide.review_points || 'No review points available')}
                    </div>
                  </Card>
                </ScrollArea>
              </TabsContent>
            </Tabs>

            <div className="px-6 py-4 border-t bg-muted/20 flex gap-2 justify-end">
              <Button variant="default" size="sm" onClick={handleDownloadAll} className="gap-2">
                <Download className="h-4 w-4" />
                Download Complete Guide
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}