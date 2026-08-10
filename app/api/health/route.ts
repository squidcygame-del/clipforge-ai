import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import OpenAI from 'openai'
import { authOptions } from '@/lib/auth'

/**
 * A one-page answer to "why is it not working?".
 *
 * The user has no terminal, so without this every failure is a black box. Open
 * /api/health in a browser and it says, in order, which environment variables
 * are missing, whether the OpenAI key is accepted, and whether the account has
 * any credit left. Those three cover nearly every failure we have hit.
 *
 * It never prints a secret — only whether one is present, and its length.
 */

type Check = { name: string; ok: boolean; detail: string }

const REQUIRED = [
  'DATABASE_URL',
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'OPENAI_API_KEY',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
]

export async function GET() {
  // Login required. This page reveals which secrets exist and spends a little
  // money on every load, so it must not be open to the world.
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return new NextResponse(
      '<!doctype html><meta charset="utf-8"><body style="background:#05070C;color:#e8eef7;' +
        'font:16px/1.6 sans-serif;padding:40px;text-align:center">' +
        '<p>Please <a href="/login" style="color:#38BDF8">log in</a> to view the health check.</p>',
      { status: 401, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  }

  const checks: Check[] = []

  // ---- 1. Environment variables ------------------------------------------
  for (const key of REQUIRED) {
    const value = process.env[key]
    checks.push({
      name: `env ${key}`,
      ok: Boolean(value),
      detail: value ? `set (${value.length} characters)` : 'MISSING — add it in Vercel, then redeploy',
    })
  }

  // A very common mistake: pasting the combined cloudinary:// string.
  if (process.env.CLOUDINARY_CLOUD_NAME?.includes('://')) {
    checks.push({
      name: 'CLOUDINARY_CLOUD_NAME format',
      ok: false,
      detail: 'This looks like a full cloudinary:// URL. It must be just the cloud name, e.g. fjgsb9jp',
    })
  }

  // ---- 2. Can we reach OpenAI, and is the key accepted? -------------------
  if (process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        timeout: 15_000,
        maxRetries: 0,
      })

      await openai.models.list()
      checks.push({ name: 'OpenAI key', ok: true, detail: 'accepted, and OpenAI is reachable' })

      // ---- 3. Is there any credit? ---------------------------------------
      // Listing models works even on an empty account, so we make the smallest
      // possible real request. It costs a fraction of a cent.
      try {
        await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 1,
        })
        checks.push({ name: 'OpenAI credit', ok: true, detail: 'account has credit — processing should work' })
      } catch (error: any) {
        const code = error?.code ?? error?.error?.code
        const isQuota = code === 'insufficient_quota' || error?.status === 429

        checks.push({
          name: 'OpenAI credit',
          ok: false,
          detail: isQuota
            ? 'NO CREDIT. Add a payment method and balance at platform.openai.com, Settings then Billing.'
            : `Request failed: ${String(error?.message || error).slice(0, 200)}`,
        })
      }
    } catch (error: any) {
      const status = error?.status
      checks.push({
        name: 'OpenAI key',
        ok: false,
        detail:
          status === 401
            ? 'REJECTED. The key is wrong, or was revoked. Create a new one and update OPENAI_API_KEY in Vercel.'
            : `Could not reach OpenAI: ${String(error?.message || error).slice(0, 200)}`,
      })
    }
  }

  // ---- 4. Can we reach Cloudinary? ----------------------------------------
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    try {
      const auth = Buffer.from(
        `${process.env.CLOUDINARY_API_KEY}:${process.env.CLOUDINARY_API_SECRET}`
      ).toString('base64')

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/resources/video?max_results=1`,
        { headers: { Authorization: `Basic ${auth}` }, cache: 'no-store' }
      )

      checks.push({
        name: 'Cloudinary account',
        ok: res.ok,
        detail: res.ok
          ? 'reachable, and the API key and secret are accepted'
          : res.status === 401
            ? 'REJECTED. CLOUDINARY_API_KEY or CLOUDINARY_API_SECRET is wrong.'
            : `Cloudinary replied HTTP ${res.status}`,
      })
    } catch (error: any) {
      checks.push({
        name: 'Cloudinary account',
        ok: false,
        detail: `Could not reach Cloudinary: ${String(error?.message || error).slice(0, 200)}`,
      })
    }
  }

  const failures = checks.filter((c) => !c.ok)
  const html = renderPage(checks, failures)

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderPage(checks: Check[], failures: Check[]): string {
  const rows = checks
    .map(
      (c) => `<tr>
        <td class="i">${c.ok ? '<span class="y">PASS</span>' : '<span class="n">FAIL</span>'}</td>
        <td class="k">${escapeHtml(c.name)}</td>
        <td class="d">${escapeHtml(c.detail)}</td>
      </tr>`
    )
    .join('')

  const summary = failures.length
    ? `<div class="bad"><strong>${failures.length} problem${failures.length > 1 ? 's' : ''} found.</strong>
         Fix the FAIL rows below, then redeploy in Vercel and reload this page.</div>`
    : `<div class="good"><strong>Everything checks out.</strong>
         If a video still fails, open Vercel then Logs and look for the line starting
         <code>OpenAI failure:</code> or <code>Process video error:</code>.</div>`

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ClipForge AI — health check</title>
<style>
  :root { color-scheme: dark }
  body { background:#05070C; color:#e8eef7; font:16px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;
         margin:0; padding:40px 20px }
  main { max-width:860px; margin:0 auto }
  h1 { color:#38BDF8; font-size:24px; margin:0 0 6px }
  p.sub { color:#8b97a8; margin:0 0 28px }
  .good,.bad { padding:16px 18px; border-radius:12px; margin-bottom:24px }
  .good { background:#0d2a1d; border:1px solid #1f7a4d }
  .bad  { background:#2a0f12; border:1px solid #7F1D1D }
  table { width:100%; border-collapse:collapse; background:#0F131C; border-radius:12px; overflow:hidden }
  td { padding:12px 14px; border-bottom:1px solid #161D2B; vertical-align:top }
  tr:last-child td { border-bottom:none }
  .i { width:64px } .k { width:230px; color:#cbd6e6; font-family:ui-monospace,monospace; font-size:13px }
  .d { color:#9fb0c6; font-size:14px }
  .y { color:#6EE7B7; font-weight:600; font-size:13px }
  .n { color:#F87171; font-weight:600; font-size:13px }
  code { background:#161D2B; padding:2px 6px; border-radius:4px; font-size:13px }
  footer { color:#5e6b7d; font-size:13px; margin-top:24px }
</style></head>
<body><main>
  <h1>ClipForge AI health check</h1>
  <p class="sub">Checks configuration and both outside services. No secret is ever shown.</p>
  ${summary}
  <table>${rows}</table>
  <footer>This page makes one tiny OpenAI request to test for credit. It costs a fraction of a cent.</footer>
</main></body></html>`
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30
