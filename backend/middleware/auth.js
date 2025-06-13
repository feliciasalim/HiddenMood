import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

const router = express.Router();

export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        console.log("No token provided");
        return res.sendStatus(401);
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.error("Token verification error:", err);
            return res.sendStatus(403);
        }

        console.log("Token verified successfully. User:", user);
        req.user = user;
        next();
    });
};

router.post("/register", (req, res) => {
  res.json({ message: "Register endpoint works!" });
});

router.post("/login", (req, res) => {
  res.json({ message: "Login endpoint works!" });
});

export default router;