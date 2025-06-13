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

// Replace your existing PUT route with this fixed version
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
      return res.status(404).json({ error: "User not found" });
    }

    const updates = {};

    if (req.body.name) {
      updates.name = req.body.name;
    }

    if (req.body.newPassword && req.body.currentPassword) {
      const isValidPassword = await bcrypt.compare(req.body.currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ error: "Invalid current password" });
      }

      const passwordValidation = validatePassword(req.body.newPassword);
      if (!passwordValidation.isValid) {
        return res.status(400).json({ error: passwordValidation.message });
      }

      const isSamePassword = await bcrypt.compare(req.body.newPassword, user.password);
      if (isSamePassword) {
        return res.status(400).json({ error: "New password cannot be the same as the current password" });
      }

      const passwordHash = await bcrypt.hash(req.body.newPassword, 12);
      updates.password = passwordHash;
    }

    if (req.file) {
      try {
        if (req.file.size > 5 * 1024 * 1024) {
          return res.status(400).json({ error: "Image size too large (max 5MB)" });
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
          return res.status(500).json({ error: "Failed to upload image", details: uploadError.message });
        }

        const { data: urlData } = supabase.storage
          .from("profile-img")
          .getPublicUrl(fileName);

        updates.img = urlData.publicUrl;

        // Clean up old image
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
        return res.status(500).json({ error: "Failed to process image", details: error.message });
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
      return res.status(500).json({ error: "Failed to update profile", details: updateError.message });
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
    res.status(500).json({ error: "Failed to update profile", details: err.message });
  }
});

// Also fix the GET and DELETE routes
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
      return res.status(404).json({ error: "User not found" });
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
    res.status(500).json({ error: "Failed to fetch profile" });
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
      console.error("User fetch error:", userError?.message || "No user found");
      return res.status(404).json({ error: "User not found" });
    }

    // Delete history records
    const { error: historyError } = await supabase
      .from("history")
      .delete()
      .eq("user_id", req.user.user_id);

    if (historyError) {
      console.error("History delete error:", historyError);
      return res.status(500).json({ error: "Failed to delete history data" });
    }

    // Delete profile image from storage
    if (user.img && user.img.includes('profile-img/')) {
      try {
        const fileName = user.img.split('/').pop();
        if (fileName) {
          await supabase.storage.from("profile-img").remove([fileName]);
        }
      } catch (storageError) {
        console.warn("Storage cleanup error:", storageError);
      }
    }

    // Delete user account
    const { error: userDeleteError } = await supabase
      .from("users")
      .delete()
      .eq("user_id", req.user.user_id);

    if (userDeleteError) {
      console.error("User delete error:", userDeleteError);
      return res.status(500).json({ error: "Failed to delete user account" });
    }

    console.log("Account deleted successfully for user:", req.user.user_id);
    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Delete account error:", error);
    res.status(500).json({ error: "Failed to delete account" });
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

// Add this middleware after your routes to handle multer errors
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }
    return res.status(400).json({ error: error.message });
  }
  
  if (error.message === 'Only image files are allowed') {
    return res.status(400).json({ error: 'Only image files are allowed' });
  }
  
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

export default router;