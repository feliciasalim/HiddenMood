import { apiCall } from '../config.js';

export function renderArticles() {
  fetch("views/articlesView.html")
    .then((res) => {
      if (!res.ok) throw new Error("Failed to load articlesView.html");
      return res.text();
    })
    .then((html) => {
      document.getElementById("app").innerHTML = html;
      
      console.log("Articles view loaded, initializing...");
      initializeArticles();
      setupSearch();
    })
    .catch((err) => {
      console.error("Error loading articles view:", err);
      document.getElementById("app").innerHTML = `
        <div class="p-4 text-center">
          <h2 class="text-xl font-bold text-red-600">Error Loading Articles</h2>
          <p class="text-gray-600">Failed to load the articles view: ${err.message}</p>
        </div>
      `;
    });
}

// Global variables for search and filtering
window.allArticles = [];
window.filteredArticles = [];
window.currentPage = 1;
window.articlesPerPage = 12;

// Setup search functionality
function setupSearch() {
  // Add search bar to the articles section if it doesn't exist
  const articlesSection = document.querySelector('.articles-section');
  if (articlesSection && !document.getElementById('search-input')) {
    const searchHTML = `
      <div class="mb-6 max-w-md">
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>
          <input type="text" id="search-input" placeholder="Search articles..." 
                 class="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all duration-200">
          <button id="clear-search" class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 hidden">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div id="search-info" class="mt-2 text-sm text-gray-600 hidden">
          <span id="results-count"></span> articles found
        </div>
      </div>
    `;
    
    const titleElement = articlesSection.querySelector('h2');
    if (titleElement) {
      titleElement.insertAdjacentHTML('afterend', searchHTML);
    }
  }

  const searchInput = document.getElementById('search-input');
  const clearButton = document.getElementById('clear-search');
  
  if (searchInput) {
    searchInput.addEventListener('input', handleSearch);
  }
  
  if (clearButton) {
    clearButton.addEventListener('click', clearSearch);
  }
}

// Handle search input
function handleSearch(event) {
  const query = event.target.value.toLowerCase().trim();
  const clearButton = document.getElementById('clear-search');
  const searchInfo = document.getElementById('search-info');
  const resultsCount = document.getElementById('results-count');
  
  // Show/hide clear button
  if (query && clearButton) {
    clearButton.classList.remove('hidden');
  } else if (clearButton) {
    clearButton.classList.add('hidden');
  }
  
  // Show/hide search info
  if (query && searchInfo) {
    searchInfo.classList.remove('hidden');
  } else if (searchInfo) {
    searchInfo.classList.add('hidden');
  }
  
  // Filter articles
  if (query === '') {
    window.filteredArticles = window.allArticles;
  } else {
    window.filteredArticles = window.allArticles.filter(article => 
      (article.title && article.title.toLowerCase().includes(query)) ||
      (article.article_intro && article.article_intro.toLowerCase().includes(query))
    );
  }
  
  // Update results count
  if (resultsCount) {
    resultsCount.textContent = window.filteredArticles.length;
  }
  
  // Reset to first page
  window.currentPage = 1;
  
  // Render results
  renderArticleCards(window.filteredArticles);
}

// Clear search
function clearSearch() {
  const searchInput = document.getElementById('search-input');
  const clearButton = document.getElementById('clear-search');
  const searchInfo = document.getElementById('search-info');
  
  if (searchInput) searchInput.value = '';
  if (clearButton) clearButton.classList.add('hidden');
  if (searchInfo) searchInfo.classList.add('hidden');
  
  window.filteredArticles = window.allArticles;
  window.currentPage = 1;
  renderArticleCards(window.filteredArticles);
}

