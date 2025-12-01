import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5">
      <PageHeader
        title="Terms and Conditions"
        subtitle="Please read these terms carefully"
        showBack
      />

      <main className="container mx-auto px-4 py-6 md:py-8 max-w-4xl">
        <div className="bg-card rounded-lg shadow-lg p-6 md:p-8 space-y-6">
          <div className="space-y-6 text-muted-foreground">
            <section className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
              <p className="leading-relaxed">By accessing or using PDFNest ("the Platform"), you agree to be bound by these Terms and Conditions and our Privacy Policy. If you do not agree, please discontinue use immediately.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">2. Service Overview</h2>
              <p className="leading-relaxed">PDFNest provides users with online storage, management, and reading tools for PDF files. Each user is given free or paid access to storage space and related services as specified in their account plan.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">3. User Responsibilities</h2>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
                <li>You agree not to upload, share, or store any illegal, harmful, or copyrighted materials that you do not have permission to use.</li>
                <li>You agree not to use the Platform for any unlawful or fraudulent purposes.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">4. Uploaded Content</h2>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>You retain full ownership of the PDF files you upload to your account.</li>
                <li>By uploading content, you grant PDFNest a limited, non-exclusive, and revocable license to store, process, and display your files for the purpose of providing the service.</li>
                <li><strong className="text-foreground">Administrative Access:</strong> For security, moderation, maintenance, and legal compliance purposes, authorized PDFNest administrators may access, review, or remove uploaded PDFs. This ensures protection against abuse, copyright infringement, or policy violations.</li>
                <li>We do not publicly share or sell your PDFs without your consent.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">5. Data Privacy</h2>
              <p className="leading-relaxed">Your data is stored securely and handled according to our Privacy Policy. Administrative access is limited strictly to authorized personnel and exercised only when necessary for service maintenance, user support, or legal obligations.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">6. Storage & Account Limits</h2>
              <p className="leading-relaxed">Free accounts have limited storage capacity. Exceeding your limit may restrict uploads until you upgrade or delete files.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">7. Service Availability</h2>
              <p className="leading-relaxed">We strive for maximum uptime but cannot guarantee uninterrupted service. PDFNest reserves the right to modify, suspend, or discontinue any aspect of the service at any time.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">8. Termination</h2>
              <p className="leading-relaxed">We may suspend or terminate your account if you violate these Terms, engage in prohibited activities, or misuse the Platform.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">9. Disclaimer</h2>
              <p className="leading-relaxed">PDFNest is provided "as is" and "as available." We do not guarantee that the service will always be error-free or secure. Use is at your own risk.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">10. Limitation of Liability</h2>
              <p className="leading-relaxed">PDFNest shall not be liable for any direct, indirect, incidental, or consequential damages resulting from your use or inability to use the Platform.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">11. Changes to Terms</h2>
              <p className="leading-relaxed">We may update these Terms periodically. Continued use of the Platform after changes take effect constitutes acceptance of the revised Terms.</p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
