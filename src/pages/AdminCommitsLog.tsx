import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingState } from "@/components/LoadingState";
import { toast } from "sonner";
import { ListOrdered } from "lucide-react";

const IMPLEMENTED_COMMITS = [
  { hash: "293bbec", date: "2026-03-04", message: "Add structured activity logging, session tracking, and signup/auth improvements" },
  { hash: "2902bcc", date: "2026-02-19", message: "Update financial literacy question and add novels section" },
  { hash: "ea7ebc6", date: "2026-02-19", message: "Update StepDiscoverySource.tsx" },
  { hash: "e9bfc26", date: "2026-02-19", message: "Refactor account creation logic in SignupWizard" },
  { hash: "56cb8de", date: "2026-02-18", message: "Remove unnecessary closing brace from SignupWizard" },
  { hash: "1d1aa7a", date: "2026-02-18", message: "Remove error handling and loading state in SignupWizard" },
  { hash: "ed1878d", date: "2026-02-18", message: "Refactor handleAccountCreate function for clarity" },
  { hash: "1378949", date: "2026-02-18", message: "Disable terms acceptance profile update" },
  { hash: "4200c36", date: "2026-02-18", message: "Refactor account creation logic with validation" },
  { hash: "e9708f0", date: "2026-02-18", message: "Update Index.tsx" },
  { hash: "7395fee", date: "2026-02-18", message: "Update usage options labels for clarity" },
  { hash: "4734ee9", date: "2026-02-18", message: "Improve signup flow UI and redirect handling" },
  { hash: "229e704", date: "2026-02-18", message: "Changes" },
  { hash: "1c4822b", date: "2026-02-18", message: "Implement signup wizard" },
  { hash: "38cd6bc", date: "2026-02-18", message: "Changes" },
  { hash: "d776ef5", date: "2026-02-18", message: "Reverted to commit 6186d4c76a95785533b154981274753c23116895" },
  { hash: "b150757", date: "2026-02-17", message: "Phase 1 signup wizard added" },
  { hash: "9a4fdcb", date: "2026-02-17", message: "Changes" },
  { hash: "3ab077a", date: "2026-02-17", message: "Reverted to commit 6186d4c76a95785533b154981274753c23116895" },
  { hash: "22bf27c", date: "2026-02-17", message: "Adjust light theme colors" },
  { hash: "e8b6e66", date: "2026-02-17", message: "Changes" },
  { hash: "6186d4c", date: "2026-02-17", message: "Display credits on course cards" },
  { hash: "2243e14", date: "2026-02-17", message: "Changes" },
  { hash: "b3bcb5d", date: "2026-02-17", message: "Refactor to Semester Structure" },
  { hash: "adfc7c0", date: "2026-02-17", message: "Changes" },
  { hash: "7c8aba0", date: "2026-02-17", message: "Improve courses grid layout" },
  { hash: "2291941", date: "2026-02-17", message: "Changes" },
  { hash: "6c4a1fc", date: "2026-02-16", message: "Admin view pdf preview added" },
  { hash: "55e261e", date: "2026-02-16", message: "Changes" },
  { hash: "979a7f7", date: "2026-02-16", message: "Fix offline loading and cache" },
  { hash: "dd75441", date: "2026-02-16", message: "Changes" },
  { hash: "a649902", date: "2026-02-14", message: "Simplified FAB to upload" },
  { hash: "adad719", date: "2026-02-14", message: "Changes" },
  { hash: "628bfa2", date: "2026-02-14", message: "Updated plan file" },
  { hash: "b3095f4", date: "2026-02-11", message: "Refactor offline-first uploads" },
  { hash: "6f5765d", date: "2026-02-11", message: "Changes" },
  { hash: "f0436cb", date: "2026-02-11", message: "Improve offline PDFs cache" },
  { hash: "55f8dc1", date: "2026-02-11", message: "Changes" },
  { hash: "ab729d8", date: "2026-02-07", message: "Polished sidebar UI/UX" },
  { hash: "083e0e4", date: "2026-02-07", message: "Changes" },
] as const;

export default function AdminCommitsLog() {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAdminStatus();

  useEffect(() => {
    if (!loading && !isAdmin) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/");
    }
  }, [isAdmin, loading, navigate]);

  if (loading) return <LoadingState message="Loading implemented commits..." />;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 pb-8">
      <PageHeader
        title="Implemented Commits"
        subtitle="Numbered timeline of implemented commits on this deployment branch"
        showBack
        icon={<ListOrdered className="h-6 w-6 text-primary" />}
      />

      <main className="container mx-auto px-4 py-6 md:py-8">
        <Card className="p-4 md:p-6">
          <ScrollArea className="h-[75vh] pr-2">
            <ol className="space-y-3 list-decimal pl-5">
              {IMPLEMENTED_COMMITS.map((commit, index) => (
                <li key={`${commit.hash}-${index}`} className="rounded-lg border bg-card p-3">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge variant="outline">#{index + 1}</Badge>
                    <Badge>{commit.hash}</Badge>
                    <span className="text-xs text-muted-foreground">{commit.date}</span>
                  </div>
                  <p className="text-sm">{commit.message}</p>
                </li>
              ))}
            </ol>
          </ScrollArea>
        </Card>
      </main>
    </div>
  );
}
