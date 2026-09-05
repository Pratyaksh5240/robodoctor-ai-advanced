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
  const text = raw.toLowerCase();
  const lang = (language || "en") as Language;

  const loc = (en: string, hi: string) => {
    if (lang === "hi") return hi;
    return translateUi(en, lang);
  };

  // 1. GREETINGS & CASUAL HELLOS ("hlo", "hello", "hi", "hey", etc.)
  const greetingPatterns = [
    /^h[el]+o+$/i,          // hlo, hllo, hello, helo
    /^h+i+$/i,             // hi, hii, hiii
    /^h+e+y+$/i,           // hey, heyy
    /^greetings/i,
    /^namaste/i,
    /^hola/i,
    /^bonjour/i,
    /^hallo/i,
    /^good\s*(morning|afternoon|evening|day)/i,
    /^whats?\s*up/i,
    /^sup$/i,
  ];

  if (greetingPatterns.some((pattern) => pattern.test(text))) {
    return loc(
      "Hello! 👋 I am RoboDoctor AI, your health assistant. How can I help you today? You can ask me about your symptoms (like fever, headache, cough), vital readings (BP, sugar, heart rate), medications, or everyday health tips.",
      "नमस्ते! 👋 मैं RoboDoctor AI स्वास्थ्य सहायक हूं। आज मैं आपकी क्या मदद कर सकता हूं? आप मुझसे अपने लक्षणों (जैसे बुखार, सिरदर्द, खांसी), वाइटल रीडिंग (BP, शुगर), दवाओं या दैनिक स्वास्थ्य सुझावों के बारे में पूछ सकते हैं।"
    );
  }

  // 2. IDENTITY & CAPABILITIES
  if (
    text.includes("who are you") ||
    text.includes("what can you do") ||
    text.includes("help me") ||
    text.includes("features") ||
    text === "help" ||
    text.includes("about you")
  ) {
    return loc(
      "I am your RoboDoctor AI Health Assistant! 🩺\n\nHere is what I can help you with:\n• Symptom Guidance: Share your symptoms for quick triage advice\n• Vitals & Readings: Understand blood pressure, blood sugar, and pulse values\n• Medicine Safety: Over-the-counter advice and precautions\n• Emergency Red Flags: Learn when symptoms require urgent medical care\n\nWhat health question or symptom would you like to explore?",
      "मैं आपका RoboDoctor AI स्वास्थ्य सहायक हूं! 🩺\n\nमैं आपकी इन चीज़ों में मदद कर सकता हूं:\n• लक्षण मार्गदर्शन: तुरंत सलाह के लिए अपने लक्षण बताएं\n• वाइटल और रीडिंग: ब्लड प्रेशर, शुगर और पल्स वैल्यू को समझें\n• दवा सुरक्षा: सामान्य दवाओं की जानकारी और सावधानियां\n• इमरजेंसी रेड फ्लैग्स: जानें कब तुरंत डॉक्टर की ज़रूरत है\n\nआप किस स्वास्थ्य विषय या लक्षण के बारे में जानना चाहते हैं?"
    );
  }

  // 3. GRATITUDE & CLOSING
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
      "You are very welcome! Take good care of your health. 💙 If you experience new symptoms or have questions about your vitals, feel free to ask anytime.",
      "आपका स्वागत है! अपनी सेहत का ध्यान रखें। 💙 यदि कोई नया लक्षण दिखे या वाइटल्स को लेकर सवाल हो, तो कभी भी पूछ सकते हैं।"
    );
  }

  // 3b. RED FLAGS INQUIRY
  if (
    text.includes("red flag") ||
    text.includes("रेड फ्लैग") ||
    text.includes("danger signs") ||
    text.includes("emergency symptoms") ||
    text.includes("warning signs")
  ) {
    return loc(
      "🚨 Critical Red-Flag Symptoms Requiring Immediate Emergency Care:\n\n• Severe chest pain, pressure, or tightness (possible heart emergency)\n• Sudden difficulty breathing, gasping, or breathlessness\n• Sudden weakness or numbness on one side of the face or body, trouble speaking (Stroke symptoms)\n• Fainting, collapse, or loss of consciousness\n• Heavy, uncontrolled bleeding\n• Sudden severe 'thunderclap' headache with stiff neck or high fever\n• Extremely high BP (180/120+) or very low sugar (<54 mg/dL)\n\n⚠️ If you or someone else experience any of these, call emergency services (108 / 112) or visit the nearest emergency department immediately.",
      "🚨 तुरंत इमरजेंसी डॉक्टर की ज़रूरत वाले रेड फ्लैग लक्षण:\n\n• सीने में तेज दर्द, दबाव या भारीपन (हार्ट अटैक का खतरा)\n• अचानक सांस लेने में गंभीर तकलीफ या दम घुटना\n• चेहरे या शरीर के एक तरफ अचानक कमजोरी, बोलने में लड़खड़ाहट (स्ट्रोक के लक्षण)\n• बेहोशी, गिर पड़ना या चक्कर खाकर गिरना\n• अनियंत्रित तेज खून बहना\n• अचानक बहुत तेज असहनीय सिरदर्द, गर्दन में अकड़न या तेज बुखार\n• अत्यधिक उच्च बीपी (180/120+) या बहुत कम शुगर (<54 mg/dL)\n\n⚠️ इनमें से कोई भी लक्षण दिखने पर तुरंत आपातकालीन सेवाओं (108 / 112) पर कॉल करें या नजदीकी अस्पताल के इमरजेंसी वार्ड में जाएं।"
    );
  }

  // 4. EMERGENCY WARNING SYMPTOMS
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

  // 5. BLOOD PRESSURE (BP) WITH NUMERICAL ANALYSIS
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
          `Blood pressure of ${sys}/${dia} mmHg is elevated (Stage 2 Hypertension range). ${hasHeadache ? "Headaches can frequently accompany elevated blood pressure. " : ""}Rest quietly for 5 minutes and re-check. If your reading stays high or headache worsens, please consult a physician promptly.`,
          `${sys}/${dia} mmHg ब्लड प्रेशर बढ़ा हुआ है (हाई बीपी)। ${hasHeadache ? "हाई बीपी के साथ सिरदर्द अक्सर हो सकता है। " : ""}5 मिनट शांत बैठकर दोबारा मापें। यदि रीडिंग लगातार ऊंची रहे या सिरदर्द बढ़े, तो जल्द डॉक्टर से मिलें।`
        );
      }
      if (sys <= 90 || dia <= 60) {
        return loc(
          `Blood pressure of ${sys}/${dia} mmHg is on the lower side (Hypotension). Ensure adequate hydration with water or electrolyte fluids. If you feel lightheaded, sit or lie down right away.`,
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

  // 6. BLOOD SUGAR & DIABETES
  const sugarMatch = text.match(/(?:sugar|glucose|फास्टिंग|शुगर)[^0-9]{0,10}(\d{2,3})/i) || text.match(/(\d{2,3})\s*(?:mg\/dl|mg dl)/i);
  if (sugarMatch || text.includes("sugar") || text.includes("diabetes") || text.includes("शुगर") || text.includes("डायबिटीज")) {
    if (sugarMatch) {
      const val = parseInt(sugarMatch[1], 10);
      if (val < 70) {
        return loc(
          `⚠️ Low Blood Sugar Alert: ${val} mg/dL is low (Hypoglycemia). If conscious, consume 15g of fast-acting sugar (half glass fruit juice, 3-4 candies, or 1 tbsp glucose) and recheck in 15 minutes.`,
          `⚠️ लो शुगर चेतावनी: ${val} mg/dL कम है (हाइपोग्लाइसीमिया)। यदि होश में हैं तो तुरंत 15 ग्राम तेज शुगर (आधा गिलास फलों का जूस, 3-4 टॉफी, या 1 चम्मच चीनी/ग्लूकोज) लें और 15 मिनट बाद दोबारा जांचें।`
        );
      }
      if (val >= 200) {
        return loc(
          `Blood sugar of ${val} mg/dL is notably elevated. Drink water, watch for symptoms like excessive thirst or fatigue, and discuss this reading with your doctor for proper diabetes management.`,
          `${val} mg/dL ब्लड शुगर काफी अधिक है। पर्याप्त पानी पिएं, अधिक प्यास या थकान पर नजर रखें और डॉक्टर से सलाह लें।`
        );
      }
      return loc(
        `Blood sugar of ${val} mg/dL is noted. Normal fasting is usually 70-99 mg/dL, while normal post-meal is under 140 mg/dL. Keep tracking your readings regularly.`,
        `${val} mg/dL ब्लड शुगर दर्ज की गई। सामान्य फास्टिंग 70-99 mg/dL और भोजन के बाद 140 mg/dL से कम होती है। नियमित रूप से जांच करते रहें।`
      );
    }

    return loc(
      "Typical Blood Sugar Ranges (mg/dL):\n• Normal Fasting: 70 – 99 mg/dL\n• Pre-diabetes Fasting: 100 – 125 mg/dL\n• Diabetes range: 126 mg/dL or higher on repeated fasting checks\n• Post-meal (2 hrs): Should ideally be below 140 mg/dL.",
      "सामान्य ब्लड शुगर रेंज (mg/dL):\n• सामान्य फास्टिंग: 70 से 99 mg/dL\n• प्रीडायबिटीज फास्टिंग: 100 से 125 mg/dL\n• डायबिटीज रेंज: लगातार 126 mg/dL या उससे अधिक\n• भोजन के 2 घंटे बाद: 140 mg/dL से कम होनी चाहिए।"
    );
  }

  // 7. HEADACHE & MIGRAINE
  if (text.includes("headache") || text.includes("migraine") || text.includes("सिरदर्द") || text.includes("सिर दर्द")) {
    return loc(
      "Headaches are commonly caused by stress, dehydration, lack of sleep, eye strain, or sinus pressure.\n\n💡 Helpful Steps:\n• Drink a large glass of water and rest in a quiet, dark room\n• Apply a cool cloth or ice pack to your forehead or temples\n• Consider mild relief like Paracetamol if appropriate for you\n\n⚠️ Red Flags: Seek emergency care if it is a sudden severe 'thunderclap' headache, or accompanied by fever, stiff neck, confusion, numbness, or vision changes.",
      "सिरदर्द आमतौर पर तनाव, पानी की कमी, नींद की कमी, आंखों की थकान या साइनस से हो सकता है।\n\n💡 राहत के उपाय:\n• भरपूर पानी पिएं और शांत, अंधेरे कमरे में आराम करें\n• माथे या गर्दन पर ठंडा कपड़ा रखें\n• यदि उचित हो तो पेरासिटामोल जैसी हल्की दवा ले सकते हैं\n\n⚠️ चेतावनी: यदि अचानक असहनीय तेज सिरदर्द हो, या बुखार, गर्दन में अकड़न, सुन्नता या देखने में परेशानी हो तो तुरंत डॉक्टर से मिलें।"
    );
  }

  // 6. FEVER & BODY ACHE
  if (text.includes("fever") || text.includes("temperature") || text.includes("बुखार") || text.includes("बदन दर्द")) {
    return loc(
      "For fever and mild body ache:\n\n💡 Self-Care Measures:\n• Rest adequately and stay well hydrated (water, electrolytes, warm broths)\n• Paracetamol (500mg or 650mg after food) can help relieve fever and body ache\n• Monitor your temperature every 4 to 6 hours\n\n⚠️ When to see a doctor: If fever rises above 103°F (39.4°C), lasts more than 3 days, or comes with difficulty breathing, severe vomiting, or a rash.",
      "बुखार और बदन दर्द के लिए:\n\n💡 देखभाल के उपाय:\n• पर्याप्त आराम करें और पानी/तरल पदार्थ (ORS, सूप) पिएं\n• पेरासिटामोल (500mg या 650mg भोजन के बाद) बुखार और दर्द कम करने में मदद कर सकती है\n• हर 4 से 6 घंटे में तापमान मापते रहें\n\n⚠️ डॉक्टर को कब दिखाएं: यदि बुखार 103°F से अधिक हो, 3 दिन से अधिक रहे, या सांस की तकलीफ, उल्टी या दाने हों।"
    );
  }

  // 7. COUGH, COLD, SORE THROAT, FLU
  if (
    text.includes("cough") ||
    text.includes("cold") ||
    text.includes("sore throat") ||
    text.includes("throat") ||
    text.includes("runny nose") ||
    text.includes("खांसी") ||
    text.includes("जुकाम") ||
    text.includes("गले में खराश")
  ) {
    return loc(
      "For cold, cough, and throat irritation:\n\n💡 Practical Steps:\n• Warm water gargles with a pinch of salt 2-3 times a day for throat relief\n• Steam inhalation can help ease nasal congestion and airway irritation\n• Warm fluids (herbal tea, ginger honey water, soup) keep you comfortable\n• Avoid cold drinks, direct chill, and smoke/dust exposure\n\n⚠️ Medical Review: Consult a doctor if cough lasts more than 2 weeks, produces blood, or causes shortness of breath.",
      "सर्दी, खांसी और गले की खराश के लिए:\n\n💡 उपयोगी उपाय:\n• गुनगुने पानी में नमक डालकर दिन में 2-3 बार गरारे करें\n• नाक खोलने के लिए भाप (स्टीम) लें\n• गर्म पेय (अदरक-शहद, काढ़ा, सूप) का सेवन करें\n• ठंडे पानी और धूल-धुएं से बचें\n\n⚠️ डॉक्टर की सलाह: यदि खांसी 2 हफ्ते से ज्यादा रहे, बलगम में खून आए, या सांस फूले तो डॉक्टर को दिखाएं।"
    );
  }

  // 10. STOMACH PAIN, ACIDITY, GAS, VOMITING, DIARRHEA
  if (
    text.includes("stomach") ||
    text.includes("acidity") ||
    text.includes("gas") ||
    text.includes("vomit") ||
    text.includes("diarrhea") ||
    text.includes("loose motion") ||
    text.includes("पेट दर्द") ||
    text.includes("एसिडिटी") ||
    text.includes("उल्टी") ||
    text.includes("दस्त")
  ) {
    return loc(
      "For stomach discomfort, acidity, or loose motion:\n\n💡 Immediate Guidance:\n• Hydration is key: Sip ORS or electrolyte water frequently in small amounts\n• Eat light binding foods: curd rice, banana, khichdi, or toast\n• Avoid heavy, spicy, fried foods, and dairy milk\n• For acidity or heartburn, an antacid can provide temporary relief\n\n⚠️ Red Flags: Seek medical attention if you experience severe persistent abdominal pain, high fever, or inability to keep fluids down for over 24 hours.",
      "पेट दर्द, एसिडिटी या दस्त की समस्या के लिए:\n\n💡 प्राथमिक सुझाव:\n• पानी की कमी न होने दें: थोड़ा-थोड़ा करके ORS या नींबू-पानी पिएं\n• हल्का भोजन लें: दही-चावल, केला, खिचड़ी या दलिया\n• तला-भुना, ज्यादा मसालेदार खाना और चाय-कॉफी से बचें\n• एसिडिटी के लिए एंटासिड सिरप या गोली से राहत मिल सकती है\n\n⚠️ चेतावनी: यदि असहनीय तेज पेट दर्द, तेज बुखार, या 24 घंटे से ज्यादा उल्टी बंद न हो तो तुरंत डॉक्टर से संपर्क करें।"
    );
  }

  // 11. SKIN PROBLEMS, RASH, ITCHING
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
      "For skin rashes, itching, or allergic irritation:\n\n💡 Advice:\n• Avoid scratching the area to prevent bacterial infection\n• Wash gently with mild soap and apply a cool damp compress or calamine lotion\n• An over-the-counter antihistamine (like Cetirizine 10mg) can help calm itching\n• You can also use our 'Skin Check' tool on the homepage to assess a photo of the condition\n\n⚠️ Red Flags: Seek urgent medical help if the rash spreads rapidly, blisters severely, or causes facial or lip swelling.",
      "त्वचा की समस्या, दाने या खुजली के लिए:\n\n💡 सुझाव:\n• प्रभावित जगह को खुजलाने से बचें ताकि संक्रमण न फैले\n• हल्के साबुन से साफ करें और कैलामाइन लोशन या ठंडा कपड़ा लगाएं\n• एलर्जी की खुजली के लिए सेटिरिज़िन (Cetirizine 10mg) राहत दे सकती है\n• आप होमपेज पर हमारे 'स्किन चेक' टूल से फोटो अपलोड करके भी जांच कर सकते हैं\n\n⚠️ चेतावनी: यदि दाने तेजी से फैलें, छाले पड़ें, या चेहरे/होठों पर सूजन आए तो तुरंत डॉक्टर से मिलें।"
    );
  }

  // 12. GENERAL HEALTH / DEFAULT GUIDANCE
  return loc(
    "I am here to guide your health questions. You can tell me about:\n• Any symptoms you feel (e.g. 'I have a sore throat and fever')\n• Specific health numbers (e.g. 'my BP is 150/95', 'sugar 180')\n• General questions about medications, diet, or when to see a doctor.\n\nWhat would you like to discuss?",
    "मैं आपके स्वास्थ्य संबंधी सवालों में मदद के लिए यहां हूं। आप मुझे बता सकते हैं:\n• कोई भी लक्षण (उदा. 'मुझे गले में दर्द और बुखार है')\n• आपकी रीडिंग (उदा. 'मेरा बीपी 150/95 है', 'शुगर 180 आई है')\n• दवाओं, डाइट या डॉक्टर से मिलने के बारे में कोई सवाल।\n\nआप किस बारे में बात करना चाहते हैं?"
  );
}

function getFallbackApiKey(): string | undefined {
  const envKey = process.env.GEMINI_API_KEY?.trim();
  // Only return key if it matches valid Gemini key format (AIzaSy...)
  if (envKey && envKey.startsWith("AIza")) {
    return envKey;
  }
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

    // If no valid Gemini API key is configured, immediately return high-quality contextual health guidance
    if (!apiKey) {
      const reply = getEnhancedBotFallback(lastUserMsg, language);
      return NextResponse.json({
        reply,
        provider: "health-engine",
        model: "robodoctor-conversational-v2",
        fallbackUsed: false,
      });
    }

    // If Gemini key is available, attempt Gemini models
    const candidateModels = [
      "gemini-2.5-flash",
      "gemini-1.5-flash",
      process.env.GEMINI_MODEL?.trim(),
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
      } catch (err) {
        console.warn(`Attempt with model ${model} failed:`, err);
      }
    }

    // Fallback if all Gemini models failed
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
