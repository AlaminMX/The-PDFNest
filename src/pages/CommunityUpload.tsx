import { Link } from "react-router-dom";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { SmartBottomNav } from "@/components/SmartBottomNav";

export default function CommunityUpload() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title="Contribute Material" showBack />

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Contribute Material
            </CardTitle>
            <CardDescription>
              Community contribution flow is being finalized. This route is now active and ready for full upload wiring.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3">
            <Button asChild>
              <Link to="/">Back to Dashboard</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/rep/upload">Use Current Upload</Link>
            </Button>
          </CardContent>
        </Card>
      </main>

      <SmartBottomNav />
    </div>
  );
}
