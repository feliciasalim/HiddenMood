import { authenticatedApiCall } from '../config.js';

export function renderDashboard() {
  fetch("views/dashboardView.html")
    .then((res) => {
      if (!res.ok) throw new Error("Failed to load dashboardView.html");
      return res.text();
    })
    .then((html) => {
      document.getElementById("app").innerHTML = html;


      loadChartJS().then(() => {
        setupNavigation();
        initializeDashboard();
      });
    })
    .catch((err) => {
      console.error("Error loading dashboard:", err);
      showError("Failed to load dashboard. Please try again.");
    });
}

function loadChartJS() {
  return new Promise((resolve, reject) => {
    if (window.Chart) {
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

const emotionEmojis = {
  'anxious': '😰',
  'depressed': '😔',
  'overwhelmed': '😩',
  'panicked': '😨',
  'lonely': '😐'
};

let dashboardData = {
  averageStress: 0,
  stressHistory: [],
  emotionCounts: {},
  latestEmotion: 'neutral',
  recentPredictions: [],
  tips: [],
  totalSessions: 0,
  weeklyStressLevel: '',
  avgMood: '',
  recentActivity: []
};

let chartInstances = {};

async function initializeDashboard() {
  try {
    showLoadingState();
    
    await Promise.all([
      loadDashboardSummary(),
      loadRecentHistory()
    ]);

    await loadStressTips();

    updateStressLevel();
    updateLatestEmotion();
    updateQuickStats();
    updateEmotionTracker();
    updateStressChart();
    updatePredictionsTable();
    updateTips();
    updateRecentActivity();
    
    setupEventListeners();
    
    hideLoadingState();
    
  } catch (error) {
    console.error('Error initializing dashboard:', error);
    hideLoadingState();
    showError('Failed to load dashboard data. Please refresh the page.');
  }
}


async function loadDashboardSummary() {
  try {
    const days = getCurrentFilterDays();
    const data = await authenticatedApiCall(`/api/dashboard/summary?days=${days}`, 'GET');
    
    dashboardData.averageStress = data.averageStress || 0;
    dashboardData.emotionCounts = data.emotionCounts || {};
    dashboardData.stressHistory = data.stressHistory || [];
    dashboardData.latestEmotion = data.latestEmotion || 'neutral';
    dashboardData.totalSessions = data.totalCount || 0;
    dashboardData.weeklyStressLevel = data.mostCommonStressLevel || 'Low';
    dashboardData.avgMood = data.mostCommonEmotion || 'neutral';
    
  } catch (error) {
    console.error('Error loading dashboard summary:', error);
    throw error;
  }
}

async function loadRecentHistory(limit = 10) {
  try {
    const data = await authenticatedApiCall(`/api/dashboard/recent?limit=${limit}`, 'GET');
    
    dashboardData.recentPredictions = data.map(item => ({
      date: item.created_at,
      emotion: item.emotion,
      stress_level: item.stress_level,
      stress_percent: item.stress_percent,
      text: item.text,
      feedback: item.feedback,
      history_id: item.history_id
    }));

    dashboardData.recentActivity = data.slice(0, 5).map(item => ({
      date: item.created_at,
      text: item.text,
      emotion: item.emotion
    }));
    
  } catch (error) {
    console.error('Error loading recent history:', error);
    throw error;
  }
}

async function loadStressTips() {
  try {
    const tips = [];

    if (dashboardData.recentPredictions.length > 0 && dashboardData.recentPredictions[0].feedback) {
      const feedback = dashboardData.recentPredictions[0].feedback;
      
      const whyIndex = feedback.indexOf("Why you're getting this result:");
      const suggestionIndex = feedback.indexOf("Suggestions:");
      
      let explanation = "";
      let suggestion = "";
      
      if (whyIndex !== -1 && suggestionIndex !== -1) {
        explanation = feedback.substring(whyIndex + "Why you're getting this result:".length, suggestionIndex).trim();
        
        suggestion = feedback.substring(suggestionIndex + "Suggestions:".length).trim();
        
        if (explanation) {
          tips.push(`${explanation}`);
        }
        if (suggestion) {
          tips.push(`${suggestion}`);
        }
      }
    }

    dashboardData.tips = tips;
    
    if (dashboardData.tips.length === 0) {
      dashboardData.tips = [
        '• Take regular breaks throughout the day',
        '• Practice deep breathing exercises',
        '• Maintain a consistent sleep schedule',
        '• Engage in physical activities',
        '• Try meditation or mindfulness exercises'
      ];
    }
    
  } catch (error) {
    console.error('Error loading stress tips:', error);
    dashboardData.tips = [
      '• Take regular breaks throughout the day',
      '• Practice deep breathing exercises',
      '• Maintain a consistent sleep schedule',
      '• Engage in physical activities'
    ];
  }
}

function updateStressLevel() {
  const stressEl = document.getElementById('stress-percentage');
  if (!stressEl) return;
  
  stressEl.textContent = `${dashboardData.averageStress}%`;
  
  if (dashboardData.averageStress >= 70) {
    stressEl.className = 'text-4xl sm:text-6xl font-bold text-red-600 mb-3 sm:mb-4';
  } else if (dashboardData.averageStress >= 40) {
    stressEl.className = 'text-4xl sm:text-6xl font-bold text-yellow-600 mb-3 sm:mb-4';
  } else {
    stressEl.className = 'text-4xl sm:text-6xl font-bold text-green-600 mb-3 sm:mb-4';
  }
}

function updateLatestEmotion() {
  const emojiEl = document.getElementById('latest-emotion-emoji');
  const textEl = document.getElementById('latest-emotion-text');
  
  if (!emojiEl || !textEl) return;
  
  const emotion = dashboardData.latestEmotion.toLowerCase();
  emojiEl.textContent = emotionEmojis[emotion] || '😐';
  textEl.textContent = emotion.charAt(0).toUpperCase() + emotion.slice(1);
}

function updateQuickStats() {
  const totalEl = document.getElementById('total-predictions');
  if (totalEl) totalEl.textContent = dashboardData.totalSessions;

  const weekEl = document.getElementById('week-predictions');
  if (weekEl) weekEl.textContent = dashboardData.weeklyStressLevel;

  const avgMoodEl = document.getElementById('avg-mood');
  if (avgMoodEl) {
    const mood = dashboardData.avgMood.charAt(0).toUpperCase() + dashboardData.avgMood.slice(1);
    avgMoodEl.textContent = mood;
  }
}

function updateEmotionTracker() {
  const ctx = document.getElementById('emotion-chart');
  if (!ctx || !window.Chart) return;
  
  if (chartInstances.emotionChart) {
    chartInstances.emotionChart.destroy();
  }
  
  const chartContext = ctx.getContext('2d');
  
  const emotions = ['depressed', 'panicked', 'anxious', 'overwhelmed', 'lonely'];
  
  const counts = emotions.map(emotion => dashboardData.emotionCounts[emotion.charAt(0).toUpperCase() + emotion.slice(1)] || 0);
  
  const total = counts.reduce((sum, count) => sum + count, 0);

  const totalChartEl = document.getElementById('emotion-chart-total');
  if (totalChartEl) totalChartEl.textContent = total;

  emotions.forEach(emotion => {
    const countEl = document.getElementById(`${emotion}-count`);
    if (countEl) countEl.textContent = dashboardData.emotionCounts[emotion.charAt(0).toUpperCase() + emotion.slice(1)] || 0;
  });

  const colorScale = [
    '#5e4fa2', 
    '#9e7bb5', 
    '#d4a5e3', 
    '#e0b0e4', 
    '#f1d4e0' 
  ];

  const emotionCountsWithNames = emotions.map((emotion, index) => ({
    name: emotion,
    count: counts[index]
  }));

  emotionCountsWithNames.sort((a, b) => b.count - a.count);

  const assignedColors = emotionCountsWithNames.map((emotion, index) => {
    return colorScale[index]; 
  });

  if (total > 0) {
    chartInstances.emotionChart = new Chart(chartContext, {
      type: 'doughnut',
      data: {
        labels: emotions.map(e => e.charAt(0).toUpperCase() + e.slice(1)),
        datasets: [{
          data: counts,
          backgroundColor: assignedColors,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
  } else {
    chartContext.clearRect(0, 0, ctx.width, ctx.height);
    chartContext.fillStyle = '#6b7280';
    chartContext.font = '14px sans-serif';
    chartContext.textAlign = 'center';
    chartContext.fillText('No data available', ctx.width / 2, ctx.height / 2);
  }
}


function updateStressChart() {
  const ctx = document.getElementById('stress-chart');
  if (!ctx || !window.Chart) return;
  
  if (chartInstances.stressChart) {
    chartInstances.stressChart.destroy();
  }
  
  const chartContext = ctx.getContext('2d');
  
  if (dashboardData.stressHistory.length === 0) {
    chartContext.clearRect(0, 0, ctx.width, ctx.height);
    chartContext.fillStyle = '#6b7280';
    chartContext.font = '14px sans-serif';
    chartContext.textAlign = 'center';
    chartContext.fillText('No stress data available', ctx.width / 2, ctx.height / 2);
    return;
  }
  
  const labels = dashboardData.stressHistory.map(item => {
    let date;
    if (typeof item.date === 'string') {
      date = new Date(item.date);
    } else if (typeof item.date === 'number') {
      date = new Date(item.date * 1000); 
    } else {
      date = item.date;
    }
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
  
  const data = dashboardData.stressHistory.map(item => item.value || item.stress_percent || 0);

  chartInstances.stressChart = new Chart(chartContext, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Stress Level (%)',
        data: data,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: data.map(value => {
          if (value >= 70) return '#dc2626'; 
          if (value >= 40) return '#f59e0b'; 
          return '#10b981'; 
        }),
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: function(value) {
              return value + '%';
            }
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      }
    }
  });
}

function updatePredictionsTable() {
  const tbody = document.getElementById('predictions-table');
  if (!tbody) return;
  
  tbody.innerHTML = '';

  const recentPredictions = dashboardData.recentPredictions.slice(0, 5);
  
  if (recentPredictions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="px-6 py-8 text-center text-gray-500">
          No predictions found
        </td>
      </tr>
    `;
    return;
  }

  recentPredictions.forEach(prediction => {
    const row = document.createElement('tr');
    row.className = 'border-b hover:bg-gray-50';
    
    const stressColor = prediction.stress_percent >= 70 ? 'text-red-600' : 
                       prediction.stress_percent >= 40 ? 'text-yellow-600' : 'text-green-600';

    let suggestion = 'No suggestion available';
    if (prediction.feedback) {
      const suggestionIndex = prediction.feedback.toLowerCase().indexOf('suggestion');
      if (suggestionIndex !== -1) {
        const suggestionText = prediction.feedback.substring(suggestionIndex);
        const lines = suggestionText.split('\n');
        suggestion = lines[0].replace(/suggestion[s]?[:\-]\s*/i, '').trim();
        if (suggestion.length > 50) {
          suggestion = suggestion.substring(0, 50) + '...';
        }
      }
    }

    let textPreview = prediction.text || 'No text available';
    if (textPreview.length > 60) {
      textPreview = textPreview.substring(0, 60) + '...';
    }

    let formattedDate;
    try {
      const date = new Date(prediction.date);
      formattedDate = date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (e) {
      formattedDate = 'Invalid date';
    }

    row.innerHTML = `
      <td class="px-6 py-4 text-sm text-gray-900">
        ${formattedDate}
      </td>
      <td class="px-6 py-4 text-sm">
        <span class="inline-flex items-center">
          <span class="mr-2">${emotionEmojis[prediction.emotion?.toLowerCase()] || '😐'}</span>
          ${prediction.emotion ? prediction.emotion.charAt(0).toUpperCase() + prediction.emotion.slice(1) : 'Unknown'}
        </span>
      </td>
      <td class="px-6 py-4 text-sm text-gray-500" title="${prediction.text}">
        ${textPreview}
      </td>
      <td class="px-6 py-4 text-sm font-medium ${stressColor}">
        ${prediction.stress_level || 'N/A'} (${prediction.stress_percent || 0}%)
      </td>
      <td class="px-6 py-4 text-sm text-gray-500" title="${suggestion}">
        ${suggestion.length > 40 ? suggestion.substring(0, 40) + '...' : suggestion}
      </td>
    `;
    tbody.appendChild(row);
  });
}

function updateTips() {
  const tipsEl = document.getElementById('stress-tips');
  if (!tipsEl) return;
  
  tipsEl.innerHTML = '';
  dashboardData.tips.forEach(tip => {
    const li = document.createElement('li');
    li.className = 'flex items-start';
    li.innerHTML = `
      <span class="flex-shrink-0 w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3"></span>
      <span class="text-sm text-gray-700">${tip}</span>
    `;
    tipsEl.appendChild(li);
  });
}

function updateRecentActivity() {
  const activityEl = document.getElementById('recent-activity');
  if (!activityEl) return;
  
  activityEl.innerHTML = '';
  
  if (dashboardData.recentActivity.length === 0) {
    activityEl.innerHTML = '<div class="text-sm text-gray-500 text-center py-4">No recent activity</div>';
    return;
  }
  
  dashboardData.recentActivity.forEach(activity => {
    const div = document.createElement('div');
    div.className = 'flex items-start space-x-3 p-3 bg-gray-50 rounded-lg mb-2';
    
    let textPreview = activity.text || 'No text available';
    if (textPreview.length > 80) {
      textPreview = textPreview.substring(0, 80) + '...';
    }
    
    let formattedDate;
    try {
      const date = new Date(activity.date);
      formattedDate = date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      formattedDate = 'Invalid date';
    }
    
    div.innerHTML = `
      <span class="text-lg">${emotionEmojis[activity.emotion?.toLowerCase()] || '😐'}</span>
      <div class="flex-1 min-w-0">
        <p class="text-sm text-gray-900">${textPreview}</p>
        <p class="text-xs text-gray-500">${formattedDate}</p>
      </div>
    `;
    activityEl.appendChild(div);
  });
}

function setupEventListeners() {
  const timeFilter = document.getElementById('time-filter');
  if (timeFilter) {
    timeFilter.addEventListener('change', async function(e) {
      await refreshDashboardData();
    });
  }

  const chartFilter = document.getElementById('chart-filter');
  if (chartFilter) {
    chartFilter.addEventListener('change', async function(e) {
      await refreshDashboardData();
    });
  }

  const refreshBtn = document.getElementById('refresh-dashboard');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      await initializeDashboard();
    });
  }
}

function getCurrentFilterDays() {
  const timeFilter = document.getElementById('time-filter');
  return timeFilter ? parseInt(timeFilter.value) : 30;
}

async function refreshDashboardData() {
  try {
    showLoadingState();
    
    await Promise.all([
      loadDashboardSummary(),
      loadRecentHistory()
    ]);
    
    await loadStressTips();
    
    updateStressLevel();
    updateQuickStats();
    updateStressChart();
    updateEmotionTracker();
    updatePredictionsTable();
    updateTips(); 
    
    hideLoadingState();
  } catch (error) {
    console.error('Error refreshing dashboard:', error);
    hideLoadingState();
    showError('Failed to refresh dashboard data');
  }
}


function showLoadingState() {
  const loadingElements = document.querySelectorAll('.loading-placeholder');
  loadingElements.forEach(el => el.classList.remove('hidden'));
}

function hideLoadingState() {
  const loadingElements = document.querySelectorAll('.loading-placeholder');
  loadingElements.forEach(el => el.classList.add('hidden'));
}

function showError(message) {
  const notification = document.createElement('div');
  notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    if (document.body.contains(notification)) {
      document.body.removeChild(notification);
    }
  }, 5000);
}

function setupNavigation() {
  const navLinks = [
    { selector: 'a[href="#home"]', view: 'home' },
    { selector: 'a[href="#curhat"]', view: 'curhat' },
    { selector: 'a[href="#feedback"]', view: 'feedback' },
    { selector: 'a[href="#dashboard"]', view: 'dashboard' },
    { selector: 'a[href="#logout"]', view: 'logout' },
  ];

  navLinks.forEach(({ selector, view }) => {
    const el = document.querySelector(selector);
    if (el) {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        if (view === 'logout') {
          logout();
        } else {
          loadView(view);
        }
      });
    }
  });
}

function logout() {
  Object.values(chartInstances).forEach(chart => {
    if (chart && typeof chart.destroy === 'function') {
      chart.destroy();
    }
  });
  chartInstances = {};
  
  localStorage.clear();
  sessionStorage.removeItem("isLoggedIn");
  console.log("User logged out, session cleared");
  loadView("home");
}

function loadView(view) {
  if (view !== 'dashboard') {
    Object.values(chartInstances).forEach(chart => {
      if (chart && typeof chart.destroy === 'function') {
        chart.destroy();
      }
    });
    chartInstances = {};
  }
  
  switch (view) {
    case 'home':
      import('./homePresenter.js').then(module => module.renderHome());
      break;
    case 'curhat':
      import('./curhatPresenter.js').then(module => module.renderCurhat());
      break;
    case 'feedback':
      import('./feedbackPresenter.js').then(module => module.renderFeedback());
      break;
    case 'dashboard':
      renderDashboard();
      break;
    default:
      console.warn("Unknown view:", view);
      break;
  }
}