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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle callback from PhonePe
    if (req.method === 'POST') {
      const body = await req.json();
      console.log('PhonePe webhook received:', JSON.stringify(body));

      // Decode the response
      const decodedResponse = body.response ? JSON.parse(atob(body.response)) : body;
      console.log('Decoded response:', JSON.stringify(decodedResponse));

      const merchantTransactionId = decodedResponse.data?.merchantTransactionId;
      
      if (!merchantTransactionId) {
        console.error('No merchantTransactionId in webhook');
        return new Response(
          JSON.stringify({ status: 'error', message: 'No transaction ID' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Extract order ID from merchantTransactionId (format: TXN_orderId_timestamp)
      const parts = merchantTransactionId.split('_');
      const orderId = parts.length >= 2 ? parts[1] : null;

      console.log(`Processing webhook for order: ${orderId}, txnId: ${merchantTransactionId}`);

      // Verify payment status with PhonePe
      const statusChecksum = await sha256(`/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}` + SALT_KEY) + "###" + SALT_INDEX;

      const statusResponse = await fetch(
        `${PHONEPE_HOST_URL}/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-VERIFY': statusChecksum,
            'X-MERCHANT-ID': MERCHANT_ID,
          },
        }
      );

      const statusData = await statusResponse.json();
      console.log('PhonePe status check response:', JSON.stringify(statusData));

      if (statusData.success && statusData.code === 'PAYMENT_SUCCESS') {
        // Update order status in database
        if (orderId) {
          const { error } = await supabase
            .from('orders')
            .update({ 
              payment_status: 'paid',
              status: 'confirmed',
              payment_method: 'PHONEPE',
              notes: `PhonePe TXN: ${merchantTransactionId}`
            })
            .eq('id', orderId);

          if (error) {
            console.error('Error updating order:', error);
          } else {
            console.log(`Order ${orderId} updated to confirmed/paid`);
          }
        }

        return new Response(
          JSON.stringify({ status: 'success', message: 'Payment confirmed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // Payment failed
        if (orderId) {
          await supabase
            .from('orders')
            .update({ 
              payment_status: 'failed',
              status: 'cancelled'
            })
            .eq('id', orderId);
        }

        return new Response(
          JSON.stringify({ status: 'failed', message: statusData.message || 'Payment failed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Handle status check request
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const merchantTransactionId = url.searchParams.get('txnId');

      if (!merchantTransactionId) {
        return new Response(
          JSON.stringify({ error: 'Transaction ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const statusChecksum = await sha256(`/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}` + SALT_KEY) + "###" + SALT_INDEX;

      const statusResponse = await fetch(
        `${PHONEPE_HOST_URL}/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-VERIFY': statusChecksum,
            'X-MERCHANT-ID': MERCHANT_ID,
          },
        }
      );

      const statusData = await statusResponse.json();
      console.log('Status check response:', JSON.stringify(statusData));

      return new Response(
        JSON.stringify(statusData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('PhonePe webhook error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
