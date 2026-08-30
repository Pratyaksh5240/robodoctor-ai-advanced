# 🩺 RoboDoctor AI

### AI-Powered Personal Health Assistant & Intelligent Health Screening Platform

<p align="center">
  <strong>Predict • Understand • Recommend • Protect</strong>
</p>

<p align="center">
  RoboDoctor AI is a full-stack healthcare technology platform that combines
  Machine Learning, Generative AI, recommendation systems, multimodal AI,
  NLP-based symptom processing, and cloud technologies to provide intelligent
  health screening and assistance.
</p>

<p align="center">
  <a href="https://robodoctor.vercel.app">🌐 Live Demo</a> •
  <a href="https://github.com/Pratyaksh5240/robodoctor-ai-advanced">💻 GitHub</a> •
  <a href="https://robodoctor.onrender.com/health">🧠 ML API</a>
</p>

---

## 🚀 Overview

RoboDoctor AI is designed to bring multiple health-related capabilities into
a single platform instead of forcing users to rely on separate applications
for symptoms, vital screening, reports, reminders, and healthcare discovery.

The platform combines specialized technologies for specialized problems:

- **Machine Learning** for structured vital-risk screening
- **Generative AI** for conversational health assistance
- **Content-Based Recommendation** for personalized recommendations
- **Cosine Similarity** for recommendation relevance ranking
- **Multimodal AI** for skin-image screening
- **NLP-style symptom extraction** for converting free-text symptoms into structured signals
- **Safety / Priority Logic** for red-flag detection
- **Firebase** for authentication and cloud data
- **Browser Geolocation + Google Maps** for nearby healthcare discovery
- **Web notification infrastructure** for health reminders

> ⚠️ **Medical Disclaimer:** RoboDoctor AI is an educational and technology
> prototype. It is not a medical diagnosis system and does not replace
> qualified healthcare professionals or emergency medical services.

---

# 🎯 Problem Statement

Healthcare information is often fragmented across multiple applications.

A user may have:

- Symptoms
- Vital signs
- Laboratory values
- Skin concerns
- Health questions
- Medication schedules
- Emergency contacts
- Healthcare-location needs

but these are often handled independently.

### Our objective

> **Build a unified intelligent health platform that transforms different
> types of health information into understandable, personalized, and
> safety-oriented health assistance.**

RoboDoctor AI addresses this problem by combining AI, Machine Learning,
recommendation systems, and healthcare utilities into one platform.

---

# ✨ Key Features

## ❤️ 1. AI Vital Check

The Vital Check module analyzes structured health information including:

- Age
- Weight
- Height
- BMI
- Blood Pressure
- Blood Sugar
- Heart Rate
- Symptoms

### Machine Learning

Current prototype:

- **Problem:** Supervised multiclass classification
- **Algorithm:** Gradient Boosting Classifier
- **Dataset:** 2,000 synthetic records
- **Features:** 20
- **Classes:** Low / Moderate / High
- **Model Serialization:** Joblib

### Prototype Evaluation

| Metric | Result |
|---|---:|
| Dataset Size | **2,000 records** |
| Features | **20** |
| Risk Classes | **3** |
| Test Accuracy | **91.50%** |
| Precision | **91.62%** |
| Recall | **91.50%** |
| F1 Score | **91.46%** |

> These metrics are based on the synthetic prototype dataset and should not
> be interpreted as clinical accuracy.

### Vital Check Pipeline

```text
User Input
    ↓
Input Validation
    ↓
BMI Calculation
    ↓
Symptom Feature Extraction
    ↓
Feature Preparation
    ↓
Gradient Boosting Model
    ↓
Risk Prediction + Probabilities
    ↓
Safety / Priority Layer
    ↓
Recommendation Engine
    ↓
Personalized Result