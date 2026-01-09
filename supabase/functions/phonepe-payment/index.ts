import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// DEMO MODE: Automatically disabled when PhonePe credentials are configured
// When you have real PhonePe Business credentials, set these environment variables:
// PHONEPE_MERCHANT_ID, PHONEPE_SALT_KEY, PHONEPE_SALT_INDEX, PHONEPE_HOST_URL
const DEMO_MODE = !Deno.env.get('PHONEPE_MERCHANT_ID');

// SHA256 hash function (for real PhonePe integration)
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount, orderId, userId, redirectUrl } = await req.json();

    console.log(`Initiating payment - Amount: ${amount}, OrderId: ${orderId}, Demo Mode: ${DEMO_MODE}`);

    if (!amount || !orderId) {
      return new Response(
        JSON.stringify({ error: 'Amount and orderId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const merchantTransactionId = `TXN_${orderId}_${Date.now()}`;

    if (DEMO_MODE) {
      // In demo mode, directly mark payment as successful and redirect
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Update order as paid
      const { error } = await supabase
        .from('orders')
        .update({ 
          payment_status: 'paid',
          status: 'confirmed',
          payment_method: 'PHONEPE_DEMO',
          notes: `Demo TXN: ${merchantTransactionId}`
        })
        .eq('id', orderId);

      if (error) {
        console.error('Error updating order:', error);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to update order' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Demo payment successful for order ${orderId}`);

      // Return success with redirect URL (to order success page)
      return new Response(
        JSON.stringify({
          success: true,
          merchantTransactionId,
          redirectUrl: redirectUrl || `${req.headers.get('origin')}/order-success?orderId=${orderId}`,
          demoMode: true,
          message: 'Demo payment processed successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // REAL PHONEPE INTEGRATION (uncomment when you have credentials)
    /*
    const MERCHANT_ID = Deno.env.get('PHONEPE_MERCHANT_ID')!;
    const SALT_KEY = Deno.env.get('PHONEPE_SALT_KEY')!;
    const SALT_INDEX = Deno.env.get('PHONEPE_SALT_INDEX') || '1';
    const PHONEPE_HOST_URL = Deno.env.get('PHONEPE_HOST_URL') || 'https://api-preprod.phonepe.com/apis/pg-sandbox';

    const payload = {
      merchantId: MERCHANT_ID,
      merchantTransactionId: merchantTransactionId,
      merchantUserId: userId || 'GUEST',
      amount: Math.round(amount * 100),
      redirectUrl: redirectUrl,
      redirectMode: "REDIRECT",
      callbackUrl: `${supabaseUrl}/functions/v1/phonepe-webhook`,
      paymentInstrument: { type: "PAY_PAGE" }
    };

    const payloadString = JSON.stringify(payload);
    const base64Payload = btoa(payloadString);
    const checksum = await sha256(base64Payload + "/pg/v1/pay" + SALT_KEY) + "###" + SALT_INDEX;

    const response = await fetch(`${PHONEPE_HOST_URL}/pg/v1/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': checksum,
      },
      body: JSON.stringify({ request: base64Payload }),
    });

    const data = await response.json();
    
    if (data.success && data.data?.instrumentResponse?.redirectInfo?.url) {
      return new Response(
        JSON.stringify({
          success: true,
          merchantTransactionId,
          redirectUrl: data.data.instrumentResponse.redirectInfo.url,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    */

    return new Response(
      JSON.stringify({ success: false, error: 'Payment gateway not configured' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Payment error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
