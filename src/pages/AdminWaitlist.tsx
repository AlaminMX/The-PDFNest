import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Search, Mail, Loader2, Users, Send } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import { format } from "date-fns";

interface WaitlistEntry {
  id: string;
  name: string;
  email: string;
  whatsapp_number: string;
  created_at: string;
}

export default function AdminWaitlist() {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminStatus();
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Email compose state
  const [composeOpen, setComposeOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [confirmSendOpen, setConfirmSendOpen] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast.error("Access denied.");
      navigate("/");
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) fetchEntries();
  }, [isAdmin]);

  const fetchEntries = async () => {
    try {
      const { data, error } = await supabase
        .from("store_waitlist" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setEntries((data as any) || []);
    } catch (error) {
      console.error("Error fetching waitlist:", error);
      toast.error("Failed to load waitlist");
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = entries.filter(
    (e) =>
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.whatsapp_number.includes(searchQuery)
  );

  const handleOpenCompose = () => {
    if (entries.length === 0) {
      toast.error("No waitlist entries to email");
      return;
    }
    setEmailSubject("");
    setEmailBody("");
    setComposeOpen(true);
  };

  const handleSendEmail = async () => {
    setConfirmSendOpen(false);
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-waitlist-email", {
        body: { subject: emailSubject, body: emailBody },
      });
      if (error) throw error;
      const result = data as { sent: number; failed: number };
      toast.success(`Email sent to ${result.sent} recipients${result.failed > 0 ? `, ${result.failed} failed` : ""}`);
      setComposeOpen(false);
    } catch (error: any) {
      console.error("Email send error:", error);
      toast.error(error.message || "Failed to send emails");
    } finally {
      setSending(false);
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} className="shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Store Waitlist</h1>
              <p className="text-xs text-muted-foreground">{entries.length} entries</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleOpenCompose}>
              <Mail className="w-4 h-4" />
              <span className="hidden sm:inline">Email All</span>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="gap-1">
            <Users className="w-3 h-3" />
            {filteredEntries.length} {filteredEntries.length === 1 ? "entry" : "entries"}
          </Badge>
        </div>

        {/* Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="hidden sm:table-cell">WhatsApp</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {entries.length === 0 ? "No waitlist entries yet" : "No results found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntries.map((entry, index) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-medium">{entry.name}</TableCell>
                      <TableCell className="text-muted-foreground">{entry.email}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {entry.whatsapp_number}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {format(new Date(entry.created_at), "MMM d, yyyy h:mm a")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Mobile card view for small screens */}
        <div className="sm:hidden space-y-3">
          {filteredEntries.map((entry) => (
            <Card key={entry.id} className="p-4 space-y-2">
              <p className="font-medium">{entry.name}</p>
              <p className="text-sm text-muted-foreground">{entry.email}</p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{entry.whatsapp_number}</span>
                <span>{format(new Date(entry.created_at), "MMM d, yyyy")}</span>
              </div>
            </Card>
          ))}
        </div>
      </main>

      {/* Compose Email Dialog */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Email to Waitlist</DialogTitle>
            <DialogDescription>
              This will send an email to all {entries.length} waitlist members.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                placeholder="e.g. School Store Launch Update"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                maxLength={200}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email-body">Message</Label>
              <Textarea
                id="email-body"
                placeholder="Write your message here..."
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={8}
                maxLength={5000}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setComposeOpen(false)} disabled={sending}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!emailSubject.trim() || !emailBody.trim()) {
                  toast.error("Subject and message are required");
                  return;
                }
                setConfirmSendOpen(true);
              }}
              disabled={sending || !emailSubject.trim() || !emailBody.trim()}
              className="gap-2"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? "Sending..." : "Send Email"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Send Dialog */}
      <AlertDialog open={confirmSendOpen} onOpenChange={setConfirmSendOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Send</AlertDialogTitle>
            <AlertDialogDescription>
              This will send "{emailSubject}" to all {entries.length} waitlist emails. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSendEmail}>Send to All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
