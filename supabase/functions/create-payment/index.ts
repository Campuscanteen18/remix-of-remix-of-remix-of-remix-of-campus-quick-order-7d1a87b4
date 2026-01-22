// Setup: Allowed Headers for Browser Security (CORS)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 1. Start the Server
Deno.serve(async (req) => {
  // 2. Handle Browser Preflight Check
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 3. Read Data
    const { orderId, amount, customerName, customerPhone, customerId } = await req.json()

    // 4. Get Keys
    const APP_ID = Deno.env.get('CASHFREE_APP_ID')
    const SECRET_KEY = Deno.env.get('CASHFREE_SECRET_KEY')
    const CASHFREE_URL = "https://api.cashfree.com/pg/orders"

    if (!APP_ID || !SECRET_KEY) {
      throw new Error("Missing Cashfree Keys in Supabase Secrets")
    }

    // 5. Send to Cashfree
    const returnUrl = `${req.headers.get('origin')}/payment?order_id={order_id}`
    
    const payload = {
      order_id: orderId,
      order_amount: amount,
      order_currency: "INR",
      customer_details: {
        customer_id: customerId || "guest",
        customer_name: customerName || "Student",
        customer_phone: customerPhone || "9999999999",
      },
      order_meta: {
        return_url: returnUrl,
      },
    }

    console.log("Sending to Cashfree:", JSON.stringify(payload))

    const response = await fetch(CASHFREE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": APP_ID,
        "x-client-secret": SECRET_KEY,
        "x-api-version": "2023-08-01",
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error("Cashfree Error Response:", data)
      throw new Error(data.message || "Cashfree rejected the request")
    }

    // 6. Success
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) { // <--- THIS :any IS THE FIX
    console.error("Function Error:", error.message)
    return new Response(JSON.stringify({ error: error.message || "Unknown Error" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})