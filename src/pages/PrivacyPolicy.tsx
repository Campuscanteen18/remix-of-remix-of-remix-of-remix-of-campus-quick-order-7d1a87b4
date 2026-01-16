import { Logo } from "@/components/Logo";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/PageTransition";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border/50">
          <div className="flex items-center gap-3 px-4 lg:px-6 h-14">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft size={20} />
            </Button>
            <Logo size="sm" />
          </div>
        </header>

        {/* Content */}
        <main className="max-w-3xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-6">Privacy Policy</h1>

          <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-lg font-semibold text-foreground">Introduction</h2>
              <p>
                This Privacy Policy describes how BiteOS and its affiliates (collectively "BiteOS, we, our, us") collect, use, share, protect or otherwise process your information/personal data through our Platform. Please note that you may be able to browse certain sections of the Platform without registering with us. We do not offer any product/service under this Platform outside India and your personal data will primarily be stored and processed in India. By visiting this Platform, providing your information or availing any product/service offered on the Platform, you expressly agree to be bound by the terms and conditions of this Privacy Policy, the Terms of Use and the applicable service/product terms and conditions, and agree to be governed by the laws of India including but not limited to the laws applicable to data protection and privacy. If you do not agree please do not use or access our Platform.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">Collection</h2>
              <p>
                We collect your personal data when you use our Platform, services or otherwise interact with us during the course of our relationship and related information provided from time to time. Some of the information that we may collect includes but is not limited to personal data/information provided to us during sign-up/registering or using our Platform such as name, date of birth, address, telephone/mobile number, email ID and/or any such information shared as proof of identity or address. Some of the sensitive personal data may be collected with your consent, such as your bank account or credit or debit card or other payment instrument information or biometric information such as your facial features or physiological information (in order to enable use of certain features when opted for, available on the Platform) etc all of the above being in accordance with applicable law(s).
              </p>
              <p>
                You always have the option to not provide information, by choosing not to use a particular service or feature on the Platform. We may track your behaviour, preferences, and other information that you choose to provide on our Platform. This information is compiled and analysed on an aggregated basis.
              </p>
              <p>
                If you receive an email, a call from a person/association claiming to be BiteOS seeking any personal data like debit/credit card PIN, net-banking or mobile banking password, we request you to never provide such information. If you have already revealed such information, report it immediately to an appropriate law enforcement agency.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">Usage</h2>
              <p>
                We use personal data to provide the services you request. To the extent we use your personal data to market to you, we will provide you the ability to opt-out of such uses. We use your personal data to assist sellers and business partners in handling and fulfilling orders; enhancing customer experience; to resolve disputes; troubleshoot problems; inform you about online and offline offers, products, services, and updates; customise your experience; detect and protect us against error, fraud and other criminal activity; enforce our terms and conditions; conduct marketing research, analysis and surveys; and as otherwise described to you at the time of collection of information.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">Sharing</h2>
              <p>
                We may share your personal data internally within our group entities, our other corporate entities, and affiliates to provide you access to the services and products offered by them. These entities and affiliates may market to you as a result of such sharing unless you explicitly opt-out.
              </p>
              <p>
                We may disclose personal data to third parties such as sellers, business partners, third party service providers including logistics partners, prepaid payment instrument issuers, third-party reward programs and other payment opted by you. These disclosure may be required for us to provide you access to our services and products offered to you, to comply with our legal obligations, to enforce our user agreement, to facilitate our marketing and advertising activities, to prevent, detect, mitigate, and investigate fraudulent or illegal activities related to our services.
              </p>
              <p>
                We may disclose personal and sensitive personal data to government agencies or other authorised law enforcement agencies if required to do so by law or in the good faith belief that such disclosure is reasonably necessary to respond to subpoenas, court orders, or other legal processes.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">Security Precautions</h2>
              <p>
                To protect your personal data from unauthorised access or disclosure, loss or misuse we adopt reasonable security practices and procedures. Once your information is in our possession or whenever you access your account information, we adhere to our security guidelines to protect it against unauthorised access and offer the use of a secure server. However, the transmission of information is not completely secure for reasons beyond our control.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">Data Deletion and Retention</h2>
              <p>
                You have an option to delete your account by visiting your profile and settings on our Platform, this action would result in you losing all information related to your account. You may also write to us at the contact information provided below to assist you with these requests. We may in event of any pending grievance, claims, pending shipments or any other services we may refuse or delay deletion of the account.
              </p>
              <p>
                We retain your personal data information for a period no longer than is required for the purpose for which it was collected or as required under any applicable law. However, we may retain data related to you if we believe it may be necessary to prevent fraud or future abuse or for other legitimate purposes.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">Your Rights</h2>
              <p>
                You may access, rectify, and update your personal data directly through the functionalities provided on the Platform.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">Consent</h2>
              <p>
                By visiting our Platform or by providing your information, you consent to the collection, use, storage, disclosure and otherwise processing of your information on the Platform in accordance with this Privacy Policy. If you disclose to us any personal data relating to other people, you represent that you have the authority to do so and permit us to use the information in accordance with this Privacy Policy.
              </p>
              <p>
                You have an option to withdraw your consent that you have already provided by writing to the Grievance Officer at the contact information provided below. Please mention "Withdrawal of consent for processing personal data" in your subject line of your communication.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">Changes to this Privacy Policy</h2>
              <p>
                Please check our Privacy Policy periodically for changes. We may update this Privacy Policy to reflect changes to our information practices. We may alert/notify you about the significant changes to the Privacy Policy, in the manner as may be required under applicable laws.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground">Grievance Officer</h2>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p><strong>Name:</strong> Mr. Bareddy Janardhan Reddy</p>
                <p><strong>Designation:</strong> FOUNDER</p>
                <p><strong>Company:</strong> BiteOS Tech</p>
                <p><strong>Address:</strong> 29-178-32/D6, SBI Colony, Nandyal</p>
                <p><strong>Contact:</strong> biteostech@gmail.com</p>
                <p><strong>Time:</strong> Monday - Friday (9:00 - 18:00)</p>
              </div>
            </section>
          </div>

          {/* Footer */}
          <footer className="mt-12 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              © {new Date().getFullYear()} BiteOS Tech. All rights reserved.
            </p>
          </footer>
        </main>
      </div>
    </PageTransition>
  );
}
