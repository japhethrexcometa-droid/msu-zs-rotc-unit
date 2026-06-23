// ── Gmail SMTP via raw TCP (base64-encoded SMTP conversation) ──
// Includes exponential backoff and retry logic for reliability.

export async function sendEmail(
  toEmail: string, 
  type: string, 
  firstName: string, 
  idNumber?: string | null, 
  rejectionReason?: string
): Promise<{ sent: boolean }> {
  return executeWithRetry(() => attemptSendEmail(toEmail, type, firstName, idNumber, rejectionReason))
}

async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: any
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      console.warn(`Email attempt ${attempt + 1} failed: ${error.message}`)
      
      if (attempt < maxRetries - 1) {
        // Exponential backoff: 1s, 2s, 4s...
        const delay = baseDelayMs * Math.pow(2, attempt)
        console.log(`Retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw new Error(`Failed after ${maxRetries} attempts. Last error: ${lastError.message}`)
}

async function attemptSendEmail(
  toEmail: string, 
  type: string, 
  firstName: string, 
  idNumber?: string | null, 
  rejectionReason?: string
): Promise<{ sent: boolean }> {
  const smtpEmail = Deno.env.get('SMTP_EMAIL')
  const smtpPassword = Deno.env.get('SMTP_PASSWORD')
  
  if (!smtpEmail || !smtpPassword) {
    console.warn("SMTP credentials not configured — skipping email")
    return { sent: false }
  }

  let subject = ''
  let htmlContent = ''

  if (type === 'approve') {
    subject = 'ROTC Enrollment Approved - MSU-ZS ROTC Unit'
    htmlContent = `<div style="font-family:sans-serif;color:#333;line-height:1.5;padding:20px;"><h2>Congratulations, ${firstName}!</h2><p>Your ROTC enrollment request has been <strong>approved</strong>.</p><div style="background-color:#f4f4f4;padding:15px;border-radius:5px;margin:20px 0;"><p style="margin-top:0;"><strong>Your Login Credentials:</strong></p><ul style="margin-bottom:0;"><li><strong>ID Number:</strong> ${idNumber}</li><li><strong>Temporary Password:</strong> ${idNumber}</li></ul></div><p>Please log in to the ROTC portal and <strong>change your password immediately</strong> after your first login.</p><p>Welcome to the MSU-ZS ROTC Unit!</p></div>`
  } else {
    subject = 'ROTC Enrollment Update - MSU-ZS ROTC Unit'
    htmlContent = `<div style="font-family:sans-serif;color:#333;line-height:1.5;padding:20px;"><h2>Dear ${firstName},</h2><p>We regret to inform you that your ROTC enrollment request has been <strong>rejected</strong>.</p><div style="background-color:#fff0f0;border-left:4px solid #ff4444;padding:15px;margin:20px 0;"><p style="margin:0;"><strong>Reason:</strong> ${rejectionReason || 'No specific reason provided.'}</p></div><p>Please <strong>go to the ROTC office</strong> for more information and assistance.</p><p>— MSU-ZS ROTC Unit</p></div>`
  }

  // Use raw SMTP over TLS (Deno.connectTls to port 465)
  const conn = await Deno.connectTls({ hostname: "smtp.gmail.com", port: 465 })
  
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  async function readResponse(): Promise<string> {
    const buf = new Uint8Array(4096)
    const n = await conn.read(buf)
    if (n === null) throw new Error("SMTP connection closed")
    return decoder.decode(buf.subarray(0, n))
  }

  async function sendCommand(cmd: string): Promise<string> {
    await conn.write(encoder.encode(cmd + "\r\n"))
    return await readResponse()
  }

  try {
    // SMTP conversation
    const greeting = await readResponse()
    if (!greeting.startsWith('220')) throw new Error("SMTP greeting failed: " + greeting)

    let resp = await sendCommand(`EHLO rotc-system`)
    if (!resp.startsWith('250')) throw new Error("EHLO failed: " + resp)

    // AUTH LOGIN
    resp = await sendCommand('AUTH LOGIN')
    if (!resp.startsWith('334')) throw new Error("AUTH failed: " + resp)

    resp = await sendCommand(btoa(smtpEmail))
    if (!resp.startsWith('334')) throw new Error("Username failed: " + resp)

    resp = await sendCommand(btoa(smtpPassword))
    if (!resp.startsWith('235')) throw new Error("Password failed: " + resp)

    // MAIL FROM / RCPT TO
    resp = await sendCommand(`MAIL FROM:<${smtpEmail}>`)
    if (!resp.startsWith('250')) throw new Error("MAIL FROM failed: " + resp)

    resp = await sendCommand(`RCPT TO:<${toEmail}>`)
    if (!resp.startsWith('250')) throw new Error("RCPT TO failed: " + resp)

    // DATA
    resp = await sendCommand('DATA')
    if (!resp.startsWith('354')) throw new Error("DATA failed: " + resp)

    const boundary = "----=_Part_" + crypto.randomUUID().replace(/-/g, '')
    const message = [
      `From: MSU-ZS ROTC Unit <${smtpEmail}>`,
      `To: ${toEmail}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      ``,
      `${subject}`,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      ``,
      htmlContent,
      ``,
      `--${boundary}--`,
      `.`
    ].join('\r\n')

    resp = await sendCommand(message)
    if (!resp.startsWith('250')) throw new Error("Message send failed: " + resp)

    await sendCommand('QUIT')
  } finally {
    conn.close()
  }

  console.log(`Email sent successfully to ${toEmail}`)
  return { sent: true }
}
