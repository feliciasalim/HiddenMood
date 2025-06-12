import express from "express";
import bcrypt from "bcrypt";
import multer from "multer";
import { supabase } from "../supabaseClient.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    console.log("File filter check:", file.mimetype);
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

router.get("/", authenticateToken, async (req, res) => {
  console.log("GET /api/profile called with user:", req.user.user_id);
  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("user_id, name, email, img")
      .eq("user_id", req.user.user_id)
      .single();

    if (error || !user) {
      console.error("User fetch error:", error?.message || "No user found");
      return res.send("User not found");
    }

    res.json({
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        img: user.img || null,
      },
    });
  } catch (error) {
    console.error("Error fetching profile:", {
      message: error.message,
      stack: error.stack
    });
    res.send("Failed to fetch profile");
  }
});

router.put("/", authenticateToken, upload.single("profileImage"), async (req, res) => {
  console.log("PUT /api/profile called for user:", req.user.user_id);
  try {
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("password, img")
      .eq("user_id", req.user.user_id)
      .single();

    if (userError || !user) {
      console.error("User fetch error:", userError?.message || "No user found");
      return res.send("User not found");
    }

    const updates = {};

    if (req.body.name) {
      updates.name = req.body.name;
    }

    if (req.body.newPassword && req.body.currentPassword) {
      const isValidPassword = await bcrypt.compare(req.body.currentPassword, user.password);
      if (!isValidPassword) {
        return res.send("Invalid current password");
      }

      const passwordValidation = validatePassword(req.body.newPassword);
      if (!passwordValidation.isValid) {
        return res.send(passwordValidation.message);
      }

      const isSamePassword = await bcrypt.compare(req.body.newPassword, user.password);
      if (isSamePassword) {
        return res.send("New password cannot be the same as the current password");
      }

      const passwordHash = await bcrypt.hash(req.body.newPassword, 12);
      updates.password = passwordHash;
    }

    if (req.file) {
      try {
        if (req.file.size > 5 * 1024 * 1024) {
          return res.send("Image size too large (max 5MB)");
        }

        const fileName = `profile-${req.user.user_id}-${Date.now()}.${req.file.mimetype.split("/")[1]}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("profile-img")
          .upload(fileName, req.file.buffer, {
            contentType: req.file.mimetype,
            upsert: true,
          });

        if (uploadError) {
          console.error("Image upload error:", uploadError.message);
          return res.send("Failed to upload image");
        }

        const { data: urlData } = supabase.storage
          .from("profile-img")
          .getPublicUrl(fileName);

        updates.img = urlData.publicUrl;

        if (user.img && user.img.includes('profile-img/')) {
          try {
            const oldFileName = user.img.split('/').pop();
            if (oldFileName) {
              await supabase.storage.from("profile-img").remove([oldFileName]);
            }
          } catch (err) {
            console.warn("Failed to clean up old image:", err.message);
          }
        }

        console.log(`Image uploaded: ${req.file.mimetype}, size: ${req.file.size} bytes, URL: ${updates.img}`);
      } catch (error) {
        console.error("Image processing error:", error.message);
        return res.send("Failed to process image");
      }
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update(updates)
      .eq("user_id", req.user.user_id)
      .select("user_id, name, email, img")
      .single();

    if (updateError) {
      console.error("Update error:", updateError.message);
      return res.send("Failed to update profile");
    }

    res.json({
      message: "User profile updated successfully",
      user: {
        user_id: updatedUser.user_id,
        name: updatedUser.name,
        email: updatedUser.email,
        img: updatedUser.img || null,
      },
    });
  } catch (err) {
    console.error("Update profile error:", {
      message: err.message,
      stack: err.stack
    });
    res.send("Failed to update profile");
  }
});

router.delete("/", authenticateToken, async (req, res) => {
  console.log("=== DELETE /api/profile called for user:", req.user.user_id);
  try {
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("user_id, img")
      .eq("user_id", req.user.user_id)
      .single();

    if (userError || !user) {
      console.error("User fetch error:", {
        message: userError?.message || "No user found",
        details: userError?.details,
        code: userError?.code,
        hint: userError?.hint
      });
      return res.send("User not found");
    }

    console.log("User found:", user.user_id);

    const { data: historyData, error: historyError } = await supabase
      .from("history")
      .delete()
      .eq("user_id", req.user.user_id)
      .select("history_id");

    if (historyError) {
      console.error("History delete error:", {
        message: historyError.message,
        details: historyError.details,
        code: historyError.code,
        hint: historyError.hint
      });
      return res.send("Failed to delete history data");
    }

    console.log("History records deleted:", historyData?.length || 0);

    if (user.img && user.img.includes('profile-img/')) {
      try {
        const fileName = user.img.split('/').pop();
        if (fileName) {
          const { error: storageError } = await supabase.storage
            .from("profile-img")
            .remove([fileName]);

          if (storageError) {
            console.warn("Storage delete error:", {
              message: storageError.message,
              details: storageError.details,
              code: storageError.code
            });
          } else {
            console.log("Profile image deleted from storage:", fileName);
          }
        }
      } catch (storageError) {
        console.warn("Storage cleanup error:", {
          message: storageError.message,
          stack: storageError.stack
        });
      }
    }

    const { data: userData, error: userDeleteError } = await supabase
      .from("users")
      .delete()
      .eq("user_id", req.user.user_id)
      .select("user_id")
      .single();

    if (userDeleteError) {
      console.error("User delete error:", {
        message: userDeleteError.message,
        details: userDeleteError.details,
        code: userDeleteError.code,
        hint: userDeleteError.hint
      });
      return res.send("Failed to delete user account");
    }

    if (!userData) {
      console.warn("No user found with user_id:", req.user.user_id);
      return res.send("User account not found");
    }

    console.log("Account deleted successfully for user:", req.user.user_id);
    return res.json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Delete account error:", {
      message: error.message,
      details: error.details,
      code: error.code,
      hint: error.hint,
      stack: error.stack
    });
    return res.send("Failed to delete account");
  }
});

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

router.use((req, res) => {
  res.send("Route not found");
});

export default router;