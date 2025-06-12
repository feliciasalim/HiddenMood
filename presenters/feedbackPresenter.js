export function renderFeedback() {
  fetch("views/feedbackView.html")
    .then((res) => {
      if (!res.ok) throw new Error("Failed to load feedbackView.html");
      return res.text();
    })
    .then((html) => {
      document.getElementById("app").innerHTML = html;

      const userName = localStorage.getItem("username") || "User";
      const usernameEl = document.getElementById("username");
      if (usernameEl) usernameEl.textContent = userName;

      setupNavigation();
      loadFeedbackResult();
    })
    .catch((err) => {
      console.error("Error loading feedback view:", err);
    });
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
      console.warn(`View '${view}' tidak dikenali`);
  }
}

function loadFeedbackResult() {
  const result = JSON.parse(sessionStorage.getItem("curhatResult"));
  if (!result) {
    console.warn("No feedback result found in sessionStorage.");
    return;
  }
  displayFeedback(result);
  populateUserInput(result);
  populateKeywordsAndAnalysis(result);
}

function displayFeedback(result) {
  const stressPercentEl = document.getElementById("percentage");
  const chartContainer = document.querySelector('.result-card .flex > :first-child');
  if (stressPercentEl && chartContainer) {
    const stressLevel = result.stress_level?.stress_level || 0;
    stressPercentEl.textContent = `${stressLevel}%`;

    // Create donut chart SVG
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (stressLevel / 100) * circumference;

    chartContainer.innerHTML = `
      <svg width="120" height="120" viewBox="0 0 120 120" class="transform -rotate-90">
        <circle cx="60" cy="60" r="${radius}" fill="none" stroke="#e5e7eb" stroke-width="20" />
        <circle cx="60" cy="60" r="${radius}" fill="none" stroke="url(#gradient)" stroke-width="20" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#6b21a8;" />
            <stop offset="100%" style="stop-color:#a78bfa;" />
          </linearGradient>
        </defs>
      </svg>
      <div class="absolute inset-0 flex items-center justify-center text-violet-800 font-bold text-xl">
        <span id="percentage">${stressLevel}%</span>
      </div>
    `;

    // Update styles for positioning
    chartContainer.classList.add('relative');
    chartContainer.style.width = '120px';
    chartContainer.style.height = '120px';
  }

  const stressTitleEl = document.getElementById("stress-title");
  if (stressTitleEl) stressTitleEl.textContent = result.predicted_stress?.label || "Unknown";

  const emotionBadgeEl = document.getElementById("emotion-badge");
  if (emotionBadgeEl) emotionBadgeEl.textContent = `Emotion: ${result.predicted_emotion?.label || "Unknown"}`;

  const videoEmbeds = document.querySelectorAll('.video-box .video-embed');
  if (result.recommended_videos?.recommendations) {
    videoEmbeds.forEach((embed, index) => {
      const videoUrl = result.recommended_videos.recommendations[index];
      if (!videoUrl) {
        embed.innerHTML = `<p class="text-gray-500 italic">Video unavailable.</p>`;
        return;
      }
      const videoId = videoUrl.split("/embed/")[1];
      if (!videoId) {
        embed.innerHTML = `<p class="text-gray-500 italic">Video unavailable.</p>`;
        return;
      }

      embed.innerHTML = `
        <iframe 
          src="https://www.youtube.com/embed/${videoId}" 
          frameborder="0" 
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen 
          class="w-full h-full rounded-lg">
        </iframe>`;
    });
  }
}

function populateUserInput(result) {
  const userInputEl = document.getElementById("user-input");
  if (userInputEl) {
    userInputEl.textContent = result.user_input || "No input provided.";
  }
}

function populateKeywordsAndAnalysis(result) {
  const reasonBox = document.querySelector('.reason-box');
  if (reasonBox && result.analysis) {
    const contentElement = reasonBox.querySelector('p');
    if (contentElement) {
      const parts = result.analysis.split('Suggestions:');
      let reason = parts[0].replace(/^-\s*|\s*-$/g, '').trim();
      const suggestions = parts[1] ? parts[1].trim() : '';

      const prefix = "Why you're getting this result:";
      if (reason.startsWith(prefix)) {
        reason = reason.slice(prefix.length).trim();
      }

      contentElement.innerHTML = `
        <strong>Why you're getting this result:</strong> ${reason}
        ${suggestions ? `<br><br><strong>Suggestions:</strong> ${suggestions}` : ''}
      `;
    }

    const keywordListEl = document.getElementById("keyword-list");
    if (keywordListEl) {
      keywordListEl.remove();
    }
  }
}

export class FeedbackPresenter {
  async getFeedbackHistory() {
    try {
      const response = await fetch("https://capstone-himo.onrender.com/api/submissions");
      if (!response.ok) throw new Error("Failed to fetch feedback history");
      return await response.json();
    } catch (err) {
      console.error(err);
      return [];
    }
  }
}