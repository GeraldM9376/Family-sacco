import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendOtp(email: string, code: string) {
  await resend.emails.send({
    from: "Sacco <onboarding@resend.dev>",
    to: email,
    subject: "Your password reset code",
    html: `
      <div style="font-family:sans-serif;padding:24px;max-width:500px;margin:auto">
        <h2 style="color:#4338ca">Password Reset</h2>
        <p>Your reset code is:</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:10px;color:#4338ca;padding:16px;background:#eef2ff;border-radius:8px;text-align:center">
          ${code}
        </div>
        <p style="color:#666;margin-top:16px">This code expires in 10 minutes.</p>
      </div>
    `,
  });
}