// Enhanced initialization with better error handling
async function initializeArticles() {
  const container = document.getElementById("articles-container");
  
  try {
    // Show loading indicator
    if (container) {
      container.innerHTML = `
        <div class="flex justify-center items-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-700"></div>
          <span class="ml-2 text-gray-600">Loading articles...</span>
        </div>
      `;
    }
    
    console.log("Fetching articles...");
    const articles = await fetchArticles();
    
    console.log("Received articles:", {
      count: articles.length,
      sample: articles.slice(0, 2)
    });

    if (!articles || articles.length === 0) {
      console.log("No articles received");
      if (container) {
        container.innerHTML = `
          <div class="text-center py-8">
            <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6-4h6"></path>
            </svg>
            <h3 class="text-lg font-semibold text-gray-700">No Articles Available</h3>
            <p class="text-gray-500">Check back later for new content!</p>
          </div>
        `;
      }
      return;
    }

    // Store articles globally for search and pagination
    window.allArticles = articles;
    window.filteredArticles = articles;
    window.currentPage = 1;
    
    console.log("Rendering article cards...");
    renderArticleCards(articles);
    
  } catch (error) {
    console.error("Error initializing articles:", error);
    if (container) {
      container.innerHTML = `
        <div class="text-center py-8">
          <div class="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
            <svg class="mx-auto h-12 w-12 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <h3 class="text-lg font-semibold text-red-600 mb-2">Failed to Load Articles</h3>
            <p class="text-gray-600 mb-4">${error.message}</p>
            <button onclick="location.reload()" class="px-4 py-2 bg-violet-700 text-white rounded-lg hover:bg-violet-800 transition-colors duration-200">
              Try Again
            </button>
          </div>
        </div>
      `;
    }
  }
}

// Enhanced fetch function with better error handling
async function fetchArticles() {
  try {
    console.log("Making API call to /api/articles...");
    const articles = await apiCall("/api/articles");
    
    console.log("API call successful:", {
      isArray: Array.isArray(articles),
      length: articles?.length || 0
    });
    
    return Array.isArray(articles) ? articles : [];
    
  } catch (error) {
    console.error("Error fetching articles:", error);
    
    // Try to provide more specific error information
    if (error.message.includes('fetch')) {
      throw new Error('Unable to connect to server. Please check if the backend is running.');
    } else if (error.message.includes('JSON')) {
      throw new Error('Server returned invalid data format.');
    } else {
      throw new Error(`Failed to load articles: ${error.message}`);
    }
  }
}

// Enhanced render function with responsive design and better styling
function renderArticleCards(articles) {
  const container = document.getElementById("articles-container");
  if (!container) {
    console.error("Articles container not found in DOM");
    return;
  }

  try {
    // Update container classes for responsive grid
    container.className = "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 justify-items-start";
    
    // Show no results message if needed
    if (articles.length === 0) {
      container.innerHTML = `
        <div class="col-span-full text-center py-12">
          <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6"></path>
          </svg>
          <h3 class="text-lg font-medium text-gray-700 mb-2">No articles found</h3>
          <p class="text-gray-500">Try searching with different keywords</p>
        </div>
      `;
      document.getElementById('pagination').innerHTML = '';
      return;
    }
    
    container.innerHTML = "";
    
    const start = (window.currentPage - 1) * window.articlesPerPage;
    const end = start + window.articlesPerPage;
    const paginatedArticles = articles.slice(start, end);

    console.log(`Rendering ${paginatedArticles.length} articles (page ${window.currentPage})`);

    paginatedArticles.forEach((article, index) => {
      try {
        const card = document.createElement("div");
        card.className = "w-full max-w-sm bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100";
        
        // Handle missing or invalid image URLs
        const imageUrl = article.img && article.img.trim() 
          ? article.img 
          : 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=300&h=200&fit=crop';
        
        // Handle missing or invalid article links
        const articleLink = article.article_link && article.article_link.trim()
          ? article.article_link
          : '#';
        
        // Truncate long titles and intros for mobile responsiveness
        const title = article.title ? 
          (article.title.length > 60 ? article.title.substring(0, 60) + '...' : article.title) 
          : 'Untitled Article';
        
        const intro = article.article_intro ? 
          (article.article_intro.length > 120 ? article.article_intro.substring(0, 120) + '...' : article.article_intro)
          : 'No description available';

        card.innerHTML = `
          <div class="relative overflow-hidden">
            <img src="${imageUrl}" alt="${title}" 
                 class="w-full h-48 object-cover transition-transform duration-300 hover:scale-105" 
                 onerror="this.src='https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=300&h=200&fit=crop'">
          </div>
          <div class="p-5">
            <h3 class="text-lg font-bold text-gray-800 mb-3 leading-tight">${title}</h3>
            <p class="text-sm text-gray-600 mb-4 leading-relaxed">${intro}</p>
            ${articleLink !== '#' ? 
              `<a href="${articleLink}" 
                 class="inline-flex items-center text-sm font-medium text-violet-600 hover:text-violet-800 transition-colors duration-200" 
                 target="_blank" rel="noopener">
                  Read More 
                  <svg class="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                  </svg>
               </a>` :
              `<span class="text-sm text-gray-400">Link not available</span>`
            }
          </div>
        `;
        
        container.appendChild(card);
      } catch (cardError) {
        console.error(`Error rendering article card ${index}:`, cardError, article);
      }
    });

    renderPagination(articles);
    
  } catch (error) {
    console.error("Error in renderArticleCards:", error);
    container.innerHTML = `
      <div class="col-span-full text-center py-8">
        <p class="text-red-600">Error displaying articles</p>
      </div>
    `;
  }
}

