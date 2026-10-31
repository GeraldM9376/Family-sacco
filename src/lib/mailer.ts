import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendOtp(email: string, code: string) {
  await resend.emails.send({
    from: "MAWEGA SACCO <onboarding@resend.dev>",
    to: email,
    subject: "Your Password Reset Code",
    html: `
      <div style="font-family:sans-serif;padding:24px;max-width:500px;margin:auto">
        <h2 style="color:#4338ca">Password Reset</h2>
        <p>Your reset code is:</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:10px;color:#4338ca;padding:16px;background:#eef2ff;border-radius:8px;text-align:center">
          ${code}
        </div>
        <p style="color:#666;margin-top:16px">This code expires in 5 minutes.</p>
      </div>
    `,
  });
}

export async function sendWelcomeEmail(email: string, name: string, password: string) {
  await resend.emails.send({
    from: "MAWEGA SACCO <onboarding@resend.dev>",
    to: email,
    subject: "Welcome to MAWEGA SACCO - Your Login Details",
    html: `
      <div style="font-family:sans-serif;padding:24px;max-width:500px;margin:auto;border:1px solid #e5e7eb;border-radius:12px">
        <h2 style="color:#4338ca">Welcome to MAWEGA SACCO!</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>Your account has been created successfully. Here is the password you registered with:</p>
        <div style="padding:16px;background:#f3f4f6;border-radius:8px;margin:16px 0;text-align:center;">
          <p style="margin:0;font-size:14px;color:#6b7280">Your Password</p>
          <p style="margin:8px 0 0 0;font-size:24px;font-weight:bold;color:#4338ca;">${password}</p>
        </div>
        <p>You can now log in using your ID Number and this password.</p>
      </div>
    `,
  });
}