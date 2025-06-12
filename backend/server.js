import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import profileRoutes from "./routes/profile.js";
import authRoutes from "./routes/auth.js";
import curhatRoutes from "./routes/curhat.js";
import historyRoutes from "./routes/history.js";
import dashboardRoutes from "./routes/dashboard.js";
import feedbackRoutes from "./routes/feedback.js";
import articlesRoutes from "./routes/articles.js";
import historyDetailRouter from "./routes/historydetail.js";
import forgotPasswordRouter from "./routes/forgotpassword.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors({
  origin: 'https://hiddenmood.netlify.app',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/presenters', express.static(path.join(__dirname, 'presenters')));
app.use('/views', express.static('views'));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api", curhatRoutes);
app.use("/api", historyRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api", feedbackRoutes);
app.use("/api", articlesRoutes);
app.use("/api", historyDetailRouter);
app.use("/api/forgot-password", forgotPasswordRouter); // Moved here

// Legacy route for debugging
app.get("/", (req, res) => {
  res.json({ message: "Hidden Mood API is running" });
});

app.listen(PORT, () => {
  console.log(`Backend server is running`);
});