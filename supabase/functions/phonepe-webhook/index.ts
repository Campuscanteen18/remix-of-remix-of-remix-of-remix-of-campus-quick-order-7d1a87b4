import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-verify',
};

// PhonePe Config - In production, use environment variables
const PHONEPE_HOST_URL = Deno.env.get('PHONEPE_HOST_URL') || "https://api-preprod.phonepe.com/apis/pg-sandbox";
const MERCHANT_ID = Deno.env.get('PHONEPE_MERCHANT_ID') || "PGTESTPAYUAT";
const SALT_KEY = Deno.env.get('PHONEPE_SALT_KEY') || "099eb0cd-02cf-4e2a-8aca-3e6c6aff0399";
const SALT_INDEX = Deno.env.get('PHONEPE_SALT_INDEX') || "1";

// Demo mode flag - disable in production
const DEMO_MODE = !Deno.env.get('PHONEPE_MERCHANT_ID');

// Rate limiting for webhook calls
const webhookCalls = new Map<string, { count: number; firstCall: number }>();
const MAX_WEBHOOK_CALLS = 10; // Max calls per transaction
const WEBHOOK_WINDOW = 60 * 1000; // 1 minute window

// Idempotency tracking - prevent replay attacks
const processedTransactions = new Map<string, number>();
const TRANSACTION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

// SHA256 hash function for signature verification
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Verify PhonePe callback signature
async function verifySignature(base64Response: string, receivedChecksum: string): Promise<boolean> {
  if (!receivedChecksum) {
    console.error('No X-VERIFY header received');
    return false;
  }

  // PhonePe calculates checksum as: SHA256(base64Response + SALT_KEY) + "###" + SALT_INDEX
  const expectedChecksum = await sha256(base64Response + SALT_KEY) + "###" + SALT_INDEX;
  
  const isValid = receivedChecksum === expectedChecksum;
  if (!isValid) {
    console.error('Signature mismatch:', { received: receivedChecksum, expected: expectedChecksum });
  }
  return isValid;
}

// Check rate limit for webhook calls
function checkWebhookRateLimit(transactionId: string): boolean {
  const now = Date.now();
  const record = webhookCalls.get(transactionId);
  
  if (!record) {
    webhookCalls.set(transactionId, { count: 1, firstCall: now });
    return true;
  }
  
  // Reset if window has passed
  if (now - record.firstCall > WEBHOOK_WINDOW) {
    webhookCalls.set(transactionId, { count: 1, firstCall: now });
    return true;
  }
  
  if (record.count >= MAX_WEBHOOK_CALLS) {
    console.error(`Rate limit exceeded for transaction: ${transactionId}`);
    return false;
  }
  
  record.count += 1;
  return true;
}

// Check idempotency - prevent replay attacks
function checkIdempotency(transactionId: string): boolean {
  const now = Date.now();
  
  // Clean up old entries
  for (const [id, timestamp] of processedTransactions.entries()) {
    if (now - timestamp > TRANSACTION_EXPIRY) {
      processedTransactions.delete(id);
    }
  }
  
  if (processedTransactions.has(transactionId)) {
    console.log(`Transaction already processed: ${transactionId}`);
    return false;
  }
  
  return true;
}

// Mark transaction as processed
function markTransactionProcessed(transactionId: string): void {
  processedTransactions.set(transactionId, Date.now());
}

