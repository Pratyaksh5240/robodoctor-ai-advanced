# 🩺 RoboDoctor AI — Hybrid Computer-Vision & Intelligent Health Platform

### AI-Powered Personal Health Assistant & Dermoscopic Skin Screening Platform

<p align="center">
  <strong>Predict • Understand • Screen • Recommend • Protect</strong>
</p>

<p align="center">
  RoboDoctor AI is an advanced full-stack healthcare technology platform that combines
  PyTorch Deep Learning Computer Vision (HAM10000 dataset), Machine Learning vital risk screening,
  Generative AI, multimodal symptom fusion, 7-language global i18n, and cloud technologies to provide intelligent
  health screening and medical guidance.
</p>

<p align="center">
  <a href="https://robodoctor-ai-advanced.vercel.app">🌐 Live App on Vercel</a> •
  <a href="https://github.com/Pratyaksh5240/robodoctor-ai-advanced">💻 GitHub Repository</a> •
  <a href="http://127.0.0.1:8000/docs">🧠 FastAPI ML Docs</a>
</p>

---

## 🚀 What's New in RoboDoctor AI Advanced

- **🔬 Hybrid Computer-Vision Skin Screening (HAM10000 / ISIC 2018)**: Upgraded from single-class image analysis to a full PyTorch 7-class dermoscopic pattern classifier (*Melanoma, Melanocytic Nevus, Basal Cell Carcinoma, Actinic Keratosis, Benign Keratosis, Dermatofibroma, Vascular Lesion*).
- **🛡️ Quality & Uncertainty Guardrails**: Automated image blur & darkness pre-screening, top-1 probability uncertainty thresholding (< 0.45), high-risk red-flag detection, and symptom fusion.
- **🌍 7-Language Global i18n**: Real-time instant language translation across all 19 subpages in **English, Hindi, Spanish (`es`), French (`fr`), German (`de`), Chinese (`zh`), and Korean (`ko`)**.
- **🌙 Permanent Dark Mode**: High-contrast, WCAG AAA compliant dark theme design across all cards, badges, and interfaces.
- **🧘‍♂️ Yoga & Fitness Video Search Engine**: Interactive search input, category filter pills, push-ups / upper-body workout videos, abs, cardio, and 100% verified embeddable YouTube video players.

> ⚠️ **Medical Disclaimer:** RoboDoctor AI is an educational and technology prototype intended for screening guidance only. It is not a clinical medical diagnosis system and does not replace qualified healthcare professionals or emergency medical services.

---

## ✨ Key Features & Modules

### 🩺 1. Hybrid Computer-Vision Skin Check (`/skin-check`)
- **Dataset**: HAM10000 (10,015 dermoscopic images across 7 official classes).
- **Architecture**: PyTorch CNN Deep Learning Model + FastAPI Backend.
- **Classes**:
  1. `mel`: Melanoma (High Risk)
  2. `nv`: Melanocytic Nevus (Benign Mole)
  3. `bcc`: Basal Cell Carcinoma (High Risk)
  4. `akiec`: Actinic Keratosis (Pre-cancerous)
  5. `bkl`: Benign Keratosis (Solar Lentigo / Seborrheic)
  6. `df`: Dermatofibroma (Benign Spot)
  7. `vasc`: Vascular Lesion (Blood Vessel Spot)
- **Symptom Fusion**: Integrates pain, bleeding, rapid spread, duration (> 2 weeks), and fever into triage severity and dynamic precautions.

---

### ❤️ 2. AI Vital Check (`/health-check`)
- **Framingham & ML Screening**: Analyzes Age, Gender, Weight, Height, BMI, Systolic/Diastolic BP, Fasting Sugar, Heart Rate, and symptoms.
- **Gradient Boosting Classifier**: Predicts structured risk levels (*Low / Moderate / High*) backed by probability scoring and red-flag alerts.

---

### 🚨 3. Emergency Guide & Red Flags (`/emergency-guide`)
- Categorized safety guidance separating self-care symptoms from urgent doctor reviews and immediate emergency room situations.

---

### 📊 4. My Reports & Cloud History (`/reports`)
- Firestore-backed historical dashboard tracking vital risk trends, skin lesion screenings, and past report metrics for signed-in users.

---

### 🧘‍♂️ 5. Yoga, Exercise & Recovery Search (`/yoga-videos`)
- Search bar & search button supporting queries like `"pushup"`, `"back pain"`, `"weight loss"`, `"abs"`, `"stretching"`, `"sleep"`, and `"stress"`.
- Verified YouTube embeds for push-ups (`IODxDxX7oi4`), abs (`1919eTCoESo`), fat burn (`gC_L9qAHVJ8`), and back pain (`XeXz8fIZDCE`).

---

### 🧪 6. Additional Healthcare Utilities
- **Drug Interaction & Safety Checker (`/medicine-checker`)**: Evaluates multi-medicine combinations for dangerous drug-drug interactions, severe bleeding risks, mechanism breakdowns, warning symptoms, timing advice, and food/alcohol administration warnings.
- **Lab Report Analyzer (`/lab-report`)**: Interprets blood sugar, HbA1c, hemoglobin, TSH, and cholesterol.
- **Diet Planner (`/diet-planner`)**: Structured meal guidelines for hypertension, diabetes, heart health, and weight management.
- **Smart Reminders (`/medicine-reminder`)**: Medication, water intake, daily walk, and vital check planners.
- **Nearby Care (`/nearby-care`)**: Browser geolocation + Google Maps discovery for nearby hospitals, clinics, pharmacies, and emergency rooms.
- **AI Chatbot (`/ai-chatbot`)**: Guided conversational symptom evaluation.
- **First Aid & Emergency Contacts (`/first-aid`, `/emergency-contacts`, `/basic-medicines`)**: Step-by-step emergency first-aid guides, OTC medicine awareness, and quick-dial contacts.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS |
| **Styling & Theme** | Permanent High-Contrast Dark Mode |
| **Internationalization** | Custom 7-Language Global i18n (`lib/uiI18n.ts`, `LanguageContext.tsx`) |
| **ML / Vision Backend** | Python 3.13, FastAPI, PyTorch, Scikit-Learn, OpenCV |
| **Database & Auth** | Firebase Authentication, Firestore Cloud Database |
| **Deployment** | Vercel (Frontend), Uvicorn / FastAPI (ML Backend) |

---

## 💻 Local Setup & Installation

### 1. Clone Repository & Install Dependencies
```bash
git clone https://github.com/Pratyaksh5240/robodoctor-ai-advanced.git
cd robodoctor-ai-advanced/robodoctor-ai
npm install
```

### 2. Run Next.js Frontend
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Run FastAPI Python ML Backend
```bash
cd ../ml
python -m uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload
```
Interactive API documentation will be live at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

---

## 📜 License & Acknowledgments
- **Dataset**: HAM10000 / ISIC 2018 Task 3 Dataset (Tschandl et al., 2018).
- **Developed for**: RoboDoctor AI Advanced Health Platform.