import express from "express";
import axios from "axios";
import { supabase } from "../supabaseClient.js";
import { generateId } from "../utils/helpers.js";
import { DateTime } from "luxon";

const router = express.Router();

router.post("/curhat", async (req, res) => {
  const { text, user_id } = req.body;

  console.log("Received curhat request:", {
    text: text ? text.substring(0, 50) + "..." : "No text",
    user_id: user_id || "No user_id",
    textLength: text ? text.length : 0
  });

  if (!text) {
    console.error("No text provided");
    return res.status(400).json({ error: "Text is required" });
  }

  if (text.length < 10) {
    console.error("Text too short:", text.length);
    return res.status(400).json({ error: "Text must be at least 10 characters long" });
  }

  try {
    console.log("Calling ML API...");
    console.log("ML API URL:", "https://ml-api-295116710961.asia-southeast1.run.app/predict/analyze");
    
    const mlResponse = await axios.post(
      "https://ml-api-295116710961.asia-southeast1.run.app/predict/analyze",
      { text: text.trim() },
      { 
        headers: { 
          "Content-Type": "application/json",
          "User-Agent": "HiddenMood-Backend/1.0"
        },
        timeout: 120000, 
        validateStatus: function (status) {
          return status < 500;
        }
      }
    );

    console.log("ML API Response Status:", mlResponse.status);

    if (mlResponse.status !== 200) {
      console.error("ML API returned non-200 status:", mlResponse.status);
      console.error("ML API Response:", mlResponse.data);
      
      return res.status(500).json({ 
        error: "ML API returned an error", 
        status: mlResponse.status,
        details: mlResponse.data || "No details available"
      });
    }

    const mlResult = mlResponse.data;
    console.log("ML API Success! Response:", JSON.stringify(mlResult, null, 2));

    if (!mlResult || typeof mlResult !== 'object') {
      console.error("Invalid ML response format:", typeof mlResult);
      return res.status(500).json({ 
        error: "Invalid response format from ML API",
        received: typeof mlResult
      });
    }

    const responseData = {
      predicted_stress: mlResult.predicted_stress || { 
        label: 'medium', 
        confidence: 0.5 
      },
      predicted_emotion: mlResult.predicted_emotion || { 
        label: 'neutral', 
        confidence: 0.5 
      },
      stress_level: mlResult.stress_level || { 
        stress_level: 50 
      },
      analysis: mlResult.analysis || 'Your text has been analyzed successfully.',
      recommended_videos: mlResult.recommended_videos || { 
        recommendations: [] 
      }
    };

    console.log("Processed response data:", {
      stress_label: responseData.predicted_stress.label,
      emotion_label: responseData.predicted_emotion.label,
      stress_percent: responseData.stress_level.stress_level,
      videos_count: responseData.recommended_videos.recommendations?.length || 0
    });

    if (user_id) {
      try {
        console.log("Saving to history for user:", user_id);
        
        const history_id = generateId();
        const historyData = {
          history_id,
          user_id,
          stress_level: responseData.predicted_stress.label,
          stress_percent: responseData.stress_level.stress_level, 
          emotion: responseData.predicted_emotion.label,
          text: text.trim(),
          feedback: responseData.analysis,
          video_link: responseData.recommended_videos.recommendations,
          created_at: DateTime.now().setZone("Asia/Jakarta").toISO()
        };

        console.log("History data to insert:", historyData);

        const { data: historyEntry, error: historyError } = await supabase
          .from('history')
          .insert(historyData)
          .select()
          .single();

        if (historyError) {
          console.error("Failed to save history:", historyError);
        } else {
          console.log("History saved successfully:", historyEntry.history_id);
          responseData.saved_to_history = true;
          responseData.history_id = historyEntry.history_id;
        }
      } catch (historyError) {
        console.error("History save error:", historyError);
        responseData.saved_to_history = false;
      }
    } else {
      console.log("No user_id provided, skipping history save");
      responseData.saved_to_history = false;
    }

    console.log("Sending response to frontend");
    res.json(responseData);

  } catch (error) {
    console.error("Error in /api/curhat:", error.message);
    console.error("Error stack:", error.stack);
    
    if (error.code === 'ECONNABORTED') {
      console.error("ML API request timed out");
      return res.status(408).json({ 
        error: "ML API request timed out. Please try again.",
        error_type: "timeout"
      });
    }
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.error("Cannot connect to ML API");
      return res.status(503).json({ 
        error: "Cannot connect to ML API. Please check if the service is running.",
        error_type: "connection_error"
      });
    }
    
    if (error.response) {
      console.error("ML API Error Response Status:", error.response.status);
      console.error("ML API Error Response Data:", error.response.data);
      
      return res.status(500).json({ 
        error: "ML API returned an error", 
        status: error.response.status,
        details: error.response.data,
        error_type: "ml_api_error"
      });
    }
    
    return res.status(500).json({ 
      error: "Failed to process text with ML API",
      details: error.message,
      error_type: "generic_error"
    });
  }
});

export default router;