// Verify payment status directly with PhonePe (server-to-server verification)
async function verifyPaymentWithPhonePe(merchantTransactionId: string): Promise<{ success: boolean; code: string; message: string }> {
  try {
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
    console.log('PhonePe status verification response:', JSON.stringify(statusData));

    return {
      success: statusData.success && statusData.code === 'PAYMENT_SUCCESS',
      code: statusData.code || 'UNKNOWN',
      message: statusData.message || 'Unknown status'
    };
  } catch (error) {
    console.error('Error verifying with PhonePe:', error);
    return { success: false, code: 'VERIFICATION_ERROR', message: 'Failed to verify with PhonePe' };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Webhook request received from ${req.headers.get('x-forwarded-for') || 'unknown'}`);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle callback from PhonePe
    if (req.method === 'POST') {
      const body = await req.json();
      console.log(`[${requestId}] Webhook payload received`);

      // In demo mode, skip signature verification but log warning
      if (DEMO_MODE) {
        console.warn(`[${requestId}] DEMO MODE: Signature verification skipped`);
      } else {
        // CRITICAL: Verify signature from PhonePe
        const receivedChecksum = req.headers.get('X-VERIFY');
        if (!body.response || !receivedChecksum) {
          console.error(`[${requestId}] Missing response or X-VERIFY header`);
          return new Response(
            JSON.stringify({ status: 'error', message: 'Invalid webhook format' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const isValidSignature = await verifySignature(body.response, receivedChecksum);
        if (!isValidSignature) {
          console.error(`[${requestId}] Invalid signature - potential attack`);
          return new Response(
            JSON.stringify({ status: 'error', message: 'Invalid signature' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        console.log(`[${requestId}] Signature verified successfully`);
      }

      // Decode the response
      let decodedResponse;
      try {
        decodedResponse = body.response ? JSON.parse(atob(body.response)) : body;
      } catch (e) {
        console.error(`[${requestId}] Failed to decode response:`, e);
        return new Response(
          JSON.stringify({ status: 'error', message: 'Invalid response format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const merchantTransactionId = decodedResponse.data?.merchantTransactionId;
      
      if (!merchantTransactionId) {
        console.error(`[${requestId}] No merchantTransactionId in webhook`);
        return new Response(
          JSON.stringify({ status: 'error', message: 'No transaction ID' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Rate limiting check
      if (!checkWebhookRateLimit(merchantTransactionId)) {
        return new Response(
          JSON.stringify({ status: 'error', message: 'Rate limit exceeded' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Idempotency check - prevent replay attacks
      if (!checkIdempotency(merchantTransactionId)) {
        return new Response(
          JSON.stringify({ status: 'success', message: 'Already processed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Extract order ID from merchantTransactionId (format: TXN_orderId_timestamp)
      const parts = merchantTransactionId.split('_');
      const orderId = parts.length >= 2 ? parts[1] : null;

      if (!orderId) {
        console.error(`[${requestId}] Could not extract orderId from: ${merchantTransactionId}`);
        return new Response(
          JSON.stringify({ status: 'error', message: 'Invalid transaction ID format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate orderId is a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(orderId)) {
        console.error(`[${requestId}] Invalid orderId format: ${orderId}`);
        return new Response(
          JSON.stringify({ status: 'error', message: 'Invalid order ID' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[${requestId}] Processing webhook for order: ${orderId}, txnId: ${merchantTransactionId}`);

      // CRITICAL: Server-to-server verification with PhonePe
      // Don't trust the webhook payload alone - verify directly with PhonePe
      let paymentVerified = false;
      
      if (DEMO_MODE) {
        // In demo mode, trust the decoded response
        paymentVerified = decodedResponse.success && decodedResponse.code === 'PAYMENT_SUCCESS';
        console.warn(`[${requestId}] DEMO MODE: Using decoded response for verification`);
      } else {
        const verification = await verifyPaymentWithPhonePe(merchantTransactionId);
        paymentVerified = verification.success;
        console.log(`[${requestId}] PhonePe verification result: ${verification.code}`);
      }

      if (paymentVerified) {
        // Mark as processed before updating DB
        markTransactionProcessed(merchantTransactionId);

        // Update order status in database
        const { error } = await supabase
          .from('orders')
          .update({ 
            payment_status: 'paid',
            status: 'confirmed',
            payment_method: 'PHONEPE',
            notes: `PhonePe TXN: ${merchantTransactionId}`
          })
          .eq('id', orderId)
          .eq('payment_status', 'pending'); // Only update if still pending (extra safety)

        if (error) {
          console.error(`[${requestId}] Error updating order:`, error);
        } else {
          console.log(`[${requestId}] Order ${orderId} updated to confirmed/paid`);
        }

        return new Response(
          JSON.stringify({ status: 'success', message: 'Payment confirmed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // Payment failed or not verified
        console.log(`[${requestId}] Payment not verified for order ${orderId}`);
        
        await supabase
          .from('orders')
          .update({ 
            payment_status: 'failed',
            status: 'cancelled'
          })
          .eq('id', orderId)
          .eq('payment_status', 'pending');

        return new Response(
          JSON.stringify({ status: 'failed', message: 'Payment verification failed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Handle status check request (authenticated only)
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const merchantTransactionId = url.searchParams.get('txnId');

      if (!merchantTransactionId) {
        return new Response(
          JSON.stringify({ error: 'Transaction ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate transaction ID format
      if (!/^TXN_[0-9a-f-]+_\d+$/i.test(merchantTransactionId)) {
        return new Response(
          JSON.stringify({ error: 'Invalid transaction ID format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const verification = await verifyPaymentWithPhonePe(merchantTransactionId);
      
      return new Response(
        JSON.stringify(verification),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error(`[${requestId}] PhonePe webhook error:`, error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
