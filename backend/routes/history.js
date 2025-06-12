import express from "express";
import { supabase } from "../supabaseClient.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Get user's history
router.get("/history", authenticateToken, async (req, res) => {
  try {
    const { data: history, error } = await supabase
      .from('history')
      .select('*')
      .eq('user_id', req.user.user_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(history);
  } catch (error) {
    console.error("Error fetching history:", error);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// Get single history item by ID
router.get("/history/:historyId", authenticateToken, async (req, res) => {
  try {
    const { historyId } = req.params;
    console.log(`Fetching history item: historyId=${historyId}, userId=${req.user.user_id}`);

    // Validate historyId format (assuming it's a number or UUID)
    if (!historyId || historyId === 'undefined' || historyId === 'null') {
      return res.status(400).json({ error: "Invalid history ID" });
    }

    const { data: historyItem, error } = await supabase
      .from('history')
      .select(`
        history_id,
        user_id,
        stress_level,
        stress_percent,
        emotion,
        text,
        feedback,
        video_link,
        created_at
      `)
      .eq('history_id', historyId)
      .eq('user_id', req.user.user_id)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: "History item not found" });
      }
      throw error;
    }

    console.log('History item found:', historyItem);
    res.json(historyItem);
  } catch (error) {
    console.error("Error fetching history item:", error.message, error.stack);
    res.status(500).json({ error: "Failed to fetch history item" });
  }
});

export default router;
