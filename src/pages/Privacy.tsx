import { PageHeader } from "@/components/PageHeader";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5">
      <PageHeader
        title="Privacy Policy"
        subtitle="How we handle your data"
        showBack
      />

      <main className="container mx-auto px-4 py-6 md:py-8 max-w-4xl">
        <div className="bg-card rounded-lg shadow-lg p-6 md:p-8 space-y-6">
          <p className="text-sm text-muted-foreground">Last updated: December 2024</p>
          
          <p className="text-muted-foreground leading-relaxed">
            PDFNest respects your privacy and is committed to handling your data responsibly. This Privacy Policy explains what information we collect, how we use it, how it is accessed, and the choices you have.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            By using PDFNest, you agree to the practices described in this policy.
          </p>

          <div className="space-y-8 text-muted-foreground">
            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">1. Information We Collect</h2>
              
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-foreground">a. Account Information</h3>
                <p className="leading-relaxed">When you create an account, we collect:</p>
                <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                  <li>Email address</li>
                  <li>Login credentials (securely stored)</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-medium text-foreground">b. Uploaded Content</h3>
                <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                  <li>PDF files and related metadata (file name, size, upload date)</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-medium text-foreground">c. Usage Information</h3>
                <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                  <li>Basic activity data such as uploads, deletions, and access events</li>
                </ul>
              </div>

              <p className="leading-relaxed">
                PDFNest does not collect unnecessary personal information such as phone numbers, addresses, or government IDs.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">2. How We Use Your Information</h2>
              <p className="leading-relaxed">We use collected data strictly to:</p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>Provide and operate the PDFNest platform</li>
                <li>Authenticate users and secure accounts</li>
                <li>Store, process, and display uploaded files</li>
                <li>Moderate content and prevent abuse</li>
                <li>Improve platform features, including AI-powered tools</li>
                <li>Communicate important updates, notices, or support messages</li>
              </ul>
              <p className="leading-relaxed font-medium text-foreground">
                We do not sell, rent, or trade user data.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">3. Administrative Access to Data</h2>
              <p className="leading-relaxed">
                To operate PDFNest safely and effectively, authorized administrators may access certain user data.
              </p>

              <div className="space-y-2">
                <h3 className="text-lg font-medium text-foreground">Admin Access Includes:</h3>
                <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                  <li>Viewing and downloading uploaded PDF files</li>
                  <li>Reviewing content for moderation, academic relevance, quality control, research, and platform improvement</li>
                  <li>Accessing user email addresses for account-related communication</li>
                  <li>Viewing basic metadata (upload timestamps, file size, format)</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-medium text-foreground">Access Limitations:</h3>
                <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                  <li>Admin access is purpose-limited and used only when reasonably necessary</li>
                  <li>Uploaded files are not edited or altered by administrators</li>
                  <li>User content is not redistributed, sold, or published</li>
                  <li>Admin access is restricted to authorized personnel only</li>
                </ul>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">4. Academic & Student Content Notice</h2>
              <p className="leading-relaxed">
                PDFNest hosts academic materials uploaded by users, including course representatives.
              </p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>PDFNest does not verify or certify academic accuracy</li>
                <li>Materials are provided for convenience and personal study</li>
                <li>Users are responsible for verifying information independently</li>
              </ul>
              <p className="leading-relaxed">
                PDFNest is not affiliated with AFIT or any academic institution unless explicitly stated.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">5. AI Processing of Content</h2>
              <p className="leading-relaxed">
                PDFNest may process uploaded files using automated systems to provide features such as:
              </p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>Summaries</li>
                <li>Study guides</li>
                <li>Translations</li>
                <li>Voice reading</li>
                <li>Chat assistance</li>
              </ul>
              <p className="leading-relaxed">
                AI processing is automated and may contain inaccuracies. AI outputs are provided for assistance only.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">6. Data Storage & Security</h2>
              <p className="leading-relaxed">
                We take reasonable measures to protect user data, including:
              </p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>Secure authentication practices</li>
                <li>Controlled administrative access</li>
                <li>Use of reputable third-party infrastructure services</li>
              </ul>
              <p className="leading-relaxed">
                However, no system is completely secure. Users are encouraged to maintain personal backups of important files.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">7. Data Retention & Deletion</h2>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>Users may download or delete their uploaded files at any time</li>
                <li>Deleted files are removed from active systems, subject to limited backup retention</li>
                <li>Account data may be retained for legal, security, or operational reasons</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">8. Email Communication</h2>
              <p className="leading-relaxed">User email addresses are used only for:</p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>Account verification and recovery</li>
                <li>Platform updates and service notices</li>
                <li>Support communication</li>
              </ul>
              <p className="leading-relaxed">
                PDFNest does not send unsolicited marketing emails and does not share email addresses with third parties for advertising purposes.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">9. Third-Party Services</h2>
              <p className="leading-relaxed">
                PDFNest may rely on third-party services for hosting, storage, analytics, or AI processing.
              </p>
              <p className="leading-relaxed">
                These providers are granted limited access only as required to deliver their services and are expected to comply with applicable data protection standards.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">10. Children's Privacy</h2>
              <p className="leading-relaxed">
                PDFNest is not intended for children under the age of 13. We do not knowingly collect data from children.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">11. Changes to This Policy</h2>
              <p className="leading-relaxed">
                PDFNest may update this Privacy Policy from time to time. Continued use of the platform indicates acceptance of any updates.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">12. Contact</h2>
              <p className="leading-relaxed">
                For questions or privacy-related concerns, contact: <a href="mailto:nexelwebdev@gmail.com" className="text-primary hover:underline">nexelwebdev@gmail.com</a>
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
