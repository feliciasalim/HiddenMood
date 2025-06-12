import express from "express";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import { supabase } from "../supabaseClient.js";
import { rateLimit } from "express-rate-limit";

const router = express.Router();

// Rate limit to prevent abuse (100 requests per 15 minutes per IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests, please try again later.",
});
router.use(limiter);

// SMTP configuration (replace with your credentials)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Verify SMTP configuration before use
transporter.verify((error, success) => {
  if (error) {
    console.error("SMTP configuration error:", error.message, error.stack);
  } else {
    console.log("SMTP server is ready to send emails");
  }
});

// Generate a 6-digit code
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Validate password (same as profile.js)
function validatePassword(password) {
  const minLength = 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (password.length < minLength || !(hasLetter && hasNumber && hasSymbol)) {
    return {
      isValid: false,
      message: "Password must be at least 8 characters long and include a mix of letters, numbers, and symbols.",
    };
  }
  return { isValid: true, message: "" };
}

// POST /api/forgot-password/request - Send verification code
router.post("/request", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("user_id, email")
      .eq("email", email)
      .single();

    if (userError || !user) {
      console.error("User fetch error:", userError?.message || "No user found");
      return res.status(404).json({ error: "Email not found" });
    }

    // Generate code and set expiration
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Store code in reset_codes table
    const { error: codeError } = await supabase
      .from("reset_codes")
      .insert({
        email,
        code,
        expires_at: expiresAt,
      });

    if (codeError) {
      console.error("Error storing reset code:", codeError.message, codeError.details, codeError.code);
      return res.status(500).json({
        error: "Failed to send code",
        details: codeError.message || "Unknown database error",
      });
    }

    // Send email
    const mailOptions = {
      from: process.env.SMTP_EMAIL,
      to: email,
      subject: "Hidden Mood Password Reset Code",
      text: `Your verification code is: ${code}. It expires in 10 minutes.`,
      html: `<p>Your verification code is: <strong>${code}</strong>. It expires in 10 minutes.</p>`,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log("Verification code sent to:", email);
      return res.status(200).json({ message: "Verification code sent" });
    } catch (mailError) {
      console.error("Email sending failed:", mailError.message, mailError.stack);
      return res.status(500).json({
        error: "Failed to send code",
        details: mailError.message || "Email service error",
      });
    }
  } catch (error) {
    console.error("Error in forgot password request:", error.message, error.stack);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message || "Unexpected server error",
    });
  }
});

// POST /api/forgot-password/verify - Verify code
router.post("/verify", async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: "Email and code are required" });
  }

  try {
    // Check if code is valid
    const { data: resetCode, error: codeError } = await supabase
      .from("reset_codes")
      .select("id, code, expires_at, used")
      .eq("email", email)
      .eq("code", code)
      .eq("used", false)
      .gte("expires_at", new Date().toISOString())
      .single();

    if (codeError || !resetCode) {
      console.error("Code verification error:", codeError?.message || "Invalid or expired code");
      return res.status(400).json({ error: "Invalid or expired code" });
    }

    // Mark code as used
    const { error: updateError } = await supabase
      .from("reset_codes")
      .update({ used: true })
      .eq("id", resetCode.id);

    if (updateError) {
      console.error("Error marking code as used:", updateError.message);
      return res.status(500).json({ error: "Failed to verify code" });
    }

    console.log("Code verified for email:", email);
    return res.status(200).json({ message: "Code verified" });
  } catch (error) {
    console.error("Error in code verification:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/forgot-password/reset - Reset password
router.post("/reset", async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    return res.status(400).json({ error: "Email and new password are required" });
  }

  try {
    // Validate password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ error: passwordValidation.message });
    }

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("user_id, password")
      .eq("email", email)
      .single();

    if (userError || !user) {
      console.error("User fetch error:", userError?.message || "No user found");
      return res.status(404).json({ error: "User not found" });
    }

    // Check if new password is different
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({ error: "New password cannot be the same as the current password" });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update password
    const { error: updateError } = await supabase
      .from("users")
      .update({ password: passwordHash })
      .eq("user_id", user.user_id);

    if (updateError) {
      console.error("Error updating password:", updateError.message);
      return res.status(500).json({ error: "Failed to reset password" });
    }

    console.log("Password reset for email:", email);
    return res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Error in password reset:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;