// Enhanced pagination with better styling and mobile responsiveness
function renderPagination(articles) {
  const totalPages = Math.ceil(articles.length / window.articlesPerPage);
  const pagination = document.getElementById("pagination");
  
  if (!pagination) {
    console.error("Pagination element not found");
    return;
  }

  if (totalPages <= 1) {
    pagination.innerHTML = "";
    pagination.style.paddingBottom = "3rem"; // Add space below even when no pagination
    return;
  }

  pagination.innerHTML = "";
  pagination.className = "flex flex-wrap justify-center items-center gap-2 mt-8 pb-12";

  // Previous button
  if (window.currentPage > 1) {
    const prevButton = document.createElement("button");
    prevButton.innerHTML = `
      <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
      </svg>
      <span class="hidden sm:inline">Previous</span>
    `;
    prevButton.className = "inline-flex items-center px-3 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200";
    prevButton.addEventListener("click", () => {
      window.currentPage--;
      renderArticleCards(window.filteredArticles);
    });
    pagination.appendChild(prevButton);
  }

  // Page numbers (show fewer on mobile)
  const isMobile = window.innerWidth < 640;
  const maxVisiblePages = isMobile ? 3 : 5;
  const startPage = Math.max(1, window.currentPage - Math.floor(maxVisiblePages / 2));
  const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  // First page and ellipsis
  if (startPage > 1) {
    const firstButton = createPageButton(1);
    pagination.appendChild(firstButton);
    
    if (startPage > 2) {
      const ellipsis = document.createElement("span");
      ellipsis.textContent = "...";
      ellipsis.className = "px-2 text-gray-500";
      pagination.appendChild(ellipsis);
    }
  }

  // Page range
  for (let i = startPage; i <= endPage; i++) {
    const button = createPageButton(i, i === window.currentPage);
    pagination.appendChild(button);
  }

  // Last page and ellipsis
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const ellipsis = document.createElement("span");
      ellipsis.textContent = "...";
      ellipsis.className = "px-2 text-gray-500";
      pagination.appendChild(ellipsis);
    }
    
    const lastButton = createPageButton(totalPages);
    pagination.appendChild(lastButton);
  }

  // Next button
  if (window.currentPage < totalPages) {
    const nextButton = document.createElement("button");
    nextButton.innerHTML = `
      <span class="hidden sm:inline">Next</span>
      <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
      </svg>
    `;
    nextButton.className = "inline-flex items-center px-3 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200";
    nextButton.addEventListener("click", () => {
      window.currentPage++;
      renderArticleCards(window.filteredArticles);
    });
    pagination.appendChild(nextButton);
  }

  // Page info (mobile-friendly)
  const pageInfo = document.createElement("div");
  pageInfo.textContent = `Page ${window.currentPage} of ${totalPages}`;
  pageInfo.className = "text-sm text-gray-500 mt-2 w-full text-center sm:w-auto sm:mt-0 sm:ml-4";
  pagination.appendChild(pageInfo);
}

// Helper function to create page buttons
function createPageButton(pageNum, isActive = false) {
  const button = document.createElement("button");
  button.textContent = pageNum;
  button.className = `px-3 py-2 text-sm rounded-lg transition-all duration-200 font-medium ${
    isActive 
      ? "bg-violet-600 text-white shadow-md" 
      : "bg-white text-gray-700 hover:bg-violet-50 hover:text-violet-600 border border-gray-200"
  }`;
  button.addEventListener("click", () => {
    window.currentPage = pageNum;
    renderArticleCards(window.filteredArticles);
  });
  return button;
}