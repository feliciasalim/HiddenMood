// Backend API Route Fix (dashboardRoutes.js)
router.get("/summary", authenticateToken, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);

    const { data: history, error } = await supabase
      .from('history')
      .select('stress_percent, emotion, created_at, text, feedback, stress_level')
      .eq('user_id', req.user.user_id)
      .gte('created_at', daysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (history.length === 0) {
      return res.json({
        averageStress: 0,
        emotionCounts: {},
        stressHistory: [],
        latestEmotion: '',
        latestEmotionTime: null,
        weeklyCount: 0,
        totalCount: 0,
        mostCommonEmotion: '',
        mostCommonStressLevel: '',
        tips: []
      });
    }

    // Calculate average stress
    const validStressEntries = history.filter(h => h.stress_percent !== null && h.stress_percent !== undefined);
    const totalStress = validStressEntries.reduce((sum, h) => sum + h.stress_percent, 0);
    const averageStress = validStressEntries.length > 0 ? Math.round(totalStress / validStressEntries.length) : 0;

    // Count emotions - FIX: Handle null/undefined emotions properly
    const emotionCounts = {};
    history.forEach((h) => {
      const emotion = h.emotion && h.emotion.trim() ? h.emotion : "neutral";
      // Normalize emotion case for consistency
      const normalizedEmotion = emotion.charAt(0).toUpperCase() + emotion.slice(1).toLowerCase();
      emotionCounts[normalizedEmotion] = (emotionCounts[normalizedEmotion] || 0) + 1;
    });

    // Count stress levels
    const stressLevelCounts = {};
    history.forEach((h) => {
      if (h.stress_level) {
        stressLevelCounts[h.stress_level] = (stressLevelCounts[h.stress_level] || 0) + 1;
      }
    });

    const mostCommonStressLevel = Object.keys(stressLevelCounts).length > 0 
      ? Object.keys(stressLevelCounts).reduce((a, b) => stressLevelCounts[a] > stressLevelCounts[b] ? a : b)
      : 'Low';

    // Weekly count
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weeklyCount = history.filter(h => new Date(h.created_at) >= weekAgo).length;

    const mostCommonEmotion = Object.keys(emotionCounts).length > 0 
      ? Object.keys(emotionCounts).reduce((a, b) => emotionCounts[a] > emotionCounts[b] ? a : b)
      : 'neutral';

    // Calculate daily stress history
    const dailyData = {};
    const filteredHistory = history.filter(h => 
      h.stress_percent !== null && 
      h.stress_percent !== undefined
    );

    filteredHistory.forEach(h => {
      const date = new Date(h.created_at);
      const dateKey = date.toISOString().split('T')[0]; 
      
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { total: 0, count: 0 };
      }
      dailyData[dateKey].total += h.stress_percent;
      dailyData[dateKey].count += 1;
    });

    const stressHistory = [];
    const sortedDates = Object.keys(dailyData).sort();
    
    const maxPoints = days <= 7 ? 7 : days <= 30 ? 15 : 30;
    const recentDates = sortedDates.slice(-maxPoints);
    
    recentDates.forEach(date => {
      stressHistory.push({
        date: date,
        value: Math.round(dailyData[date].total / dailyData[date].count)
      });
    });

    // FIX: Get latest emotion properly
    const latestEntry = history[0]; // Most recent entry
    let latestEmotion = 'neutral';
    
    if (latestEntry && latestEntry.emotion && latestEntry.emotion.trim()) {
      latestEmotion = latestEntry.emotion.toLowerCase();
    }

    const latestEmotionTime = latestEntry?.created_at;

    // Extract tips from feedback
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

    const uniqueTips = [...new Set(tips)].slice(0, 5);

    const defaultTips = [
      'Take regular breaks throughout your day to reduce stress',
      'Practice deep breathing exercises for 5-10 minutes',
      'Try journaling to process your thoughts and emotions',
      'Engage in light physical activity or stretching',
      'Maintain a consistent sleep schedule for better mental health'
    ];

    console.log('Dashboard Summary Response:', {
      latestEmotion,
      latestEmotionTime,
      emotionCounts,
      totalEntries: history.length
    });

    res.json({ 
      averageStress, 
      emotionCounts, 
      stressHistory,
      latestEmotion,
      latestEmotionTime,
      weeklyCount,
      totalCount: history.length,
      mostCommonEmotion,
      mostCommonStressLevel,
      tips: uniqueTips.length > 0 ? uniqueTips : defaultTips
    });
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    res.status(500).json({ error: "Failed to fetch dashboard summary" });
  }
});

// Frontend Dashboard Presenter Fix (dashboardPresenter.js)
// Add this improved emotion mapping
const emotionEmojis = {
  'anxious': '😰',
  'depressed': '😔',
  'overwhelmed': '😩',
  'panicked': '😨',
  'lonely': '😐',
  'neutral': '😐',
  'happy': '😊',
  'sad': '😢',
  'angry': '😠',
  'excited': '😄',
  'calm': '😌',
  'stressed': '😤'
};

