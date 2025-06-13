import express from "express";
import { supabase } from "../supabaseClient.js";
import { generateId } from "../utils/helpers.js";

const router = express.Router();

// Get all feedback (using history table for now)
router.get("/feedback", async (req, res) => {
  try {
    const { data: history, error } = await supabase
      .from('history')
      .select('history_id, text, feedback, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform to feedback format
    const feedback = history.map(h => ({
      id: h.history_id,
      user_name: 'Anonymous', // Since we don't have user name in history
      text: h.text,
      analysis_result: { feedback: h.feedback },
      created_at: h.created_at
    }));

    res.json(feedback);
  } catch (error) {
    console.error("Error fetching feedback:", error);
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
});

// Create feedback (save as history entry)
router.post("/feedback", async (req, res) => {
  const { user_name, text, analysis_result } = req.body;

  if (!user_name || !text) {
    return res.status(400).json({ error: "User name and text are required" });
  }

  try {
    // Generate temporary user_id for feedback
    const temp_user_id = 'feedback_' + generateId();
    const history_id = generateId();

    const { data: historyEntry, error } = await supabase
      .from('history')
      .insert({
        history_id,
        user_id: temp_user_id,
        stress_level: 'unknown',
        stress_percent: 0,
        emotion: 'neutral',
        text: text.trim(),
        feedback: analysis_result?.feedback || 'Thank you for your feedback',
        video_link: '',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      id: historyEntry.history_id,
      user_name: user_name.trim(),
      text: historyEntry.text,
      analysis_result,
      created_at: historyEntry.created_at
    });
  } catch (error) {
    console.error("Error creating feedback:", error);
    res.status(500).json({ error: "Failed to create feedback" });
  }
});

// Get feedback by ID
router.get("/feedback/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const { data: historyEntry, error } = await supabase
      .from('history')
      .select('*')
      .eq('history_id', id)
      .single();

    if (error || !historyEntry) {
      return res.status(404).json({ error: "Feedback not found" });
    }

    const feedback = {
      id: historyEntry.history_id,
      user_name: 'Anonymous',
      text: historyEntry.text,
      analysis_result: { feedback: historyEntry.feedback },
      created_at: historyEntry.created_at
    };

    res.json(feedback);
  } catch (error) {
    console.error("Error fetching feedback:", error);
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
});

// Delete feedback
router.delete("/feedback/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('history')
      .delete()
      .eq('history_id', id);

    if (error) throw error;

    res.status(204).end();
  } catch (error) {
    console.error("Error deleting feedback:", error);
    res.status(500).json({ error: "Failed to delete feedback" });
  }
});

export default router;