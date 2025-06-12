console.log('historyDetailPresenter.js loaded');

import { authenticatedApiCall } from '../config.js';

export async function renderHistoryDetail(historyId) {
  console.log('renderHistoryDetail called with historyId:', historyId);
  
  // Validate historyId first
  if (!historyId || historyId === 'undefined' || historyId === 'null') {
    console.error('Invalid historyId:', historyId);
    showErrorMessage('Invalid history ID provided');
    return;
  }

  try {
    fetch("/views/historydetailView.html")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load historydetailView.html");
        return res.text();
      })
      .then((html) => {
        document.getElementById("app").innerHTML = html;
        
        // Setup navigation similar to feedback presenter
        setupNavigation();
        loadHistoryDetail(historyId);
      })
      .catch((err) => {
        console.error("Error loading history detail view:", err);
        showErrorMessage(`Failed to load the history detail view: ${err.message}`);
      });
  } catch (error) {
    console.error("Error rendering history detail:", error);
    showErrorMessage(`Error rendering history detail: ${error.message}`);
  }
}

function setupNavigation() {
  const navLinks = [
    { selector: 'a[href="#dashboard"]', view: 'dashboard' }, 
    { selector: 'a[href="#history"]', view: 'history' },
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
  localStorage.clear();
  location.reload();
}

function loadView(view) {
  switch (view) {
    case 'dashboard':
      import('./dashboardPresenter.js').then(m => m.renderDashboard());
      break;
    case 'history':
      import('./historyPresenter.js').then(m => m.renderHistory());
      break;
    case 'logout':
      logout();
      break;
    default:
      console.warn(`View '${view}' not recognized`);
  }
}

async function loadHistoryDetail(historyId) {
  try {
    console.log('Loading history detail for ID:', historyId);
    const historyData = await authenticatedApiCall(`/api/history/${historyId}`);
    if (historyData) {
      displayHistoryDetail(historyData);
    } else {
      showNoDataMessage();
    }
  } catch (error) {
    console.error("Error loading history detail:", error);
    showErrorMessage(`Failed to load history detail: ${error.message}`);
  }
}

function displayHistoryDetail(data) {
  console.log('Displaying history detail:', data);
  
  const percentageElement = document.getElementById("percentage");
  const stressTitleElement = document.getElementById("stress-title");
  const emotionBadgeElement = document.getElementById("emotion-badge");
  const userInputElement = document.getElementById("user-input");
  const analysisTextElement = document.getElementById("analysis-text");
  const videoEmbedElements = document.querySelectorAll(".video-embed");

  const stressPercent = (data.stress_percent).toFixed(1);
  if (percentageElement) percentageElement.textContent = `${stressPercent}%`;

  if (percentageElement && percentageElement.parentElement) {
    const donutContainer = percentageElement.parentElement;
    
    let strokeColor;
    if (stressPercent > 66) {
      strokeColor = '#dc2626'; 
    } else if (stressPercent > 33) {
      strokeColor = '#eab308';
    } else {
      strokeColor = '#16a34a'; 
    }

    const svgSize = 112;
    const strokeWidth = 8;
    const radius = (svgSize - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (stressPercent / 100) * circumference;

    donutContainer.innerHTML = `
      <div class="relative w-28 h-28 flex items-center justify-center">
        <svg class="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 ${svgSize} ${svgSize}">
          <!-- Background circle -->
          <circle
            cx="${svgSize / 2}"
            cy="${svgSize / 2}"
            r="${radius}"
            stroke="#e5e7eb"
            stroke-width="${strokeWidth}"
            fill="transparent"
          />
          <!-- Progress circle -->
          <circle
            cx="${svgSize / 2}"
            cy="${svgSize / 2}"
            r="${radius}"
            stroke="${strokeColor}"
            stroke-width="${strokeWidth}"
            fill="transparent"
            stroke-dasharray="${strokeDasharray}"
            stroke-dashoffset="${strokeDashoffset}"
            stroke-linecap="round"
            class="transition-all duration-1000 ease-out"
          />
        </svg>
        <div class="relative z-10 text-center">
          <div class="text-xl font-bold text-gray-800">${stressPercent}%</div>
        </div>
      </div>
    `;
  }

  if (stressTitleElement) {
    let stressLevelText = "Unknown";
    
    if (data.stress_level) {
      const level = data.stress_level.toLowerCase();
      switch (level) {
        case 'low':
          stressLevelText = "Low Stress";
          break;
        case 'medium':
          stressLevelText = "Medium Stress";
          break;
        case 'high':
          stressLevelText = "High Stress";
          break;
        default:
          stressLevelText = data.stress_level.charAt(0).toUpperCase() + data.stress_level.slice(1);
      }
    }
    
    stressTitleElement.textContent = stressLevelText;
  }

  if (emotionBadgeElement) {
    emotionBadgeElement.textContent = `Emotion: ${data.emotion || 'Unknown'}`;
    emotionBadgeElement.className = `inline-block bg-violet-800 text-white rounded-full px-3 py-1 text-sm mb-3`;
  }

  if (userInputElement) {
    userInputElement.textContent = data.text || "No input provided.";
  }

  if (analysisTextElement && data.feedback) {
    const parts = data.feedback.split('Suggestions:');
    let reason = parts[0].replace(/^-\s*|\s*-$/g, '').trim();
    const suggestions = parts[1] ? parts[1].trim() : '';

    const prefix = "Why you're getting this result:";
    if (reason.startsWith(prefix)) {
      reason = reason.slice(prefix.length).trim();
    }

    analysisTextElement.innerHTML = `
      <strong>Why you're getting this result:</strong> ${reason}
      ${suggestions ? `<br><br><strong>Suggestions:</strong> ${suggestions}` : ''}
    `;
  } else if (analysisTextElement) {
    analysisTextElement.textContent = "No feedback provided.";
  }

  let videoLinks = [];
  if (data.video_link) {
    try {
      videoLinks = JSON.parse(data.video_link);
      console.log('Parsed video links:', videoLinks);
    } catch (error) {
      console.error('Error parsing video links:', error);
      videoLinks = [];
    }
  }

  videoEmbedElements.forEach((embed, index) => {
    const videoLink = videoLinks[index];

    if (videoLink && videoLink.trim() !== '') {
      console.log(`Setting video ${index}:`, videoLink);
      embed.innerHTML = `
        <iframe 
          width="100%" 
          height="100%" 
          src="${videoLink}" 
          frameborder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen
          class="w-full h-full rounded-lg">
        </iframe>`;
    } else {
      console.log(`No video available for embed ${index}`);
      embed.innerHTML = `
        <div class="flex items-center justify-center text-gray-600 h-full">
          <div class="text-center">
            <svg class="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
            </svg>
            <p class="text-sm">No video available</p>
          </div>
        </div>`;
    }
  });
}




function showNoDataMessage() {
  const app = document.getElementById("app");
  if (app) {
    app.innerHTML = `
      <div class="max-w-6xl mx-auto px-4 py-8 text-center">
        <div class="text-gray-400 mb-4">
          <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
        </div>
        <p class="text-gray-500 text-lg">No history detail available</p>
        <button onclick="loadView('history')" class="mt-4 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors">
          Back to History
        </button>
      </div>
    `;
  }
}

function showErrorMessage(message) {
  const app = document.getElementById("app");
  if (app) {
    app.innerHTML = `
      <div class="max-w-6xl mx-auto px-4 py-8 text-center">
        <div class="text-red-400 mb-4">
          <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
        </div>
        <p class="text-red-500 text-lg">${message}</p>
        <button onclick="loadView('history')" class="mt-4 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors">
          Back to History
        </button>
      </div>
    `;
  }
}

window.loadView = loadView;
