import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Sparkles, BookOpen, Copy, Download, Lightbulb, MessageSquare, CheckCircle, GraduationCap } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AIContentRenderer } from "@/components/AIContentRenderer";

interface StudyGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileId: string;
  fileName: string;
}

export function StudyGuideModal({ open, onOpenChange, fileId, fileName }: StudyGuideModalProps) {
  const [studyGuide, setStudyGuide] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("concepts");

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

  const contentToString = (content: any): string => {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) return content.map(item => 
      typeof item === 'string' ? `• ${item}` : `• ${JSON.stringify(item)}`
    ).join('\n');
    if (typeof content === 'object') return JSON.stringify(content, null, 2);
    return String(content);
  };

  const handleCopySection = (sectionName: string, content: any) => {
    navigator.clipboard.writeText(contentToString(content));
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
      return `=== ${section.title.toUpperCase()} ===\n\n${contentToString(section.content)}\n\n`;
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

  const tabs = [
    { id: 'concepts', label: 'Key Concepts', shortLabel: 'Concepts', icon: Lightbulb, getData: () => studyGuide?.keyConcepts || studyGuide?.key_concepts },
    { id: 'definitions', label: 'Definitions', shortLabel: 'Terms', icon: BookOpen, getData: () => studyGuide?.definitions || studyGuide?.important_definitions },
    { id: 'questions', label: 'Practice', shortLabel: 'Q&A', icon: MessageSquare, getData: () => studyGuide?.practiceQuestions || studyGuide?.practice_questions },
    { id: 'review', label: 'Review', shortLabel: 'Review', icon: CheckCircle, getData: () => studyGuide?.reviewPoints || studyGuide?.review_points },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">AI Study Guide</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">
                  {fileName}
                </DialogDescription>
              </div>
            </div>
            {loading && (
              <Badge variant="secondary" className="gap-1.5 bg-primary/10 text-primary border-0">
                <Sparkles className="h-3 w-3 animate-pulse" />
                Generating
              </Badge>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 flex-1">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
              <Sparkles className="h-5 w-5 absolute -top-1 -right-1 text-primary animate-pulse" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">Creating your study guide...</p>
              <p className="text-xs text-muted-foreground">Analyzing content and generating materials</p>
            </div>
          </div>
        ) : studyGuide ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <div className="px-6 pt-4 flex-shrink-0">
                <TabsList className="w-full grid grid-cols-4 h-10 bg-muted/30">
                  {tabs.map((tab) => (
                    <TabsTrigger 
                      key={tab.id} 
                      value={tab.id}
                      className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    >
                      <tab.icon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span className="sm:hidden">{tab.shortLabel}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <div className="flex-1 overflow-hidden">
                {tabs.map((tab) => {
                  const data = tab.getData();
                  return (
                    <TabsContent 
                      key={tab.id} 
                      value={tab.id} 
                      className="h-full mt-0 data-[state=active]:flex data-[state=active]:flex-col"
                    >
                      <ScrollArea className="flex-1 px-6 py-4" style={{ maxHeight: "calc(85vh - 260px)" }}>
                        <Card className="p-5 bg-muted/20 border-border/30">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <tab.icon className="h-4 w-4 text-primary" />
                              <span className="text-sm font-medium">{tab.label}</span>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleCopySection(tab.label, data)}
                              className="h-8 px-2"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          {data ? (
                            <AIContentRenderer content={contentToString(data)} />
                          ) : (
                            <p className="text-sm text-muted-foreground">No content available</p>
                          )}
                        </Card>
                      </ScrollArea>
                    </TabsContent>
                  );
                })}
              </div>
            </Tabs>

            <div className="px-6 py-4 border-t border-border/50 bg-muted/10 flex justify-end flex-shrink-0">
              <Button variant="default" size="sm" onClick={handleDownloadAll} className="gap-2 h-9">
                <Download className="h-3.5 w-3.5" />
                Download Full Guide
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}