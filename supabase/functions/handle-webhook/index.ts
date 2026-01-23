import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    console.log("Webhook Received:", JSON.stringify(payload))

    const type = payload.type
    const orderId = payload.data?.order?.order_id
    const paymentStatus = payload.data?.payment?.payment_status

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (type === "PAYMENT_SUCCESS_WEBHOOK" || paymentStatus === "SUCCESS") {
      const { error } = await supabase
        .from('orders')
        .update({ 
          payment_status: 'paid',
          status: 'confirmed'
        })
        .eq('id', orderId)

      if (error) {
        console.error("Database Update Failed:", error)
        return new Response("DB Error", { status: 500 })
      }

      console.log(`Order ${orderId} marked as PAID.`)
      return new Response("Order Updated", { status: 200 })
    }

    if (type === "PAYMENT_FAILED_WEBHOOK" || paymentStatus === "FAILED" || paymentStatus === "CANCELLED" || paymentStatus === "USER_DROPPED") {
      const { error } = await supabase
        .from('orders')
        .update({ 
          payment_status: 'failed',
          status: 'pending'
        })
        .eq('id', orderId)

      if (error) {
        console.error("Database Update Failed:", error)
        return new Response("DB Error", { status: 500 })
      }

      console.log(`Order ${orderId} marked as FAILED.`)
      return new Response("Order Updated", { status: 200 })
    }

    return new Response("Ignored", { status: 200 })

  } catch (err) {
    console.error("Webhook Error:", err)
    return new Response("Error", { status: 400 })
  }
})
