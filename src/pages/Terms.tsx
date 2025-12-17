import { PageHeader } from "@/components/PageHeader";

export default function Terms() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5">
      <PageHeader
        title="Terms & Conditions"
        subtitle="Please read these terms carefully"
        showBack
      />

      <main className="container mx-auto px-4 py-6 md:py-8 max-w-4xl">
        <div className="bg-card rounded-lg shadow-lg p-6 md:p-8 space-y-6">
          <p className="text-sm text-muted-foreground">Last updated: December 2024</p>
          
          <p className="text-muted-foreground leading-relaxed">
            Welcome to PDFNest. These Terms & Conditions govern your access to and use of the PDFNest platform. By creating an account or using the service, you agree to these terms. If you do not agree, do not use the platform.
          </p>

          <div className="space-y-8 text-muted-foreground">
            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">1. What PDFNest Is</h2>
              <p className="leading-relaxed">
                PDFNest is a cloud-based document storage and access platform designed to help users store, organize, and retrieve PDF files, including academic materials. PDFNest provides infrastructure only. We are not an academic authority, publisher, or educational institution.
              </p>
              <p className="leading-relaxed">
                PDFNest does not create, certify, verify, or guarantee the accuracy of any academic content uploaded to the platform.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">2. User Accounts</h2>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
                <li>All activity carried out under your account is your responsibility.</li>
                <li>PDFNest is not liable for unauthorized access resulting from user negligence.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">3. User-Uploaded Content</h2>
              
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-foreground">Ownership</h3>
                <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                  <li>Users retain full ownership of any files they upload.</li>
                  <li>Uploading content does not transfer ownership to PDFNest.</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-medium text-foreground">License to PDFNest</h3>
                <p className="leading-relaxed">
                  By uploading content, you grant PDFNest a non-exclusive, limited license to store, display, process, and analyze the content solely for platform operation, improvement, moderation, security, and support purposes.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-medium text-foreground">Responsibility</h3>
                <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                  <li>You confirm that you have the legal right to upload any content you submit.</li>
                  <li>PDFNest is not responsible for copyright infringement or legal violations arising from user-uploaded content.</li>
                </ul>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">4. Administrative Access & Moderation</h2>
              <p className="leading-relaxed">
                To operate the platform responsibly, PDFNest administrators may access user-uploaded content and limited account data under strict conditions.
              </p>

              <div className="space-y-2">
                <h3 className="text-lg font-medium text-foreground">Admin May:</h3>
                <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                  <li>View and download uploaded PDF files</li>
                  <li>Review content for moderation, safety, academic relevance, quality assurance, research, and platform improvement</li>
                  <li>Access uploader information and basic metadata (upload time, file size, format)</li>
                  <li>Remove or restrict access to content that violates platform policies, laws, or safety standards</li>
                  <li>Suspend or terminate accounts for violations, abuse, or security risks</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-medium text-foreground">Admin May Not:</h3>
                <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                  <li>Edit, alter, or modify user-uploaded academic content</li>
                  <li>Redistribute, publish, or sell uploaded files</li>
                  <li>Claim ownership of user content</li>
                  <li>Prevent users from downloading or deleting their own files</li>
                </ul>
              </div>

              <p className="leading-relaxed">
                Administrative access is purpose-limited and applied using the minimum necessary access principle.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">5. Course Representative Uploads</h2>
              <p className="leading-relaxed">
                Content uploaded by course representatives is user-generated. PDFNest does not edit or alter these materials and does not guarantee their completeness, accuracy, or exam relevance.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">6. Academic Disclaimer</h2>
              <p className="leading-relaxed">
                PDFNest is not affiliated with AFIT or any academic institution unless explicitly stated.
              </p>
              <p className="leading-relaxed">
                Lecture notes and academic materials are provided for convenience only. Users are responsible for verifying information independently. PDFNest is not liable for academic outcomes, performance, or decisions based on platform content.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">7. AI-Powered Features</h2>
              <p className="leading-relaxed">
                PDFNest may provide AI-based tools such as summaries, study guides, translations, voice reading, or chat assistance.
              </p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>AI outputs are automated and may contain errors.</li>
                <li>AI features are for assistance only and should not be treated as authoritative or definitive.</li>
                <li>Users must independently verify critical information.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">8. Storage, Availability & Data Loss</h2>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>PDFNest aims for reliable service but does not guarantee uninterrupted availability.</li>
                <li>Files may be lost due to system failures, maintenance, or third-party service disruptions.</li>
                <li>Users are encouraged to maintain personal backups of important files.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">9. Free Storage & Usage Limits</h2>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>Free storage limits may apply and may change over time.</li>
                <li>PDFNest reserves the right to introduce paid plans, adjust limits, or restrict excessive or abusive usage.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">10. Prohibited Use</h2>
              <p className="leading-relaxed">You may not:</p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>Upload illegal, harmful, malicious, or misleading content</li>
                <li>Attempt to exploit, hack, scrape, or disrupt the platform</li>
                <li>Use PDFNest for fraud, impersonation, or academic dishonesty</li>
              </ul>
              <p className="leading-relaxed">
                Violations may result in immediate account suspension or termination.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">11. Account Suspension & Termination</h2>
              <p className="leading-relaxed">
                PDFNest reserves the right to suspend or terminate accounts at its discretion for policy violations, security concerns, or legal compliance. Access to stored files may be lost upon termination.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">12. Limitation of Liability</h2>
              <p className="leading-relaxed">PDFNest is not liable for:</p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>Data loss</li>
                <li>Academic outcomes</li>
                <li>Indirect or consequential damages</li>
              </ul>
              <p className="leading-relaxed">
                Any liability, where applicable, is limited to the amount paid by the user for the service.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">13. Indemnification</h2>
              <p className="leading-relaxed">
                You agree to indemnify and hold PDFNest harmless from any claims, damages, or legal actions arising from your content, conduct, or misuse of the platform.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">14. Changes to These Terms</h2>
              <p className="leading-relaxed">
                PDFNest may update these Terms at any time. Continued use of the platform constitutes acceptance of the updated terms.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">15. Governing Law</h2>
              <p className="leading-relaxed">
                These Terms are governed by the laws of the Federal Republic of Nigeria. Any disputes shall be resolved in Nigerian courts.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">16. Contact</h2>
              <p className="leading-relaxed">
                For questions or support, contact: <a href="mailto:nexelwebdev@gmail.com" className="text-primary hover:underline">nexelwebdev@gmail.com</a>
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
