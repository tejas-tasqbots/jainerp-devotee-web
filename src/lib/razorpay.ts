// Razorpay Standard Checkout helper — loads checkout.js on demand and opens the
// payment modal. The key secret NEVER reaches the browser; only the public
// key_id (returned by the API, or VITE_RAZORPAY_KEY_ID) is used here.

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'

let scriptPromise: Promise<boolean> | null = null

export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window !== 'undefined' && (window as any).Razorpay) return Promise.resolve(true)
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise<boolean>((resolve) => {
    const s = document.createElement('script')
    s.src = CHECKOUT_SRC
    s.onload = () => resolve(true)
    s.onerror = () => { scriptPromise = null; resolve(false) }
    document.body.appendChild(s)
  })
  return scriptPromise
}

export interface CheckoutOrder {
  razorpay_order_id: string
  amount_paise: number
  currency: string
  key_id: string
  notes?: Record<string, string>
}

export interface CheckoutCallback {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

export interface OpenCheckoutOptions {
  order: CheckoutOrder
  name: string
  description?: string
  prefill?: { name?: string; email?: string; contact?: string }
  onSuccess: (r: CheckoutCallback) => void
  onFailure: (message: string) => void
  onDismiss: () => void
}

export async function openRazorpayCheckout(opts: OpenCheckoutOptions): Promise<void> {
  const loaded = await loadRazorpayScript()
  if (!loaded) { opts.onFailure('Could not load the payment gateway. Check your connection.'); return }

  const keyId = opts.order.key_id || (import.meta.env.VITE_RAZORPAY_KEY_ID as string | undefined)
  if (!keyId) { opts.onFailure('Payment gateway is not configured.'); return }

  const rzp = new (window as any).Razorpay({
    key: keyId,
    order_id: opts.order.razorpay_order_id,
    amount: opts.order.amount_paise,
    currency: opts.order.currency,
    name: opts.name,
    description: opts.description,
    notes: opts.order.notes,
    prefill: opts.prefill,
    theme: { color: '#dc2626' },
    handler: (resp: any) => {
      opts.onSuccess({
        razorpay_order_id: resp.razorpay_order_id,
        razorpay_payment_id: resp.razorpay_payment_id,
        razorpay_signature: resp.razorpay_signature,
      })
    },
    modal: { ondismiss: () => opts.onDismiss() },
  })

  rzp.on('payment.failed', (resp: any) => {
    opts.onFailure(resp?.error?.description || 'Payment failed. Please try again.')
  })

  rzp.open()
}
