import express from "express";
import { supabase } from "../supabaseClient.js";

const router = express.Router();

router.get("/articles", async (req, res) => {
  try {
    console.log("Fetching articles from Supabase...");
    
    const { data: articles, error } = await supabase
      .from('articles')
      .select('article_id, title, article_link, img, article_intro')

    console.log("Supabase response:", { 
      error: error, 
      articlesCount: articles ? articles.length : 0,
      firstArticle: articles && articles.length > 0 ? articles[0] : null
    });

    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({ 
        error: "Database error", 
        details: error.message,
        hint: error.hint || "Check your Supabase configuration"
      });
    }

    if (!articles || articles.length === 0) {
      console.log("No articles found in database");
      return res.status(200).json([]); 
    }

    console.log("Successfully fetched articles:", articles.length);
    res.json(articles);
    
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ 
      error: "Failed to fetch articles", 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router;