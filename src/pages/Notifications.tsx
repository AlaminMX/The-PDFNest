import { PageHeader } from "@/components/PageHeader";
import { SmartBottomNav } from "@/components/SmartBottomNav";
import { NotificationsInbox } from "@/components/NotificationsInbox";

export default function Notifications() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <PageHeader title="Notifications" showBack
        backTo="/dashboard" />
      
      <main className="container mx-auto px-4 py-6 pb-24 max-w-4xl">
        <NotificationsInbox />
      </main>

      <SmartBottomNav />
    </div>
  );
}