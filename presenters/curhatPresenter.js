import { apiCall } from '../config.js';

export function renderCurhat() {
  fetch("views/curhat.html")
    .then((res) => {
      if (!res.ok) throw new Error("Failed to load curhat.html");
      return res.text();
    })
    .then((html) => {
      document.getElementById("app").innerHTML = html;

      const usernameSpan = document.getElementById("username");
      const user = JSON.parse(sessionStorage.getItem("user") || "{}");
      const username = user.name || "User";
      if (usernameSpan) usernameSpan.textContent = username;

      const logoutLink = document.querySelector(".nav-links a[href='#']");
      if (logoutLink) {
        logoutLink.addEventListener("click", (e) => {
          e.preventDefault();
          if (window.logout) {
            window.logout();
          }
        });
      }

      const submitButton = document.getElementById("submitCurhat");
      const curhatInput = document.getElementById("curhatInput");
      const result = document.getElementById("result");

      if (!submitButton || !curhatInput) {
        console.warn("Required form elements not found in curhat.html.");
        return;
      }

      submitButton.addEventListener("click", async () => {
        const text = curhatInput.value.trim();
        const user = JSON.parse(sessionStorage.getItem("user") || "{}");
        const user_id = user.user_id || null;

        if (!text) {
          alert("Please enter your text.");
          return;
        }

        if (text.length < 50) {
          alert("Please enter at least 50 characters.");
          return;
        }

        console.log("Submitting text:", text.substring(0, 50) + "...");
        console.log("User ID:", user_id);

        showLoading();

        try {
          const result = await apiCall('/api/curhat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(sessionStorage.getItem('token') && {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
              })
            },
            body: JSON.stringify({ 
              text: text,
              user_id: user_id 
            }),
          });

          console.log("Backend Response received:", result);

          if (!result || typeof result !== 'object') {
            throw new Error('Invalid response format from server');
          }

          const enhancedResult = {
            user_input: text,
            predicted_emotion: result.predicted_emotion || { label: 'neutral' },
            predicted_stress: result.predicted_stress || { label: 'medium' },
            stress_level: result.stress_level || { stress_level: 50 },
            analysis: result.analysis || 'Analysis completed successfully.',
            keywords: result.keywords || [],
            recommended_videos: result.recommended_videos || { recommendations: [] },
            timestamp: new Date().toISOString(),
            saved_to_history: result.saved_to_history || false
          };

          console.log("Enhanced result object:", enhancedResult);

          sessionStorage.setItem("curhatResult", JSON.stringify(enhancedResult));
          
          curhatInput.value = "";

          if (window.loadView) {
            console.log("Navigating to feedback view");
            window.loadView("feedback");
          } else {
            console.error("window.loadView function not found");
          }

        } catch (error) {
          console.error("Error occurred:", error);
          
          let errorMessage = "Failed to process your submission. ";
          
          if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            errorMessage += "Please check if your backend server is running on localhost:5001.";
          }
          else if (error.message.includes('timeout')) {
            errorMessage += "The request timed out. The ML API might be slow to respond. Please try again.";
          }
          else if (error.message.includes('ML API')) {
            errorMessage += "There was an issue with the ML analysis service. Please try again later.";
          }
          else {
            errorMessage += `Details: ${error.message}`;
          }
          
          alert(errorMessage);
          
        } finally {
          hideLoading();
        }
      });
    })
    .catch((error) => {
      console.error("Error loading curhat view:", error);
    });
}

function showLoading() {
  const spinner = document.getElementById("spinner");
  if (spinner) {
    spinner.classList.remove("hidden");
  }
  
  const submitButton = document.getElementById("submitCurhat");
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Processing...";
  }
}

function hideLoading() {
  const spinner = document.getElementById("spinner");
  if (spinner) {
    spinner.classList.add("hidden");
  }
  
  const submitButton = document.getElementById("submitCurhat");
  if (submitButton) {
    submitButton.disabled = false;
    submitButton.textContent = "Submit";
  }
}