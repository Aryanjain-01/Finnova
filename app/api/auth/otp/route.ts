import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy");

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    // Generate a 6-digit random code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Save OTP to database
    await prisma.oTP.create({
      data: {
        email: email.toLowerCase(),
        code,
        expiresAt,
      },
    });

    // If RESEND_API_KEY is not set, log to console for development
    if (!process.env.RESEND_API_KEY) {
      console.log(`\n========================================`);
      console.log(`🔑 MOCK EMAIL SENT:`);
      console.log(`To: ${email}`);
      console.log(`Your login code is: ${code}`);
      console.log(`========================================\n`);
    } else {
      // Send the email via Resend
      const { error } = await resend.emails.send({
        from: "Finnova <noreply@finnova.space>",
        to: [email],
        subject: "Your Finnova Login Code",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Your Login Code</h2>
            <p>Welcome to Finnova! Use the 6-digit code below to log in or create your account.</p>
            <div style="background-color: #f4f4f5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #000;">${code}</span>
            </div>
            <p>This code will expire in 10 minutes.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this code, you can safely ignore this email.</p>
          </div>
        `,
      });

      if (error) {
        console.error("Failed to send email via Resend:", error);
        return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("OTP generation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
