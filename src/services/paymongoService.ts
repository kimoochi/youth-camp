export type CreateGcashCheckoutRequest = {
  amountPhp: number
  description: string
  successUrl: string
  failedUrl: string
}

export type CreateGcashCheckoutResponse = {
  sourceId: string
  checkoutUrl: string
}

export async function createGcashCheckout(
  payload: CreateGcashCheckoutRequest
): Promise<CreateGcashCheckoutResponse> {
  const res = await fetch('/api/paymongo/gcash/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `PayMongo request failed: ${res.status}`)
  }

  return (await res.json()) as CreateGcashCheckoutResponse
}

