import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendAuditNotification(
  auditId: string,
  jobName: string | undefined,
  status: 'complete' | 'error',
  score?: number,
  supplementTotal?: number
) {
  if (!process.env.NOTIFY_EMAIL) return

  const subject =
    status === 'complete'
      ? `✅ ClaimForge Audit Complete — ${jobName || 'Unnamed Job'} (Score: ${score}/100)`
      : `❌ ClaimForge Audit Failed — ${jobName || 'Unnamed Job'}`

  const auditUrl = `https://claims.patriotwms.com/audit/${auditId}`

  const html =
    status === 'complete'
      ? `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #f59e0b;">✅ Audit Complete</h2>
      <p><strong>Job:</strong> ${jobName || 'Unnamed Job'}</p>
      <p><strong>Score:</strong> <span style="font-size: 24px; color: ${score! >= 80 ? '#10b981' : score! >= 60 ? '#f59e0b' : '#ef4444'}">${score}/100</span></p>
      ${supplementTotal ? `<p><strong>Supplement Opportunity:</strong> $${supplementTotal.toLocaleString()}</p>` : ''}
      <a href="${auditUrl}" style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #f59e0b; color: black; text-decoration: none; border-radius: 8px; font-weight: bold;">View Full Audit</a>
    </div>
  `
      : `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #ef4444;">❌ Audit Failed</h2>
      <p><strong>Job:</strong> ${jobName || 'Unnamed Job'}</p>
      <p>The audit encountered an error. Please re-upload the file or try again.</p>
      <a href="${auditUrl}" style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #f59e0b; color: black; text-decoration: none; border-radius: 8px; font-weight: bold;">View Details</a>
    </div>
  `

  try {
    await resend.emails.send({
      from: 'ClaimForge <dispatch@patriotwms.com>',
      to: [process.env.NOTIFY_EMAIL],
      subject,
      html,
    })
  } catch (e) {
    console.error('Notification email failed:', e)
    // Never throw — notifications are best-effort
  }
}
