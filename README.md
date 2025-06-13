# Hidden Mood Website

Hidden Mood (HiMO) is a machine learning-based web application developed by the CC25-CF050 team for the Coding Camp powered by DBS Foundation 2025 under the theme Health Innovation. 
Built by five developers from the Machine Learning (ML) and Front-End/Back-End (FEBE) tracks, HiMO addresses mental health challenges through early stress and emotion detection. 
The application is accessible at [https://hiddenmood.netlify.app/](https://hiddenmood.netlify.app/).

## Table of Contents

* [Background](#background)
* [Goal & Aim](#goal--aim)
* [Installation & Deployment](#installation--deployment)
* [How Hidden Mood Works - Stress and Emotion Detection](#how-hidden-mood-works---stress-and-emotion-detection)
* [Plans & Realization](#plans--realization)
* [Market Analysis](#market-analysis)
* [Bibliography](#bibliography)
  * [A. Resources](#b-resources)
  * [B. Academic Papers](#c-academic-papers)
  * [C. References](#d-references)
* [Developers](#developers)

---

## Background

Mental health is a growing global concern, particularly among teenagers and young adults, with over 60% experiencing anxiety and depression, often undetected due to stigma and limited access to services \[5]. HiMO uses machine learning to analyze text inputs, detect stress and emotional states early, and provide personalized video recommendations, suggestions, and mental health articles. This aligns with Sustainable Development Goal (SDG) 3: Good Health and Well-Being, promoting mental health awareness and professional support.

## Goal & Aim

HiMO aims to:

* Enable early detection of stress and emotional states via text analysis.
* Provide personalized video recommendations and suggestions to support mental well-being.
* Offer educational mental health articles for self-awareness.
* Support SDG 3 by fostering mental health literacy and encouraging professional consultations.
* Bridge the gap in mental health care accessibility, particularly for young adults.

## Installation & Deployment

To set up HiMO locally:

* Clone the Repository:

```bash
git clone https://github.com/feliciasalim/hiddenmood.git
```

* Create a `.env` file in the root directory with your environment variables.
* Adjust the port number as needed in your configuration.
* Run the server:

```bash
npm run server
```

* Open your local port in the browser to access the app.

## How Hidden Mood Works - Stress and Emotion Detection

HiMO analyzes user text to detect stress and emotional states:

1. **Text Input**: Users submit text via the web interface.
2. **Preprocessing**: Tokenization, lemmatization, padding, and labeling using the Empath library.
3. **Data Augmentation**: Enhances model performance.
4. **Prediction**: A Bidirectional LSTM model (TensorFlow) classifies stress and emotion levels.
5. **Recommendations**: Content-based filtering (TF-IDF, Cosine Similarity) suggests relevant videos.
6. **Suggestions**: Vertex AI provides personalized advice.
7. **Output**: Displays stress/emotion levels, recommendations, and articles.

### System Separation

* **Machine Learning (ML)**: Deployed on **Google Cloud Platform (GCP)** using FastAPI for model serving and inference. Access via [HiddenMood-ML](https://github.com/feliciasalim/HiddenMood-ML) 
* **Front-End/Back-End (FEBE)**: Developed with **Vite** and **Express.js**, using **Supabase** as the database and **Tailwind CSS** for styling.

## Plans & Realization

The project used SWOT analysis to identify strengths, weaknesses, opportunities, and threats. A Gantt Chart, created with ProjectLibre, tracks tasks (available in the repository). The project is 100% complete per the project plan. Future enhancements include:

* Direct psychologist consultations.
* Interactive chatbot integration.
* Multi-language support.

## Market Analysis

### Target Market

HiMO targets teenagers and young adults (e.g., students, fresh graduates, freelancers, content creators) facing academic, professional, and social pressures. This group often expresses emotions via social media (e.g., Twitter threads, journaling) and seeks reflective activities like self-healing content or light psychological tests. Over 70% of teens report stress from academic and social expectations, yet many lack access to professional care due to stigma or resource limitations \[3]. HiMO’s text-based, private, and user-friendly approach aligns with their digital habits, offering early stress detection and educational content.

### Comparison with Existing Solutions

Unlike chatbots (e.g., Wysa, Mindtera), HiMO focuses on text analysis for stress/emotion detection, offering video recommendations, articles, and suggestions rather than conversational interaction. This unique combination enhances accessibility and education.

## Bibliography

### A. Resources

* **Languages**: Python, JavaScript
* **Frameworks**: FastAPI (ML), Express.js (BE), Vite (FE)
* **Libraries**: TensorFlow, Empath, scikit-learn
* **Styling**: Tailwind CSS
* **Database**: Supabase (FEBE)
* **Deployment**: GCP (ML), Vercel (FE)
* **Tools**: Streamlit (inference), Figma (mockup)

### B. Academic Papers

* \[1] H. Said et al., "Text-Based Emotion Detection Using Deep Learning," SENAMIKA, vol. 3, no. 1, pp. 158-168, Apr. 2022.
* \[2] M. H. D. Barang and S. K. Saptomo, "Sentiment Analysis for Mental Health Applications," J-SIL, vol. 4, no. 1, pp. 13-24, Apr. 2019.

### C. References

* \[3] American Institute of Stress: [https://www.stress.org/who-gets-stressed/teens-young-adults/](https://www.stress.org/who-gets-stressed/teens-young-adults/)
* \[4] University of Rochester Medical Center: [https://www.urmc.rochester.edu/encyclopedia/content?ContentTypeID=1\&ContentID=4552](https://www.urmc.rochester.edu/encyclopedia/content?ContentTypeID=1&ContentID=4552)
* \[5] WHO: [https://www.who.int/news-room/fact-sheets/detail/mental-health-strengthening-our-response](https://www.who.int/news-room/fact-sheets/detail/mental-health-strengthening-our-response)
* \[6] ScienceDirect: [https://www.sciencedirect.com/topics/social-sciences/mental-health-policy](https://www.sciencedirect.com/topics/social-sciences/mental-health-policy)
* \[7] PMC: [https://pmc.ncbi.nlm.nih.gov/articles/PMC1525068/](https://pmc.ncbi.nlm.nih.gov/articles/PMC1525068/)
* \[8] NICE: [https://www.nice.org.uk/news/articles/App-based-treatment-for-people-with-insomnia-an-effective-alternative-to-sleeping-pills](https://www.nice.org.uk/news/articles/App-based-treatment-for-people-with-insomnia-an-effective-alternative-to-sleeping-pills)
* \[9] NHS: [https://www.england.nhs.uk/mental-health/case-studies/limbic-access/](https://www.england.nhs.uk/mental-health/case-studies/limbic-access/)
* \[10] Australian Government: [https://www.health.gov.au/ministers/the-hon-mark-butler-mp/media/delivering-high-quality-free-digital-mental-health-supports](https://www.health.gov.au/ministers/the-hon-mark-butler-mp/media/delivering-high-quality-free-digital-mental-health-supports)
* \[11] MHCC: [https://mentalhealthcommission.ca/what-we-do/e-mental-health/](https://mentalhealthcommission.ca/what-we-do/e-mental-health/)

## Developers

**Coding Camp powered by DBS Foundation 2025**
**CC25-CF050 Team**

* (ML) MC319D5X0761 - Felicia Salim - Universitas Sumatera Utara
* (ML) MC319D5X0793 - Nur Adilah - Universitas Sumatera Utara
* (ML) MC012D5Y1825 - Muhammad Haifan Ghani - Universitas Telkom
* (FEBE) FC325D5Y0730 - Gary Anderson Theng - Universitas Tarumanagara
* (FEBE) FC012D5Y1749 - M Rivaldo Destadhio Hamzah - Universitas Telkom
