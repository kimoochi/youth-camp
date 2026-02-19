import 'dotenv/config'
import express from 'express'

const app = express()
app.use(express.json())

const PORT = Number(process.env.PORT || 8787)

function requireEnv(name) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required env var: ${name}`)
  return v
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/paymongo/gcash/checkout', async (req, res) => {
  try {
    const secretKey = requireEnv('PAYMONGO_SECRET_KEY')

    const { amountPhp, description, successUrl, failedUrl } = req.body || {}

    if (!Number.isFinite(amountPhp) || amountPhp <= 0) {
      return res.status(400).send('Invalid amountPhp')
    }
    if (!successUrl || !failedUrl) {
      return res.status(400).send('Missing successUrl/failedUrl')
    }

    // PayMongo expects amount in the smallest currency unit (centavos for PHP)
    const amount = Math.round(amountPhp * 100)
    const safeDescription = String(description || 'Youth Camp Registration')

    const apiRes = await fetch('https://api.paymongo.com/v1/sources', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
      },
      body: JSON.stringify({
        data: {
          attributes: {
            type: 'gcash',
            amount,
            currency: 'PHP',
            redirect: {
              success: successUrl,
              failed: failedUrl,
            },
            statement_descriptor: safeDescription.slice(0, 22),
          },
        },
      }),
    })

    const json = await apiRes.json().catch(() => null)

    if (!apiRes.ok) {
      const msg =
        json?.errors?.[0]?.detail ||
        json?.errors?.[0]?.code ||
        `PayMongo error (${apiRes.status})`
      return res.status(500).send(msg)
    }

    const sourceId = json?.data?.id
    const checkoutUrl = json?.data?.attributes?.redirect?.checkout_url

    if (!sourceId || !checkoutUrl) {
      return res.status(500).send('Unexpected PayMongo response')
    }

    return res.json({ sourceId, checkoutUrl })
  } catch (e) {
    return res.status(500).send(e?.message || 'Server error')
  }
})

app.listen(PORT, () => {
  console.log(`PayMongo server listening on :${PORT}`)
})

