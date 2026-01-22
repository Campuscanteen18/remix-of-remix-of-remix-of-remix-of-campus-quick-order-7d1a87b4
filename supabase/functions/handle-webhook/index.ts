import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Get the Data from Cashfree
    const payload = await req.json()
    console.log("Webhook Received:", JSON.stringify(payload))

    // 2. Check if Payment was Successful
    // Cashfree structure: data.payment.payment_status OR type === "PAYMENT_SUCCESS_WEBHOOK"
    const type = payload.type
    const orderId = payload.data?.order?.order_id
    const paymentStatus = payload.data?.payment?.payment_status

    if (type === "PAYMENT_SUCCESS_WEBHOOK" || paymentStatus === "SUCCESS") {
      
      // 3. Connect to Supabase
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      // 4. Update the Order in Database
      const { error } = await supabase
        .from('orders')
        .update({ 
          payment_status: 'paid',   // Money Received
          status: 'confirmed'       // Send to Kitchen
        })
        .eq('id', orderId)

      if (error) {
        console.error("Database Update Failed:", error)
        return new Response("DB Error", { status: 500 })
      }

      console.log(`Order ${orderId} marked as PAID.`)
      return new Response("Order Updated", { status: 200 })
    }

    return new Response("Ignored", { status: 200 })

  } catch (err: any) { // <--- FIXED: Added ': any' here
    console.error("Webhook Error:", err.message)
    return new Response("Error", { status: 400 })
  }
})