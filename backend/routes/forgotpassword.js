import express from "express";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import { supabase } from "../supabaseClient.js";
import { rateLimit } from "express-rate-limit";

const router = express.Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests, please try again later.",
});
router.use(limiter);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error("SMTP configuration error:", error.message, error.stack);
  } else {
    console.log("SMTP server is ready to send emails");
  }
});

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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

router.post("/request", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.send("Email is required");
  }

  try {
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("user_id, email")
      .eq("email", email)
      .single();

    if (userError || !user) {
      console.error("User fetch error:", userError?.message || "No user found");
      return res.send("Email not found");
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: codeError } = await supabase
      .from("reset_codes")
      .insert({
        email,
        code,
        expires_at: expiresAt,
      });

    if (codeError) {
      console.error("Error storing reset code:", codeError.message, codeError.details, codeError.code);
      return res.send("Failed to send code");
    }

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
      return res.json({ message: "Verification code sent" });
    } catch (mailError) {
      console.error("Email sending failed:", mailError.message, mailError.stack);
      return res.send("Failed to send code");
    }
  } catch (error) {
    console.error("Error in forgot password request:", error.message, error.stack);
    return res.send("Internal server error");
  }
});

router.post("/verify", async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.send("Email and code are required");
  }

  try {
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
      return res.send("Invalid or expired code");
    }

    const { error: updateError } = await supabase
      .from("reset_codes")
      .update({ used: true })
      .eq("id", resetCode.id);

    if (updateError) {
      console.error("Error marking code as used:", updateError.message);
      return res.send("Failed to verify code");
    }

    console.log("Code verified for email:", email);
    return res.json({ message: "Code verified" });
  } catch (error) {
    console.error("Error in code verification:", error.message);
    return res.send("Internal server error");
  }
});

router.post("/reset", async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    return res.send("Email and new password are required");
  }

  try {
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.send(passwordValidation.message);
    }

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("user_id, password")
      .eq("email", email)
      .single();

    if (userError || !user) {
      console.error("User fetch error:", userError?.message || "No user found");
      return res.send("User not found");
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.send("New password cannot be the same as the current password");
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    const { error: updateError } = await supabase
      .from("users")
      .update({ password: passwordHash })
      .eq("user_id", user.user_id);

    if (updateError) {
      console.error("Error updating password:", updateError.message);
      return res.send("Failed to reset password");
    }

    console.log("Password reset for email:", email);
    return res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Error in password reset:", error.message);
    return res.send("Internal server error");
  }
});

router.use((req, res) => {
  res.send("Route not found");
});

export default router;