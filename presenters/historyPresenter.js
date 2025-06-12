import { apiCall, authenticatedApiCall } from '../config.js';
import { renderHistoryDetail } from './historyDetailPresenter.js';

export function renderHistory() {
  fetch("views/historyView.html")
    .then((res) => {
      if (!res.ok) throw new Error("Failed to load historyView.html");
      return res.text();
    })
    .then((html) => {
      document.getElementById("app").innerHTML = html;
      console.log("History view loaded, initializing...");
      initializeHistory();
    })
    .catch((err) => {
      console.error("Error loading history view:", err);
      document.getElementById("app").innerHTML = `
        <div class="p-4 text-center">
          <h2 class="text-xl font-bold text-red-600">Error Loading History</h2>
          <p class="text-gray-600">Failed to load the history view: ${err.message}</p>
        </div>
      `;
    });
}

class HistoryPresenter {
  constructor(view) {
    this.view = view;
    this.allHistory = [];
    this.filteredHistory = {};
  }

  async loadHistory() {
    try {
      this.view.showLoading();
      const history = await authenticatedApiCall("/api/history");
      this.allHistory = history;
      const groupedFeedbacks = this.groupFeedbacksByPeriod(history);
      this.filteredHistory = groupedFeedbacks;
      this.view.renderHistory(groupedFeedbacks);
      this.setupFilterListener();
    } catch (error) {
      console.error('Failed to load feedback history:', error);
      this.view.renderError('Failed to load history data. Please try again.');
    }
  }

  setupFilterListener() {
    const filterDropdown = document.getElementById('filterDropdown');
    if (filterDropdown) {
      filterDropdown.addEventListener('change', (e) => {
        this.filterHistory(e.target.value);
      });
    }
  }

  groupFeedbacksByPeriod(feedbacks) {
    // Since DB timestamps are already in Jakarta timezone, use them directly
    const now = new Date();
    
    // Create date boundaries (date-only, no time)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    // Start of current week (Monday)
    const startOfWeek = new Date(today);
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; 
    startOfWeek.setDate(today.getDate() - daysToMonday);
    
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    
    // Last month boundaries
    const lastMonthStart = new Date(currentYear, currentMonth - 1, 1);
    const lastMonthEnd = new Date(currentYear, currentMonth, 0); 

    const grouped = {
      today: [],
      thisWeek: [],
      lastMonth: [],
      earlierThisYear: [],
      lastYear: [],
    };

    feedbacks.forEach(feedback => {
      // DB timestamp is already in Jakarta timezone, so use it directly
      const feedbackDate = new Date(feedback.created_at);
      
      // Create date-only version for comparison
      const feedbackDateOnly = new Date(
        feedbackDate.getFullYear(), 
        feedbackDate.getMonth(), 
        feedbackDate.getDate()
      );
      
      console.log('Original DB timestamp:', feedback.created_at, 'Parsed date:', feedbackDate, 'Date Only:', feedbackDateOnly);
      
      // Group by time periods
      if (feedbackDateOnly.getTime() === today.getTime()) {
        grouped.today.push(feedback);
      } else if (feedbackDateOnly.getTime() === yesterday.getTime()) {
        grouped.thisWeek.push(feedback);
      } else if (feedbackDateOnly >= startOfWeek && feedbackDateOnly < today) {
        grouped.thisWeek.push(feedback);
      } else if (feedbackDateOnly >= lastMonthStart && feedbackDateOnly <= lastMonthEnd) {
        grouped.lastMonth.push(feedback);
      } else if (feedbackDateOnly.getFullYear() === currentYear && feedbackDateOnly < lastMonthStart) {
        grouped.earlierThisYear.push(feedback);
      } else if (feedbackDateOnly.getFullYear() === currentYear - 1) {
        grouped.lastYear.push(feedback);
      } else {
        const yearKey = feedbackDateOnly.getFullYear().toString();
        if (!grouped[yearKey]) {
          grouped[yearKey] = [];
        }
        grouped[yearKey].push(feedback);
      }
    });

    return grouped;
  }

