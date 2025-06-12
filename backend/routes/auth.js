import express from "express";
import bcrypt from "bcrypt";
import multer from "multer";
import { supabase } from "../supabaseClient.js";
import { authenticateToken } from "../middleware/auth.js";
import { generateToken, generateId, validateEmail, validatePassword, validateName } from "../utils/helpers.js";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        console.log("File filter check:", file.mimetype);
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

router.post("/register", async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.send("Name, email, and password are required");
    }

    if (!validateEmail(email)) {
        return res.send("Please enter a valid email address");
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
        return res.send(passwordValidation.message);
    }

    if (validateName && !validateName(name)) {
        return res.send("Please enter a valid name");
    }

    try {
        const { data: existingUser, error: userCheckError } = await supabase
            .from('users')
            .select('email')
            .eq('email', email)
            .single();

        if (userCheckError && userCheckError.code !== 'PGRST116') {
            console.error("User check error:", userCheckError);
            return res.send("Failed to check existing user");
        }

        if (existingUser) {
            return res.send("Email is already registered");
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const user_id = generateId();

        const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert({
                user_id,
                name,
                email,
                password: passwordHash
            })
            .select('user_id, name, email')
            .single();

        if (insertError) {
            console.error("Insert error:", insertError);
            return res.send("Failed to register user");
        }

        const token = generateToken(newUser);

        res.status(201).json({
            message: "User registered successfully",
            user: newUser,
            token
        });
    } catch (error) {
        console.error("Registration error:", error.message);
        res.send("Internal server error during registration");
    }
});

router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.send("Email and password are required");
    }

    try {
        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('user_id, name, email, password')
            .eq('email', email)
            .single();

        if (fetchError || !user) {
            return res.send("Invalid email or password");
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.send("Invalid email or password");
        }

        const token = generateToken(user);
        const { password: _, ...userWithoutPassword } = user;

        res.json({
            message: "Login successful",
            user: userWithoutPassword,
            token
        });
    } catch (error) {
        console.error("Login error:", error.message);
        res.send("Internal server error during login");
    }
});

router.use((req, res) => {
    res.send("Route not found");
});

export default router;