import { NextRequest, NextResponse } from "next/server";
import { translateUi, Language } from "@/lib/uiI18n";
import { connectToDatabase } from "@/lib/db/mongodb";
import ChatMessageModel from "@/lib/models/ChatMessage";

export const runtime = "nodejs";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

const SYSTEM_INSTRUCTION = `
You are RoboDoctor AI's primary health chat assistant.
Provide clear, cautious, educational health information and practical next-step guidance.

STRICT MEDICAL SAFETY & COMMUNICATION RULES:
1. Provide educational health information only. Do NOT claim certainty or pretend to be a doctor giving a formal diagnosis.
2. Use phrases like: "Based on what you've shared...", "Possible explanations include...", "Consider discussing this with a healthcare professional...".
3. NEVER say "You definitely have...", "You are diagnosed with...", or prescribe restricted medications.
4. URGENT SAFETY: If the user describes emergency symptoms (such as severe chest pain, difficulty breathing/shortness of breath, fainting, severe neurological symptoms, or heavy bleeding), prioritize an urgent safety message advising immediate emergency medical care.
5. LANGUAGE: Respond in the exact language requested by the user or specified in the language system prompt parameter.
6. CONTEXT: Consider the prior conversation history to answer follow-up questions accurately.
`.trim();

export function getEnhancedBotFallback(input: string, language: string): string {
  const raw = input.trim();
  const text = raw.toLowerCase().replace(/[?!.,;:'"]/g, " ").replace(/\s+/g, " ").trim();
  const lang = (language || "en") as Language;

  const loc = (en: string, hi: string) => {
    if (lang === "hi") return hi;
    return translateUi(en, lang);
  };

  // 1. "HOW ARE YOU" & WELLBEING INQUIRIES ("how r u", "how are you", "kaise ho", etc.)
  if (
    /\b(how\s+(r|are)\s*(u|you)|how\s+do\s+you\s+do|how('s|s)\s+it\s+going|kaise\s+ho|kya\s+haal|kaisa\s+hai|aap\s+kaise)\b/i.test(text)
  ) {
    return loc(
      "Hello! I am doing great, thank you for asking! 😊 I'm RoboDoctor AI, your 24/7 personal health assistant.\n\nHow are you feeling today? Are you experiencing any symptoms (such as fever, cough, headache, or pain), or do you have a question about medications or vitals (like BP or sugar)?",
      "नमस्ते! मैं बहुत अच्छा हूँ, पूछने के लिए धन्यवाद! 😊 मैं RoboDoctor AI, आपका 24/7 स्वास्थ्य सहायक हूँ।\n\nआज आप कैसा महसूस कर रहे हैं? क्या आप कोई लक्षण (जैसे बुखार, सिरदर्द, खांसी या दर्द) अनुभव कर रहे हैं, या दवाओं/वाइटल्स (BP या शुगर) के बारे में कोई सवाल है?"
    );
  }

  // 2. USER GREETINGS & HELLOS ("hlo", "hello", "hi", "hey", "namaste", etc.)
  const greetingPatterns = [
    /^h[el]+o+$/i,
    /^h+i+$/i,
    /^h+e+y+$/i,
    /^greetings/i,
    /^namaste/i,
    /^pranam/i,
    /^hola/i,
    /^bonjour/i,
    /^hallo/i,
    /^good\s*(morning|afternoon|evening|day)/i,
    /^whats?\s*up/i,
    /^sup$/i,
  ];

  if (greetingPatterns.some((pattern) => pattern.test(text))) {
    return loc(
      "Hello! 👋 I am RoboDoctor AI, your smart health assistant. How can I help you today? You can ask me about your symptoms (like fever, headache, body pain), vital readings (BP, sugar, heart rate), medications, or everyday health tips.",
      "नमस्ते! 👋 मैं RoboDoctor AI स्वास्थ्य सहायक हूँ। आज मैं आपकी क्या मदद कर सकता हूँ? आप मुझसे अपने लक्षणों (जैसे बुखार, सिरदर्द, खांसी), वाइटल रीडिंग (BP, शुगर), दवाओं या दैनिक स्वास्थ्य सुझावों के बारे में पूछ सकते हैं।"
    );
  }

  // 3. USER STATING HOW THEY FEEL
  // 3a. Feeling good / positive ("i am fine", "im good", "theek hu")
  if (
    /\b(i('m|m|\s+am)?\s*(fine|good|great|well|doing\s+well|all\s+good|okay)|sab\s+theek|badhiya|theek\s+h(u|oon))\b/i.test(text)
  ) {
    return loc(
      "That's wonderful to hear! 😊 Maintaining healthy habits—like drinking plenty of water, eating balanced meals, and regular physical activity—helps keep you feeling your best.\n\nWhenever you have questions about preventive health, reading lab reports, or tracking your vitals, I'm always here. What would you like to explore today?",
      "यह जानकर बहुत खुशी हुई! 😊 अच्छा खान-पान, पर्याप्त पानी और नियमित दिनचर्या आपकी सेहत बनाए रखती है।\n\nयदि कभी कोई स्वास्थ्य सवाल हो, दवा की जानकारी चाहिए हो या टेस्ट रिपोर्ट समझनी हो, तो मैं हमेशा उपलब्ध हूँ। आज आप क्या जानना चाहते हैं?"
    );
  }

  // 3b. Feeling unwell / sick ("not feeling well", "tabiyat kharab", "i am sick")
  if (
    /\b(not\s+(feeling\s+)?well|sick|unwell|not\s+good|tabiyat\s+kharab|bimar\s+h(u|oon)|bimar)\b/i.test(text)
  ) {
    return loc(
      "I'm sorry to hear that you're not feeling well. 🩺 Please share a little more detail so I can guide you:\n• What symptoms are you having (e.g. fever, headache, stomach ache, body pain)?\n• How many days has it been going on?\n• Have you checked any readings like temperature, BP, or sugar?\n\nI'm here to provide safe next steps.",
      "यह जानकर खेद हुआ कि आपकी तबीयत ठीक नहीं है। 🩺 कृपया विस्तार से बताएं कि आपको क्या परेशानी हो रही है:\n• कौन से लक्षण हैं (जैसे बुखार, पेट दर्द, सिरदर्द, कमजोरी)?\n• यह समस्या कितने दिनों से है?\n• क्या आपने तापमान, बीपी या शुगर नापा है?\n\nमैं आपको सही मार्गदर्शन देने के लिए तैयार हूँ।"
    );
  }

  // 4. IDENTITY & CAPABILITIES ("who are you", "what is your name", "who made you")
  if (
    text.includes("who are you") ||
    text.includes("what is your name") ||
    text.includes("what can you do") ||
    text.includes("aap kaun ho") ||
    text.includes("koun ho") ||
    text.includes("help me") ||
    text.includes("features") ||
    text === "help" ||
    text.includes("about you") ||
    text.includes("are you a doctor") ||
    text.includes("are you ai")
  ) {
    return loc(
      "I am RoboDoctor AI, your intelligent health assistant! 🩺\n\nHere is how I can assist you:\n• Symptom Triage: Check symptoms (fever, cough, body ache, acidity) and get home-care advice\n• Vitals Assessment: Instantly interpret your BP, blood sugar, and pulse readings\n• Medicine Guidance: Understand safe usage, dosages, and over-the-counter precautions\n• Emergency Red Flags: Identify critical symptoms requiring immediate medical care\n\n⚠️ Disclaimer: I provide educational clinical guidance and cannot replace a licensed physician's diagnosis. What can I help you with?",
      "मैं RoboDoctor AI स्वास्थ्य सहायक हूँ! 🩺\n\nमैं आपकी इन चीज़ों में मदद कर सकता हूँ:\n• लक्षण मार्गदर्शन: बुखार, खांसी, पेट दर्द जैसे लक्षणों पर प्राथमिक देखभाल सुझाव\n• वाइटल और रीडिंग: ब्लड प्रेशर, शुगर और पल्स वैल्यू का तुरंत विश्लेषण\n• दवा सुरक्षा: सामान्य दवाओं की जानकारी और सावधानियां\n• इमरजेंसी रेड फ्लैग्स: जानें कब तुरंत डॉक्टर या अस्पताल की ज़रूरत है\n\nआप किस स्वास्थ्य विषय या लक्षण के बारे में जानना चाहते हैं?"
    );
  }

  // 5. GRATITUDE & CLOSING ("thank you", "thanks", "ok", "bye")
  if (
    text.includes("thank") ||
    text.includes("thx") ||
    text.includes("dhanyawad") ||
    text.includes("shukriya") ||
    text === "ok" ||
    text === "okay" ||
    text === "bye" ||
    text.includes("goodbye")
  ) {
    return loc(
      "You are very welcome! Take good care of your health and stay well hydrated. 💙 If you experience any symptoms or have questions about vitals, feel free to ask anytime.",
      "आपका बहुत स्वागत है! अपनी सेहत का ध्यान रखें और पर्याप्त पानी पिएं। 💙 यदि कोई नया लक्षण दिखे या वाइटल्स को लेकर सवाल हो, तो कभी भी पूछ सकते हैं।"
    );
  }

  // 6. RED FLAGS INQUIRY
  if (
    text.includes("red flag") ||
    text.includes("रेड फ्लैग") ||
    text.includes("danger signs") ||
    text.includes("emergency symptoms") ||
    text.includes("warning signs")
  ) {
    return loc(
      "🚨 Critical Red-Flag Symptoms Requiring Immediate Emergency Care:\n\n• Severe chest pain, pressure, or tightness (heart emergency)\n• Sudden shortness of breath or gasping\n• Sudden facial drooping, arm weakness, or slurred speech (Stroke)\n• Fainting, collapse, or loss of consciousness\n• Heavy, uncontrolled bleeding\n• Sudden explosive 'thunderclap' headache with stiff neck\n• Critically high BP (180/120+) or very low sugar (<54 mg/dL)\n\n⚠️ If you or someone else experience any of these, call 108 / 112 or visit the nearest emergency room immediately.",
      "🚨 तुरंत इमरजेंसी डॉक्टर की ज़रूरत वाले रेड फ्लैग लक्षण:\n\n• सीने में तेज दर्द, दबाव या भारीपन (हार्ट अटैक का खतरा)\n• अचानक सांस लेने में गंभीर तकलीफ या दम घुटना\n• चेहरे या शरीर के एक तरफ कमजोरी, बोलने में लड़खड़ाहट (स्ट्रोक)\n• बेहोशी, गिर पड़ना या चक्कर खाकर गिरना\n• अनियंत्रित तेज खून बहना\n• अचानक बहुत तेज असहनीय सिरदर्द व गर्दन में अकड़न\n• अत्यधिक उच्च बीपी (180/120+) या बहुत कम शुगर (<54 mg/dL)\n\n⚠️ इनमें से कोई भी लक्षण दिखने पर तुरंत 108 / 112 पर कॉल करें।"
    );
  }

  // 7. EMERGENCY WARNING SYMPTOMS (CHEST PAIN, STROKE, DYSPNEA)
  if (
    text.includes("chest pain") ||
    text.includes("chest pressure") ||
    text.includes("shortness of breath") ||
    text.includes("unable to breathe") ||
    text.includes("breathlessness") ||
    text.includes("fainted") ||
    text.includes("fainting") ||
    text.includes("unconscious") ||
    text.includes("heavy bleeding") ||
    text.includes("slurred speech") ||
    text.includes("face drooping") ||
    text.includes("सीने में दर्द") ||
    text.includes("सांस लेने में तकलीफ") ||
    text.includes("बेहोश")
  ) {
    return loc(
      "🚨 URGENT SAFETY ALERT: The symptoms you described (chest pain, severe breathing difficulty, fainting, or sudden weakness) can indicate a critical medical emergency. Please call emergency services (such as 108 / 911 / 112) or reach the nearest hospital emergency room immediately. Do not drive yourself.",
      "🚨 आपातकालीन चेतावनी: आपने जो लक्षण बताए हैं (सीने में दर्द, सांस लेने में गंभीर तकलीफ, बेहोशी या अचानक कमजोरी), वे गंभीर मेडिकल इमरजेंसी का संकेत हो सकते हैं। कृपया तुरंत आपातकालीन सेवाओं (108 / 112) पर कॉल करें या नजदीकी अस्पताल के इमरजेंसी वार्ड में जाएं। खुद वाहन न चलाएं।"
    );
  }

  // 8. BLOOD PRESSURE (BP) WITH NUMERICAL ANALYSIS
  const bpMatch = text.match(/(\d{2,3})\s*[\/-]\s*(\d{2,3})/);
  if (bpMatch || text.includes("bp") || text.includes("blood pressure") || text.includes("ब्लड प्रेशर")) {
    if (bpMatch) {
      const sys = parseInt(bpMatch[1], 10);
      const dia = parseInt(bpMatch[2], 10);
      const hasHeadache = text.includes("headache") || text.includes("सिरदर्द");

      if (sys >= 180 || dia >= 120) {
        return loc(
          `🚨 Alert: Blood pressure of ${sys}/${dia} mmHg is critically high (Hypertensive Crisis range). When high BP occurs with ${hasHeadache ? "headache" : "symptoms"}, please seek immediate emergency medical evaluation.`,
          `🚨 चेतावनी: ${sys}/${dia} mmHg का ब्लड प्रेशर बहुत अधिक है (हाइपरटेंसिव क्राइसिस)। जब इतने अधिक बीपी के साथ ${hasHeadache ? "सिरदर्द" : "लक्षण"} हो, तो तुरंत इमरजेंसी मेडिकल सहायता लें।`
        );
      }
      if (sys >= 140 || dia >= 90) {
        return loc(
          `Blood pressure of ${sys}/${dia} mmHg is elevated (Stage 2 Hypertension range). ${hasHeadache ? "Headaches can frequently accompany elevated blood pressure. " : ""}Rest quietly for 5 minutes and re-check. Cut down dietary sodium, stay hydrated, and consult a physician promptly for a prescription review.`,
          `${sys}/${dia} mmHg ब्लड प्रेशर बढ़ा हुआ है (हाई बीपी)। ${hasHeadache ? "हाई बीपी के साथ सिरदर्द अक्सर हो सकता है। " : ""}5 मिनट शांत बैठकर दोबारा मापें। नमक कम करें और जल्द डॉक्टर से मिलकर जांच कराएं।`
        );
      }
      if (sys <= 90 || dia <= 60) {
        return loc(
          `Blood pressure of ${sys}/${dia} mmHg is on the lower side (Hypotension). Ensure adequate hydration with water or electrolyte fluids (ORS, coconut water). If you feel lightheaded, sit or lie down right away.`,
          `${sys}/${dia} mmHg ब्लड प्रेशर कम (लो बीपी) है। पर्याप्त पानी या ओआरएस पिएं। यदि चक्कर आ रहे हों तो तुरंत बैठ या लेट जाएं।`
        );
      }
      return loc(
        `Blood pressure of ${sys}/${dia} mmHg is within the normal healthy range (around 120/80 mmHg). Continue maintaining healthy lifestyle habits!`,
        `${sys}/${dia} mmHg ब्लड प्रेशर सामान्य और स्वस्थ सीमा (लगभग 120/80 mmHg) में है। अच्छी डाइट और स्वस्थ दिनचर्या बनाए रखें!`
      );
    }

    return loc(
      "Healthy adult blood pressure is typically around 120/80 mmHg.\n• Elevated / High: Repeated readings above 130/80 or 140/90 mmHg\n• Emergency Zone: 180/120 mmHg or higher\n\n💡 Tip: Sit quietly for 5 minutes before taking a reading with your arm supported at heart level.",
      "वयस्कों का सामान्य ब्लड प्रेशर लगभग 120/80 mmHg माना जाता है।\n• बढ़ा हुआ बीपी: 130/80 या 140/90 mmHg से ऊपर की बार-बार रीडिंग\n• आपातकालीन स्तर: 180/120 mmHg या उससे अधिक\n\n💡 सलाह: रीडिंग लेने से पहले 5 मिनट शांत बैठें और हाथ को दिल के स्तर पर रखें।"
    );
  }

  // 9. BLOOD SUGAR & DIABETES
  const sugarMatch = text.match(/(?:sugar|glucose|फास्टिंग|शुगर)[^0-9]{0,10}(\d{2,3})/i) || text.match(/(\d{2,3})\s*(?:mg\/dl|mg dl)/i);
  if (sugarMatch || text.includes("sugar") || text.includes("diabetes") || text.includes("शुगर") || text.includes("डायबिटीज")) {
    if (sugarMatch) {
      const val = parseInt(sugarMatch[1], 10);
      if (val < 70) {
        return loc(
          `⚠️ Low Blood Sugar Alert: ${val} mg/dL is low (Hypoglycemia). If conscious, consume 15g of fast-acting sugar (half glass fruit juice, 3-4 candies, or 1 tbsp sugar in water) and recheck in 15 minutes.`,
          `⚠️ लो शुगर चेतावनी: ${val} mg/dL कम है (हाइपोग्लाइसीमिया)। यदि होश में हैं तो तुरंत 15 ग्राम तेज शुगर (आधा गिलास फलों का जूस, 3-4 टॉफी, या 1 चम्मच चीनी/ग्लूकोज) लें और 15 मिनट बाद दोबारा जांचें।`
        );
      }
      if (val >= 200) {
        return loc(
          `Blood sugar of ${val} mg/dL is notably elevated. Drink plain water to flush excess glucose, strictly avoid sweets and refined carbs, and discuss this reading with your doctor for proper diabetes management.`,
          `${val} mg/dL ब्लड शुगर काफी अधिक है। पर्याप्त पानी पिएं, मीठा पूरी तरह बंद रखें, और डॉक्टर से दवा की समीक्षा कराएं।`
        );
      }
      return loc(
        `Blood sugar of ${val} mg/dL is noted. Normal fasting is usually 70-99 mg/dL, while normal post-meal (PP) is under 140 mg/dL. Keep tracking your readings regularly.`,
        `${val} mg/dL ब्लड शुगर दर्ज की गई। सामान्य फास्टिंग 70-99 mg/dL और भोजन के बाद 140 mg/dL से कम होती है। नियमित रूप से जांच करते रहें।`
      );
    }

    return loc(
      "Typical Blood Sugar Ranges (mg/dL):\n• Normal Fasting: 70 – 99 mg/dL\n• Pre-diabetes Fasting: 100 – 125 mg/dL\n• Diabetes range: 126 mg/dL or higher on repeated fasting checks\n• Post-meal (2 hrs): Should ideally be below 140 mg/dL.",
      "सामान्य ब्लड शुगर रेंज (mg/dL):\n• सामान्य फास्टिंग: 70 से 99 mg/dL\n• प्रीडायबिटीज फास्टिंग: 100 से 125 mg/dL\n• डायबिटीज रेंज: लगातार 126 mg/dL या उससे अधिक\n• भोजन के 2 घंटे बाद: 140 mg/dL से कम होनी चाहिए।"
    );
  }

  // 10. FEVER, TEMPERATURE & BODY ACHE
  if (
    text.includes("fever") ||
    text.includes("temperature") ||
    text.includes("bukhar") ||
    text.includes("बुखार") ||
    text.includes("badan dard") ||
    text.includes("body ache") ||
    text.includes("chills") ||
    text.includes("shivering")
  ) {
    return loc(
      "For fever and mild body ache:\n\n💡 Immediate Self-Care:\n• Rest adequately and drink plenty of fluids (water, ORS, lemon water, clear soups)\n• Paracetamol (500mg or 650mg after food) can help relieve fever and body ache (up to 3 times/day)\n• Apply a cool damp cloth to forehead if temperature exceeds 101°F\n• Monitor your temperature every 4 to 6 hours\n\n⚠️ See a Doctor If: Fever stays above 103°F, lasts longer than 3 days, or is accompanied by stiff neck, rash, severe vomiting, or breathlessness.",
      "बुखार और बदन दर्द के लिए:\n\n💡 प्राथमिक देखभाल:\n• पर्याप्त आराम करें और खूब तरल पदार्थ (पानी, ORS, नींबू-पानी, सूप) पिएं\n• पेरासिटामोल (500mg या 650mg भोजन के बाद) बुखार और दर्द कम करने में मदद कर सकती है\n• 101°F से अधिक बुखार होने पर माथे पर ठंडे पानी की पट्टी रखें\n• हर 4 से 6 घंटे में तापमान मापते रहें\n\n⚠️ डॉक्टर को कब दिखाएं: यदि बुखार 103°F से अधिक हो, 3 दिन से अधिक रहे, या गर्दन में अकड़न, दाने या सांस फूलने की समस्या हो।"
    );
  }

  // 11. HEADACHE & MIGRAINE
  if (
    text.includes("headache") ||
    text.includes("migraine") ||
    text.includes("सिरदर्द") ||
    text.includes("सिर दर्द") ||
    text.includes("sar dard") ||
    text.includes("head ache")
  ) {
    return loc(
      "Headaches are commonly caused by dehydration, eye strain, lack of sleep, stress, or sinus pressure.\n\n💡 Helpful Steps:\n• Drink a large glass of water and rest in a quiet, dimly lit room\n• Apply a cold damp cloth or ice pack to your forehead or temples\n• Paracetamol (500mg or 650mg) after food can provide safe relief\n• Avoid screens and loud noises until relief occurs\n\n⚠️ Red Flags: Seek immediate medical care if it's a sudden, severe 'thunderclap' headache, or accompanied by stiff neck, fever, confusion, or visual disturbances.",
      "सिरदर्द आमतौर पर पानी की कमी, आंखों की थकान, नींद की कमी या तनाव से होता है।\n\n💡 राहत के उपाय:\n• भरपूर पानी पिएं और शांत, अंधेरे कमरे में आराम करें\n• माथे या कनपटी पर ठंडे पानी की पट्टी रखें\n• भोजन के बाद पेरासिटामोल (500mg/650mg) ले सकते हैं\n• स्क्रीन (मोबाइल/लैपटॉप) से कुछ देर दूरी बनाएं\n\n⚠️ चेतावनी: यदि अचानक असहनीय तेज सिरदर्द हो, गर्दन में अकड़न या तेज बुखार हो तो तुरंत डॉक्टर से मिलें।"
    );
  }

  // 12. COUGH, COLD, SORE THROAT & FLU
  if (
    text.includes("cough") ||
    text.includes("cold") ||
    text.includes("sore throat") ||
    text.includes("throat") ||
    text.includes("runny nose") ||
    text.includes("sneezing") ||
    text.includes("congestion") ||
    text.includes("खांसी") ||
    text.includes("जुकाम") ||
    text.includes("गले में खराश") ||
    text.includes("khansi") ||
    text.includes("zukam")
  ) {
    return loc(
      "For cold, cough, and throat irritation:\n\n💡 Practical Steps:\n• Warm water gargles with a pinch of salt 2–3 times a day for soothing relief\n• Steam inhalation helps clear nasal congestion and loosen mucus\n• Sip warm fluids like ginger-honey tea, tulsi water, or warm broth\n• Avoid cold drinks, ice cream, and exposure to dust or smoke\n\n⚠️ Medical Review: Consult a clinician if the cough lasts over 2 weeks, produces blood, or makes breathing difficult.",
      "सर्दी, खांसी और गले की खराश के लिए:\n\n💡 उपयोगी उपाय:\n• गुनगुने पानी में नमक डालकर दिन में 2-3 बार गरारे करें\n• नाक और सीना खोलने के लिए भाप (स्टीम) लें\n• गर्म पेय (अदरक-शहद की चाय, तुलसी का काढ़ा, सूप) का सेवन करें\n• ठंडे पानी, आइसक्रीम और धूल-धुएं से बचें\n\n⚠️ डॉक्टर की सलाह: यदि खांसी 2 हफ्ते से ज्यादा रहे, बलगम में खून आए, या सांस फूले तो डॉक्टर को दिखाएं।"
    );
  }

  // 13. STOMACH PAIN, ACIDITY, GAS, VOMITING & DIARRHEA
  if (
    text.includes("stomach") ||
    text.includes("acidity") ||
    text.includes("gas") ||
    text.includes("vomit") ||
    text.includes("diarrhea") ||
    text.includes("loose motion") ||
    text.includes("constipation") ||
    text.includes("kabz") ||
    text.includes("heartburn") ||
    text.includes("पेट दर्द") ||
    text.includes("एसिडिटी") ||
    text.includes("उल्टी") ||
    text.includes("दस्त") ||
    text.includes("pet dard")
  ) {
    return loc(
      "For stomach discomfort, acidity, or loose motion:\n\n💡 Immediate Guidance:\n• Hydration is critical: Sip ORS or electrolyte water frequently in small sips\n• Eat a bland diet (BRAT): Curd rice, bananas, khichdi, or plain toast\n• Avoid spicy, oily, fried foods, caffeine, and milk\n• For acidity, an over-the-counter antacid syrup or pantoprazole can bring fast relief\n\n⚠️ Red Flags: Seek emergency care if you have severe unrelenting abdominal pain, high fever, or blood in vomiting or stool.",
      "पेट दर्द, एसिडिटी या दस्त के लिए:\n\n💡 प्राथमिक सुझाव:\n• शरीर में पानी की कमी न होने दें: थोड़ा-थोड़ा करके ORS या नींबू-पानी पिएं\n• हल्का भोजन लें: दही-चावल, केला, खिचड़ी या दलिया\n• तला-भुना, मसालेदार खाना और चाय-कॉफी पूरी तरह बंद रखें\n• एसिडिटी के लिए एंटासिड सिरप या गोली से राहत मिल सकती है\n\n⚠️ चेतावनी: यदि असहनीय तेज पेट दर्द, तेज बुखार, या मल/उल्टी में खून दिखे तो तुरंत डॉक्टर से संपर्क करें।"
    );
  }

  // 14. BODY ACHE, BACK PAIN & JOINT PAIN
  if (
    text.includes("back pain") ||
    text.includes("joint pain") ||
    text.includes("kamar dard") ||
    text.includes("pain") ||
    text.includes("dard") ||
    text.includes("muscle") ||
    text.includes("knee pain")
  ) {
    return loc(
      "For back, joint, or muscle aches:\n\n💡 Care Recommendations:\n• Rest the affected area and avoid heavy lifting or sudden bending\n• Hot compress (for stiff muscles) or cold ice pack (for acute sprain/swelling) for 15 minutes\n• Paracetamol (500mg/650mg) can help ease discomfort safely after food\n• Gentle stretching and maintaining upright posture while sitting\n\n⚠️ When to see a doctor: If pain radiates down your leg (sciatica), causes numbness or tingling, or follows a high-impact injury.",
      "पीठ दर्द, जोड़ों के दर्द या मांसपेशियों के खिंचाव के लिए:\n\n💡 देखभाल के उपाय:\n• प्रभावित हिस्से को आराम दें और भारी वजन उठाने से बचें\n• मांसपेशियों की जकड़न में गर्म सिकाई या सूजन में बर्फ की सिकाई करें (15 मिनट)\n• भोजन के बाद पेरासिटामोल (500mg/650mg) दर्द कम करने में सुरक्षित है\n• बैठते समय रीढ़ की हड्डी सीधी रखें\n\n⚠️ डॉक्टर को कब दिखाएं: यदि दर्द पैर में नीचे की तरफ उतरे, सुन्नपन हो, या किसी चोट के बाद हुआ हो।"
    );
  }

  // 15. WEAKNESS, FATIGUE & DIZZINESS
  if (
    text.includes("weakness") ||
    text.includes("kamzori") ||
    text.includes("fatigue") ||
    text.includes("tired") ||
    text.includes("exhausted") ||
    text.includes("dizzy") ||
    text.includes("chakkar") ||
    text.includes("dizziness")
  ) {
    return loc(
      "For weakness, fatigue, or dizziness:\n\n💡 Quick Advice:\n• Sit or lie down immediately if feeling lightheaded to prevent falls\n• Drink an electrolyte drink (ORS, coconut water, or glucose water)\n• Check your blood pressure and blood sugar if you have a home monitor\n• Ensure at least 7–8 hours of quality sleep and do not skip meals\n\n⚠️ Warning: Seek medical attention if dizziness is accompanied by chest pain, speech changes, or fainting.",
      "कमजोरी, थकान या चक्कर आने पर:\n\n💡 त्वरित सलाह:\n• चक्कर आने पर तुरंत बैठ या लेट जाएं ताकि गिरने की चोट से बचा जा सके\n• तुरंत ओआरएस, नारियल पानी या ग्लूकोज का घोल पिएं\n• यदि घर में मशीन हो तो बीपी और शुगर तुरंत जांचें\n• पर्याप्त नींद लें और भोजन समय पर करें\n\n⚠️ चेतावनी: यदि चक्कर के साथ सीने में दर्द, बोलने में कठिनाई या बेहोशी हो तो तुरंत अस्पताल जाएं।"
    );
  }

  // 16. SLEEP PROBLEMS & INSOMNIA
  if (
    text.includes("sleep") ||
    text.includes("insomnia") ||
    text.includes("neend") ||
    text.includes("sleepless")
  ) {
    return loc(
      "For better sleep and insomnia relief:\n\n💡 Sleep Hygiene Tips:\n• Keep your bedroom dark, quiet, and cool\n• Stop screen use (phones, TV, laptops) at least 45 minutes before bedtime\n• Avoid caffeine (tea, coffee, energy drinks) after 4 PM\n• Try a warm cup of milk or chamomile tea, and practice 5 minutes of deep breathing\n\nIf chronic insomnia persists for over a month, consult a doctor to check for underlying anxiety, thyroid, or vitamin D/B12 deficiencies.",
      "अच्छी नींद और अनिद्रा से राहत के लिए:\n\n💡 उपयोगी टिप्स:\n• सोने से 45 मिनट पहले मोबाइल, टीवी और लैपटॉप की स्क्रीन बंद कर दें\n• शाम 4 बजे के बाद चाय, कॉफी या कैफीन युक्त पेय न लें\n• सोने से पहले गुनगुना दूध पिएं और 5 मिनट गहरी सांस लेने का अभ्यास करें\n• कमरे में अंधेरा और शांति बनाए रखें\n\nयदि एक महीने से ज्यादा समय से नींद न आ रही हो तो डॉक्टर से परामर्श लें।"
    );
  }

  // 17. MEDICINE & OTC INQUIRIES
  if (
    text.includes("medicine") ||
    text.includes("dawa") ||
    text.includes("davai") ||
    text.includes("tablet") ||
    text.includes("paracetamol") ||
    text.includes("dolo") ||
    text.includes("crocin") ||
    text.includes("antibiotic") ||
    text.includes("cetirizine")
  ) {
    return loc(
      "Medication Safety Basics:\n\n• Paracetamol (500mg/650mg) is a standard safe over-the-counter option for fever and pain, taken after food (maximum 3-4 grams in 24 hours for adults).\n• Never take pain relievers like Ibuprofen or Combiflam on an empty stomach.\n• Never start antibiotics without a doctor's explicit prescription.\n• You can use our 'Drug Interaction Checker' on the homepage to verify if two medicines are safe to take together.",
      "दवा सुरक्षा के सामान्य नियम:\n\n• पेरासिटामोल (500mg/650mg) बुखार और हल्के दर्द के लिए सुरक्षित दवा है, जिसे भोजन के बाद लिया जाता है (24 घंटे में अधिकतम 3-4 ग्राम)।\n• खाली पेट दर्द निवारक दवाएं (जैसे ब्रूफेन या कॉम्बीफ्लेम) न लें।\n• बिना डॉक्टर की पर्ची के एंटीबायोटिक दवाएं कभी शुरू न करें।\n• दो दवाओं के आपसी रिएक्शन की जांच के लिए होमपेज पर हमारे 'Drug Interaction Checker' का उपयोग करें।"
    );
  }

  // 18. SKIN PROBLEMS, RASH & ITCHING
  if (
    text.includes("skin") ||
    text.includes("rash") ||
    text.includes("itch") ||
    text.includes("acne") ||
    text.includes("allergy") ||
    text.includes("त्वचा") ||
    text.includes("दाने") ||
    text.includes("खुजली")
  ) {
    return loc(
      "For skin rashes, itching, or allergic irritation:\n\n💡 Advice:\n• Avoid scratching the area to prevent secondary bacterial infection\n• Wash gently with plain water/mild soap and apply calamine lotion or aloe vera\n• An over-the-counter antihistamine (like Cetirizine 10mg) can help calm itching\n• You can also use our 'Skin Check' tool on the homepage to assess a photo of the condition\n\n⚠️ Red Flags: Seek urgent medical help if the rash spreads rapidly, blisters severely, or causes facial or lip swelling.",
      "त्वचा की समस्या, दाने या खुजली के लिए:\n\n💡 सुझाव:\n• प्रभावित जगह को खुजलाने से बचें ताकि संक्रमण न फैले\n• हल्के साबुन से साफ करें और कैलामाइन लोशन या ठंडा कपड़ा लगाएं\n• एलर्जी की खुजली के लिए सेटिरिज़िन (Cetirizine 10mg) राहत दे सकती है\n• आप होमपेज पर हमारे 'स्किन चेक' टूल से फोटो अपलोड करके भी जांच कर सकते हैं\n\n⚠️ चेतावनी: यदि दाने तेजी से फैलें, छाले पड़ें, या चेहरे/होठों पर सूजन आए तो तुरंत डॉक्टर से मिलें।"
    );
  }

  // 19. CONTEXTUAL DYNAMIC FALLBACK (Acknowledges user input directly instead of static menu)
  return loc(
    `I understand you're asking about: "${raw}".\n\nAs your RoboDoctor AI Health Assistant, I'm here to provide clinical triage, symptom analysis, vital checks, and medication guidance. Could you share a bit more context—such as whether you have any specific symptoms, how long you've noticed them, or any readings you have (like BP, sugar, or temperature)? This will allow me to give you the most accurate educational guidance!`,
    `मैंने आपका संदेश समझा: "${raw}"।\n\nRoboDoctor AI स्वास्थ्य सहायक के रूप में, मैं आपकी सेहत, लक्षण और दवाओं के संबंध में मार्गदर्शन के लिए तैयार हूँ। कृपया थोड़ा और विस्तार से बताएं—क्या आप कोई विशेष लक्षण महसूस कर रहे हैं, यह कब से है, या हाल की कोई मेडिकल रीडिंग (जैसे BP, शुगर या तापमान) है? इससे मैं आपको सटीक जानकारी दे सकूँगा!`
  );
}

function getFallbackApiKey(): string | undefined {
  const envKey = process.env.GEMINI_API_KEY?.trim();
  if (envKey) return envKey;
  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as {
      messages?: ChatMessage[];
      language?: string;
    };

    const messages = payload.messages ?? [];
    const language = payload.language ?? "en";

    if (messages.length === 0) {
      return NextResponse.json(
        { error: "At least one chat message is required." },
        { status: 400 }
      );
    }

    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.text || "";
    const apiKey = getFallbackApiKey();

    // Fast-path Gemini integration if a valid key is provided
    if (apiKey) {
      const candidateModels = [
        process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash",
        process.env.AI_HEALTH_ASSISTANT_GEMINI_MODEL?.trim(),
        "gemini-3.5-flash",
        "gemini-3.6-flash",
        "gemini-3.7-flash",
        "gemini-flash-latest",
      ].filter(Boolean) as string[];

      const modelsToTry = Array.from(new Set(candidateModels));
      const contents = messages.map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.text }],
      }));

      for (const model of modelsToTry) {
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

          const response = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents,
              systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
              generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const replyText = data.candidates?.[0]?.content?.parts
              ?.map((p: { text?: string }) => p.text)
              .join("\n")
              ?.trim();

            if (replyText) {
              return NextResponse.json({
                reply: replyText,
                provider: "gemini",
                model,
                fallbackUsed: false,
              });
            }
          }

          // If the key is suspended or unauthorized, don't spam Google with more attempts
          if (response.status === 401 || response.status === 403) {
            console.warn(`Gemini API key is unauthorized or suspended (${response.status}). Falling back to clinical engine.`);
            break;
          }
        } catch (err) {
          console.warn(`Attempt with model ${model} failed:`, err);
        }
      }
    }

    // High-intelligence clinical engine fallback
    const fallbackReply = getEnhancedBotFallback(lastUserMsg, language);
    return NextResponse.json({
      reply: fallbackReply,
      provider: "health-engine",
      model: "robodoctor-conversational-v2",
      fallbackUsed: true,
    });
  } catch (error) {
    console.error("Chatbot API error:", error);
    return NextResponse.json(
      {
        error: "RoboDoctor is temporarily unable to connect. Please try again.",
      },
      { status: 500 }
    );
  }
}