  filterHistory(filterValue) {
    console.log('Filtering by:', filterValue);
    if (filterValue === 'all') {
      this.view.renderHistoryContent(this.filteredHistory);
    } else {
      const filtered = {};
      if (this.filteredHistory[filterValue] && this.filteredHistory[filterValue].length > 0) {
        filtered[filterValue] = this.filteredHistory[filterValue];
      }
      this.view.renderHistoryContent(filtered);
    }
    this.setupFilterListener();
    const filterDropdown = document.getElementById('filterDropdown');
    if (filterDropdown) {
      filterDropdown.value = filterValue;
    }
  }

  getHistoryItem(historyId) {
    return this.allHistory.find(item => item.history_id === historyId);
  }

  searchHistory(searchTerm) {
    const searchResults = this.allHistory.filter(item =>
      item.text && item.text.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const groupedResults = this.groupFeedbacksByPeriod(searchResults);
    this.view.renderHistoryContent(groupedResults);
  }

  showDetail(historyId) {
    console.log('showDetail called with historyId:', historyId);
    renderHistoryDetail(historyId);
  }
}

class HistoryView {
  constructor() {
    this.container = null;
    this.presenter = null;
  }

  showLoading() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <main class="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-10">
        <div class="flex justify-center items-center py-12">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-700"></div>
          <span class="ml-3 text-gray-600">Loading your history...</span>
        </div>
      </main>
    `;
  }

  renderHistory(groupedFeedbacks) {
    const app = document.getElementById('app');
    app.innerHTML = `
      <main class="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-10 xl:py-20">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h1 class="text-2xl font-bold text-gray-600">Your History</h1>
          <div class="w-full sm:w-64 lg:w-48">
            <select id="filterDropdown" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-700 focus:border-transparent bg-white text-gray-500 text-sm">
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="thisWeek">This Week</option>
              <option value="lastMonth">Last Month</option>
              <option value="earlierThisYear">Earlier This Year</option>
              <option value="lastYear">Last Year</option>
            </select>
          </div>
        </div>
        <div id="historyContainer"></div>
      </main>
    `;
    this.renderHistoryContent(groupedFeedbacks);
  }

  renderHistoryContent(groupedFeedbacks) {
    const container = document.getElementById('historyContainer');
    if (!container) return;
    this.container = container;
    container.innerHTML = '';

    const sections = [
      { key: 'today', label: 'Today' },
      { key: 'thisWeek', label: 'This Week' },
      { key: 'lastMonth', label: 'Last Month' },
      { key: 'earlierThisYear', label: 'Earlier This Year' },
      { key: 'lastYear', label: 'Last Year' },
      ...Object.keys(groupedFeedbacks)
        .filter(key => !['today', 'thisWeek', 'lastMonth', 'earlierThisYear', 'lastYear'].includes(key))
        .sort((a, b) => b - a)
        .map(year => ({ key: year, label: year })),
    ];

    let hasContent = false;

    sections.forEach((section, index) => {
      const data = groupedFeedbacks[section.key];
      if (data && data.length > 0) {
        hasContent = true;
        const sectionId = `history-${section.key.toLowerCase().replace(/\s/g, '-')}`;
        const sectionHtml = `
          <div class="${index > 0 ? 'mt-12' : ''}">
            <h2 class="text-2xl font-semibold text-gray-600 mb-6">${section.label}</h2>
            <div id="${sectionId}" class="grid gap-4 md:gap-6"></div>
          </div>
        `;
        container.insertAdjacentHTML('beforeend', sectionHtml);
        this.renderSection(sectionId, data);
      }
    });

    if (!hasContent) {
      container.innerHTML = `
        <div class="text-center py-12">
          <div class="text-gray-400 mb-4">
            <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
          </div>
          <p class="text-gray-500 text-lg">No history entries found for this period.</p>
          <p class="text-gray-400 text-sm mt-2">Try selecting a different time period or check back later.</p>
        </div>
      `;
    }
  }

  renderSection(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    if (data.length === 0) {
      container.innerHTML = '<p class="text-gray-500 italic">Nothing to show here.</p>';
      return;
    }

    data.forEach(item => {
      const card = document.createElement('div');
      card.className = 'bg-white shadow-md rounded-xl p-6 hover:shadow-lg transition-all duration-200 cursor-pointer border border-gray-100';
      card.dataset.historyId = item.history_id;

      const stressPercentage = Math.round((item.stress_percent || 0) * 100) / 100;
      const stressLevel = item.stress_level || 'unknown';
      const emotion = item.emotion || 'neutral';
      const text = item.text || 'No description';
      
      // DB timestamp is already in Jakarta timezone, so use it directly
      const date = new Date(item.created_at);

      card.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <div class="flex-shrink-0">
              ${this.createDonutChart(stressPercentage)}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap items-center gap-2 mb-2">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${this.getStressLevelClass(stressLevel)}">
                  ${this.capitalizeFirst(stressLevel)} Stress
                </span>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${this.getEmotionClass(emotion)}">
                  ${this.capitalizeFirst(emotion)}
                </span>
              </div>
              <p class="text-sm text-gray-500 mb-2">${this.formatDate(date)}</p>
              <p class="text-gray-700 text-sm line-clamp-2">${text}</p>
            </div>
          </div>
          <div class="flex-shrink-0 ml-4">
            <svg class="w-6 h-6 text-violet-700 cursor-pointer detail-button" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-history-id="${item.history_id}">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </div>
        </div>
      `;

