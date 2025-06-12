import express from "express";
import { supabase } from "../supabaseClient.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Dashboard summary with stress history
router.get("/summary", authenticateToken, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);

    const { data: history, error } = await supabase
      .from('history')
      .select('stress_percent, emotion, created_at, text, feedback')
      .eq('user_id', req.user.user_id)
      .gte('created_at', daysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (history.length === 0) {
      return res.json({
        averageStress: 0,
        emotionCounts: {},
        stressHistory: [],
        latestEmotion: 'neutral',
        latestEmotionTime: null,
        weeklyCount: 0,
        totalCount: 0,
        mostCommonEmotion: 'neutral',
        tips: []
      });
    }

    // Calculate average stress from filtered history
    const validStressEntries = history.filter(h => h.stress_percent !== null && h.stress_percent !== undefined);
    const totalStress = validStressEntries.reduce((sum, h) => sum + h.stress_percent, 0);
    const averageStress = validStressEntries.length > 0 ? Math.round(totalStress / validStressEntries.length) : 0;

    // Count emotions
    const emotionCounts = {};
    history.forEach((h) => {
      const emotion = h.emotion || "neutral";
      emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
    });

    // Calculate weekly count (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weeklyCount = history.filter(h => new Date(h.created_at) >= weekAgo).length;

    // Find most common emotion
    const mostCommonEmotion = Object.keys(emotionCounts).length > 0 
      ? Object.keys(emotionCounts).reduce((a, b) => emotionCounts[a] > emotionCounts[b] ? a : b)
      : 'neutral';

    // Group stress data by day for chart
    const dailyData = {};
    const filteredHistory = history.filter(h => 
      h.stress_percent !== null && 
      h.stress_percent !== undefined
    );

    filteredHistory.forEach(h => {
      const date = new Date(h.created_at);
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { total: 0, count: 0 };
      }
      dailyData[dateKey].total += h.stress_percent;
      dailyData[dateKey].count += 1;
    });

    // Create stress history for chart
    const stressHistory = [];
    const sortedDates = Object.keys(dailyData).sort();
    
    // Limit to show only recent data points based on days filter
    const maxPoints = days <= 7 ? 7 : days <= 30 ? 15 : 30;
    const recentDates = sortedDates.slice(-maxPoints);
    
    recentDates.forEach(date => {
      stressHistory.push({
        date: date,
        value: Math.round(dailyData[date].total / dailyData[date].count)
      });
    });

    // Get latest emotion and time
    const latestEntry = history[0];
    const latestEmotion = latestEntry?.emotion || 'neutral';
    const latestEmotionTime = latestEntry?.created_at;

    // Extract tips from feedback containing "suggestion"
    const tips = [];
    history.forEach(h => {
      if (h.feedback) {
        const feedback = h.feedback.toLowerCase();
        const suggestionMatch = feedback.match(/suggestion[s]?[:\-]\s*([^.!?]+)/i);
        if (suggestionMatch) {
          const tip = suggestionMatch[1].trim();
          if (tip.length > 10 && tip.length < 150) {
            tips.push(tip.charAt(0).toUpperCase() + tip.slice(1));
          }
        }
      }
    });

    // Remove duplicates and limit to 5 tips
    const uniqueTips = [...new Set(tips)].slice(0, 5);

    // Default tips if none found
    const defaultTips = [
      'Take regular breaks throughout your day to reduce stress',
      'Practice deep breathing exercises for 5-10 minutes',
      'Try journaling to process your thoughts and emotions',
      'Engage in light physical activity or stretching',
      'Maintain a consistent sleep schedule for better mental health'
    ];

    res.json({ 
      averageStress, 
      emotionCounts, 
      stressHistory,
      latestEmotion,
      latestEmotionTime,
      weeklyCount,
      totalCount: history.length,
      mostCommonEmotion,
      tips: uniqueTips.length > 0 ? uniqueTips : defaultTips
    });
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    res.status(500).json({ error: "Failed to fetch dashboard summary" });
  }
});

// Recent history entries
router.get("/recent", authenticateToken, async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;

  try {
    const { data: history, error } = await supabase
      .from('history')
      .select('*')
      .eq('user_id', req.user.user_id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    res.json(history);
  } catch (error) {
    console.error("Error fetching recent history:", error);
    res.status(500).json({ error: "Failed to fetch recent history" });
  }
});

// Get detailed history entry by ID
router.get("/detail/:id", authenticateToken, async (req, res) => {
  try {
    const { data: entry, error } = await supabase
      .from('history')
      .select('*')
      .eq('history_id', req.params.id)
      .eq('user_id', req.user.user_id)
      .single();

    if (error) {
      console.error("Supabase error:", error);
      throw error;
    }

    if (!entry) {
      return res.status(404).json({ error: "Entry not found" });
    }

    res.json(entry);
  } catch (error) {
    console.error("Error fetching entry details:", error);
    res.status(500).json({ error: "Failed to fetch entry details" });
  }
});

export default router;