// Improved updateLatestEmotion function
function updateLatestEmotion() {
  const emojiEl = document.getElementById('latest-emotion-emoji');
  const textEl = document.getElementById('latest-emotion-text');
  
  console.log('Updating latest emotion:', {
    emojiEl: !!emojiEl,
    textEl: !!textEl,
    latestEmotion: dashboardData.latestEmotion
  });
  
  if (!emojiEl || !textEl) {
    console.error('Latest emotion elements not found in DOM');
    return;
  }
  
  // Handle empty or null emotion
  let emotion = dashboardData.latestEmotion;
  if (!emotion || emotion.trim() === '' || emotion === 'No emotion entry') {
    emotion = 'neutral';
  }
  
  const normalizedEmotion = emotion.toLowerCase().trim();
  
  // Update emoji
  const emoji = emotionEmojis[normalizedEmotion] || emotionEmojis['neutral'] || '😐';
  emojiEl.textContent = emoji;
  
  // Update text with proper capitalization
  const displayText = normalizedEmotion.charAt(0).toUpperCase() + normalizedEmotion.slice(1);
  textEl.textContent = displayText;
  
  console.log('Latest emotion updated:', {
    originalEmotion: dashboardData.latestEmotion,
    normalizedEmotion,
    emoji,
    displayText
  });
}

// Improved loadDashboardSummary function
async function loadDashboardSummary() {
  try {
    const days = getCurrentFilterDays();
    console.log('Loading dashboard summary for days:', days);
    
    const data = await authenticatedApiCall(`/api/dashboard/summary?days=${days}`, 'GET');
    
    console.log('Dashboard summary data received:', data);
    
    dashboardData.averageStress = data.averageStress || 0;
    dashboardData.emotionCounts = data.emotionCounts || {};
    dashboardData.stressHistory = data.stressHistory || [];
    dashboardData.latestEmotion = data.latestEmotion || 'neutral';
    dashboardData.totalSessions = data.totalCount || 0;
    dashboardData.weeklyStressLevel = data.mostCommonStressLevel || 'Low';
    dashboardData.avgMood = data.mostCommonEmotion || 'neutral';
    
    console.log('Dashboard data updated:', {
      latestEmotion: dashboardData.latestEmotion,
      emotionCounts: dashboardData.emotionCounts,
      totalSessions: dashboardData.totalSessions
    });
    
  } catch (error) {
    console.error('Error loading dashboard summary:', error);
    throw error;
  }
}

router.get("/weekly-stats", authenticateToken, async (req, res) => {
  try {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { data: weeklyHistory, error } = await supabase
      .from('history')
      .select('stress_percent, stress_level')
      .eq('user_id', req.user.user_id)
      .gte('created_at', weekAgo.toISOString());

    if (error) throw error;

    if (weeklyHistory.length === 0) {
      return res.json({
        weeklyAverageStress: 0,
        weeklyStressLevel: '-',
        weeklyCount: 0
      });
    }

    // Calculate weekly average stress
    const validStressEntries = weeklyHistory.filter(h => h.stress_percent !== null && h.stress_percent !== undefined);
    const totalStress = validStressEntries.reduce((sum, h) => sum + h.stress_percent, 0);
    const weeklyAverageStress = validStressEntries.length > 0 ? Math.round(totalStress / validStressEntries.length) : 0;

    // Determine stress level based on average
    let weeklyStressLevel = 'Low';
    if (weeklyAverageStress >= 70) {
      weeklyStressLevel = 'High';
    } else if (weeklyAverageStress >= 40) {
      weeklyStressLevel = 'Medium';
    }

    res.json({
      weeklyAverageStress,
      weeklyStressLevel,
      weeklyCount: weeklyHistory.length
    });

  } catch (error) {
    console.error("Error fetching weekly stats:", error);
    res.status(500).json({ error: "Failed to fetch weekly stats" });
  }
});

async function initializeDashboard() {
  try {
    console.log('Initializing dashboard...');
    showLoadingState();
    
    await Promise.all([
      loadDashboardSummary(),
      loadRecentHistory()
    ]);

    await loadStressTips();

    console.log('Updating UI components...');
    updateStressLevel();
    updateLatestEmotion(); // Make sure this is called
    updateQuickStats();
    updateEmotionTracker();
    updateStressChart();
    updatePredictionsTable();
    updateTips();
    updateRecentActivity();
    
    setupEventListeners();
    
    hideLoadingState();
    
    console.log('Dashboard initialization complete');
    
  } catch (error) {
    console.error('Error initializing dashboard:', error);
    hideLoadingState();
    showError('Failed to load dashboard data. Please refresh the page.');
  }
}