      container.appendChild(card);
    });

    this.attachDetailButtonListeners(containerId);
  }

  attachDetailButtonListeners(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const detailButtons = container.querySelectorAll('.detail-button');
    detailButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        const historyId = button.dataset.historyId;
        console.log('Detail button clicked for history ID:', historyId);
        this.presenter.showDetail(historyId);
      });
    });
  }

  renderError(message) {
    const app = document.getElementById('app');
    app.innerHTML = `
      <main class="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-10">
        <div class="text-center py-12">
          <div class="text-red-400 mb-4">
            <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
          </div>
          <p class="text-red-500 text-lg">${message}</p>
          <button onclick="window.location.reload()" class="mt-4 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors">
            Try Again
          </button>
        </div>
      </main>
    `;
  }

  createDonutChart(percentage) {
    const radius = (64 - 8) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    let strokeColor = '#10b981';
    if (percentage > 33 && percentage <= 66) {
      strokeColor = '#f59e0b';
    } else if (percentage > 66) {
      strokeColor = '#ef4444';
    }

    return `
      <div class="relative" style="width: 64px; height: 64px;">
        <svg width="64" height="64" class="transform -rotate-90">
          <circle cx="32" cy="32" r="${radius}" fill="none" stroke="#e5e7eb" stroke-width="4" />
          <circle cx="32" cy="32" r="${radius}" fill="none" stroke="${strokeColor}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${strokeDasharray}" stroke-dashoffset="${strokeDashoffset}" class="transition-all duration-300 ease-in-out" />
        </svg>
        <div class="absolute inset-0 flex items-center justify-center">
          <span class="text-gray-700 font-bold text-xs">${percentage.toFixed(1)}%</span>
        </div>
      </div>
    `;
  }

  getStressLevelClass(level) {
    const classes = {
      'Low': 'bg-green-100 text-green-800',
      'Medium': 'bg-yellow-200 text-yellow-800',
      'High': 'bg-red-100 text-red-800'
    };
    return classes[level] || 'bg-gray-100 text-gray-800';
  }

  getEmotionClass(emotion) {
    const classes = {
      'Overwhelmed': 'bg-blue-100 text-blue-800',
      'Lonely': 'bg-violet-100 text-violet-800',
      'Depressed': 'bg-rose-100 text-rose-800',
      'Panicked': 'bg-purple-100 text-purple-800',
      'Anxious': 'bg-cyan-100 text-cyan-800'
    };
    return classes[emotion] || 'bg-gray-100 text-gray-800';
  }

  capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  formatDate(date) {
    // DB timestamp is already in Jakarta timezone, so use it directly
    const now = new Date();
    
    // Create date-only versions for comparison
    const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const diffTime = todayOnly.getTime() - dateOnly.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    if (diffDays === 0) {
      return 'Today at ' + timeString;
    } else if (diffDays === 1) {
      return 'Yesterday at ' + timeString;
    } else if (diffDays > 1 && diffDays <= 7) {
      return date.toLocaleDateString([], { weekday: 'long' }) + ' at ' + timeString;
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }
}

const view = new HistoryView();
view.presenter = new HistoryPresenter(view);

function initializeHistory() {
  view.presenter.loadHistory();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeHistory();
  });
} else {
  initializeHistory();
}

export { HistoryPresenter, HistoryView, view };