import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// DEMO MODE: Always enabled since we don't have Stripe keys
// When you have real Stripe credentials, set STRIPE_SECRET_KEY environment variable
const DEMO_MODE = !Deno.env.get('STRIPE_SECRET_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount, orderId, redirectUrl } = await req.json();

    console.log(`Stripe Payment - Amount: ${amount}, OrderId: ${orderId}, Demo Mode: ${DEMO_MODE}`);

    if (!amount || !orderId) {
      return new Response(
        JSON.stringify({ error: 'Amount and orderId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const transactionId = `txn_${orderId}_${Date.now()}`;

    if (DEMO_MODE) {
      // In demo mode, redirect to Stripe simulator page
      const origin = req.headers.get('origin') || 'http://localhost:5173';
      const simulatorUrl = `${origin}/stripe-sandbox?orderId=${orderId}&amount=${amount}&txnId=${transactionId}`;

      console.log(`Demo mode: Redirecting to Stripe simulator at ${simulatorUrl}`);

      return new Response(
        JSON.stringify({
          success: true,
          transactionId,
          redirectUrl: simulatorUrl,
          demoMode: true,
          message: 'Redirecting to Stripe sandbox simulator'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // REAL STRIPE INTEGRATION (when STRIPE_SECRET_KEY is set)
    /*
    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;
    
    const session = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'payment_method_types[]': 'card',
        'line_items[0][price_data][currency]': 'inr',
        'line_items[0][price_data][product_data][name]': 'Campus Canteen Order',
        'line_items[0][price_data][unit_amount]': String(Math.round(amount * 100)),
        'line_items[0][quantity]': '1',
        'mode': 'payment',
        'success_url': `${redirectUrl}?session_id={CHECKOUT_SESSION_ID}`,
        'cancel_url': `${origin}/checkout`,
        'metadata[order_id]': orderId,
      }),
    });

    const sessionData = await session.json();
    
    if (sessionData.url) {
      return new Response(
        JSON.stringify({
          success: true,
          transactionId: sessionData.id,
          redirectUrl: sessionData.url,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    */

    return new Response(
      JSON.stringify({ success: false, error: 'Stripe not configured' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Stripe payment error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
