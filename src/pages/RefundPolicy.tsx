import { Logo } from "@/components/Logo";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/PageTransition";

export default function RefundPolicy() {
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
          <h1 className="text-2xl font-bold mb-6">Refund and Cancellation Policy</h1>

          <div className="prose prose-sm dark:prose-invert max-w-none space-y-4 text-muted-foreground">
            <p>
              This refund and cancellation policy outlines how you can cancel or seek a refund for a product/service that you have purchased through the Platform. Under this policy:
            </p>

            <ol className="list-decimal pl-6 space-y-4">
              <li>
                <strong className="text-foreground">Cancellation Window:</strong> Cancellations will only be considered if the request is made within 1 day of placing the order. However, cancellation requests may not be entertained if the orders have been communicated to such sellers/merchant(s) listed on the Platform and they have initiated the process of shipping them, or the product is out for delivery. In such an event, you may choose to reject the product at the doorstep.
              </li>
              
              <li>
                <strong className="text-foreground">Perishable Items:</strong> BiteOS does not accept cancellation requests for perishable items like flowers, eatables, etc. However, the refund/replacement can be made if the user establishes that the quality of the product delivered is not good.
              </li>
              
              <li>
                <strong className="text-foreground">Damaged or Defective Items:</strong> In case of receipt of damaged or defective items, please report to our customer service team. The request would be entertained once the seller/merchant listed on the Platform, has checked and determined the same at its own end. This should be reported within 1 day of receipt of products. In case you feel that the product received is not as shown on the site or as per your expectations, you must bring it to the notice of our customer service within 1 day of receiving the product. The customer service team after looking into your complaint will take an appropriate decision.
              </li>
              
              <li>
                <strong className="text-foreground">Warranty Claims:</strong> In case of complaints regarding the products that come with a warranty from the manufacturers, please refer the issue to them.
              </li>
              
              <li>
                <strong className="text-foreground">Refund Processing:</strong> In case of any refunds approved by BiteOS, it will take 7 days for the refund to be processed to you.
              </li>
            </ol>

            <section className="mt-8">
              <h2 className="text-lg font-semibold text-foreground mb-4">Contact for Refund/Cancellation</h2>
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
