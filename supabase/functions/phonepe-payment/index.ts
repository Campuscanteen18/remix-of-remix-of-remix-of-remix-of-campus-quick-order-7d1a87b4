import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// PhonePe Sandbox Config
const PHONEPE_HOST_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox";
const MERCHANT_ID = "PGTESTPAYUAT";
const SALT_KEY = "099eb0cd-02cf-4e2a-8aca-3e6c6aff0399";
const SALT_INDEX = 1;

// SHA256 hash function
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Base64 encode
function base64Encode(str: string): string {
  return btoa(str);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    // Route: Initiate Payment
    if (req.method === 'POST' && path === 'phonepe-payment') {
      const { amount, orderId, userId, redirectUrl } = await req.json();

      console.log(`Initiating PhonePe payment - Amount: ${amount}, OrderId: ${orderId}`);

      if (!amount || !orderId) {
        return new Response(
          JSON.stringify({ error: 'Amount and orderId are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const merchantTransactionId = `TXN_${orderId}_${Date.now()}`;

      const payload = {
        merchantId: MERCHANT_ID,
        merchantTransactionId: merchantTransactionId,
        merchantUserId: userId || 'GUEST',
        amount: Math.round(amount * 100), // Convert to paise
        redirectUrl: redirectUrl || `${url.origin}/phonepe-callback`,
        redirectMode: "REDIRECT",
        callbackUrl: `https://dlaudfrhokdjtcmnhhap.supabase.co/functions/v1/phonepe-webhook`,
        paymentInstrument: {
          type: "PAY_PAGE"
        }
      };

      const payloadString = JSON.stringify(payload);
      const base64Payload = base64Encode(payloadString);
      const checksum = await sha256(base64Payload + "/pg/v1/pay" + SALT_KEY) + "###" + SALT_INDEX;

      console.log(`Making request to PhonePe with merchantTransactionId: ${merchantTransactionId}`);

      const response = await fetch(`${PHONEPE_HOST_URL}/pg/v1/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': checksum,
        },
        body: JSON.stringify({ request: base64Payload }),
      });

      const data = await response.json();
      console.log('PhonePe response:', JSON.stringify(data));

      if (data.success && data.data?.instrumentResponse?.redirectInfo?.url) {
        return new Response(
          JSON.stringify({
            success: true,
            merchantTransactionId,
            redirectUrl: data.data.instrumentResponse.redirectInfo.url,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        console.error('PhonePe payment initiation failed:', data);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: data.message || 'Payment initiation failed',
            code: data.code 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('PhonePe payment error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
