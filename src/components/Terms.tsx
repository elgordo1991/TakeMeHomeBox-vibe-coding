import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Terms: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-deep-blue">
      {/* Header */}
      <div className="card-dark border-b border-silver/30">
        <div className="p-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate(-1)}
              className="btn-secondary p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-silver-light">Terms & Conditions</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 text-silver space-y-6 max-w-4xl mx-auto">
        <div className="card-dark p-6 space-y-4">
          <h2 className="text-2xl font-bold text-silver-light mb-4">TakeMeHomeBox Terms & Conditions</h2>
          
          <div className="space-y-6">
            <section>
              <h3 className="text-lg font-semibold text-silver-light mb-2">1. Acceptance of Terms</h3>
              <p className="text-silver leading-relaxed">
                This app is provided as-is for community use. By using TakeMeHomeBox, you agree to these terms and conditions. 
                No liability is assumed by the developers or operators of this platform for any issues arising from the use of this service.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-silver-light mb-2">2. Community Guidelines</h3>
              <p className="text-silver leading-relaxed mb-3">
                Users are expected to act responsibly and respectfully when participating in the TakeMeHomeBox community. This includes:
              </p>
              <ul className="list-disc list-inside text-silver space-y-2 ml-4">
                <li>Only listing items that are genuinely free and available</li>
                <li>Providing accurate descriptions and photos of items</li>
                <li>Respecting private property and following local laws</li>
                <li>Being courteous and honest in all interactions</li>
                <li>Not using the platform for commercial purposes</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-silver-light mb-2">3. Safety and Liability</h3>
              <p className="text-silver leading-relaxed">
                Users participate at their own risk. TakeMeHomeBox is not responsible for the safety, quality, or legality of items shared through the platform. 
                Users should exercise caution when collecting items and verify the condition and safety of any items before use.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-silver-light mb-2">4. Content and Privacy</h3>
              <p className="text-silver leading-relaxed">
                By posting content on TakeMeHomeBox, you grant the platform permission to display and share your listings with other users. 
                We respect your privacy and will only use your information to facilitate the sharing of items within the community.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-silver-light mb-2">5. Prohibited Activities</h3>
              <p className="text-silver leading-relaxed mb-3">
                The following activities are strictly prohibited:
              </p>
              <ul className="list-disc list-inside text-silver space-y-2 ml-4">
                <li>Posting illegal, harmful, or inappropriate content</li>
                <li>Attempting to sell items or conduct commercial transactions</li>
                <li>Harassing or threatening other users</li>
                <li>Misrepresenting items or providing false information</li>
                <li>Attempting to hack or disrupt the platform</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-silver-light mb-2">6. Account Termination</h3>
              <p className="text-silver leading-relaxed">
                We reserve the right to suspend or terminate accounts that violate these terms or engage in behavior that harms the community. 
                Users may also delete their accounts at any time through the profile settings.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-silver-light mb-2">7. Changes to Terms</h3>
              <p className="text-silver leading-relaxed">
                These terms may be updated from time to time. Continued use of the platform after changes constitutes acceptance of the new terms. 
                Users will be notified of significant changes through the app.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-silver-light mb-2">8. Contact Information</h3>
              <p className="text-silver leading-relaxed">
                If you have questions about these terms or need to report issues, please contact us through the app's feedback system or 
                reach out to our support team at support@takemehomebox.com.
              </p>
            </section>
          </div>

          <div className="mt-8 p-4 bg-dark-blue-light rounded-lg border border-silver/30">
            <p className="text-silver/80 text-sm text-center">
              Last updated: {new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
        </div>

        {/* Back to Profile Button */}
        <div className="text-center">
          <button
            onClick={() => navigate('/profile')}
            className="btn-primary"
          >
            Back to Profile
          </button>
        </div>
      </div>
    </div>
  );
};

export default Terms;