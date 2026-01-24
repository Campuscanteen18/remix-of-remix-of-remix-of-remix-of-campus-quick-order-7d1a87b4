const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { orderId, amount, customerName, customerPhone, customerId } = await req.json()

    const APP_ID = Deno.env.get('CASHFREE_APP_ID')
    const SECRET_KEY = Deno.env.get('CASHFREE_SECRET_KEY')
    const CASHFREE_URL = "https://api.cashfree.com/pg/orders"

    if (!APP_ID || !SECRET_KEY) {
      throw new Error("Missing Cashfree Keys in Supabase Secrets")
    }

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

    // 1. Try to Create the Order
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

    // 2. HANDLE "ORDER ALREADY EXISTS" (The Retry Fix) 🛠️
    if (!response.ok) {
      // Check if error is specifically "Order already exists" (Status 409)
      if (response.status === 409 || data.message?.toLowerCase().includes("already exists")) {
        console.log(`Order ${orderId} already exists. Fetching existing session...`)

        // A. Fetch the existing order details from Cashfree
        const getOrderResponse = await fetch(`${CASHFREE_URL}/${orderId}`, {
          method: "GET",
          headers: {
            "x-client-id": APP_ID,
            "x-client-secret": SECRET_KEY,
            "x-api-version": "2023-08-01",
          }
        })

        const existingOrderData = await getOrderResponse.json()

        // B. Check if we can still pay for it
        if (existingOrderData.payment_session_id) {
           console.log("Recovered Session ID:", existingOrderData.payment_session_id)
           
           // SUCCESS! Return the existing session to the frontend
           return new Response(JSON.stringify(existingOrderData), {
             headers: { ...corsHeaders, 'Content-Type': 'application/json' },
             status: 200,
           })
        } else {
           // If order is EXPIRED or PAID, we can't retry.
           throw new Error(`Order status is ${existingOrderData.order_status}. Cannot retry.`)
        }
      }

      // If it's some other error, throw it normally
      console.error("Cashfree Error Response:", data)
      throw new Error(data.message || "Cashfree rejected the request")
    }

    // 3. Success (New Order Created)
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Error"
    console.error("Function Error:", message)
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})