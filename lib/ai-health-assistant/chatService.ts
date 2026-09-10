import { generateStructuredJson } from "./googleAiClient";
import {
  buildBaselineHealthAnalysis,
  mergeSymptoms,
  summarizeHealthAnalysis,
  wrapExistingHealthAnalysis,
} from "./riskWrapper";
import type {
  AssistantConversationMessage,
  BaselineHealthProfile,
  ChatAssistantOutput,
  ModelMessage,
} from "./types";

type ChatModelPayload = {
  reply: string;
  followUpQuestions: string[];
  aiUrgency: "low" | "medium" | "high";
  redFlags: string[];
  nextStep: string;
  conciseAssessment: string;
};

function buildFallbackChat(
  profile: BaselineHealthProfile,
  messages: AssistantConversationMessage[]
): ChatAssistantOutput {
  const latestUserMessage =
    [...messages].reverse().find((message) => message.role === "user")?.text?.trim() ?? "";
  const enrichedProfile = mergeSymptoms(profile, latestUserMessage);
  const analysis = buildBaselineHealthAnalysis(enrichedProfile);
  const baseline = summarizeHealthAnalysis(analysis);

  const raw = latestUserMessage.toLowerCase();
  const isHi =
    /[\u0900-\u097F]/.test(latestUserMessage) ||
    /\b(mujhe|mera|meri|dard|bukhar|sirdard|pet|sans|khansi|ulti|dast|dawa|davai|kya|batao|kripya|namaste)\b/i.test(
      raw
    );

  let reply = "";
  let followUpQuestions: string[] = [];
  let redFlags: string[] = [];
  let nextStep = "";
  let conciseAssessment = "";
  let aiUrgency: "low" | "medium" | "high" = "low";

  // 1. EMERGENCY & CRITICAL SIGNS
  if (
    raw.includes("chest pain") ||
    raw.includes("सीने में दर्द") ||
    raw.includes("heart attack") ||
    raw.includes("pressure in chest") ||
    raw.includes("pain in left arm") ||
    (raw.includes("breathless") && (raw.includes("severe") || raw.includes("sudden"))) ||
    raw.includes("difficulty breathing") ||
    raw.includes("stroke") ||
    raw.includes("paralysis") ||
    raw.includes("fainted") ||
    raw.includes("loss of consciousness") ||
    raw.includes("heavy bleeding")
  ) {
    aiUrgency = "high";
    conciseAssessment = isHi
      ? "संभावित आपातकालीन लक्षण (तत्काल जांच आवश्यक)"
      : "High-risk acute symptom profile requiring urgent medical evaluation";
    reply = isHi
      ? "🚨 यह एक गंभीर या आपातकालीन लक्षण हो सकता है। सीने में दबाव, सांस लेने में गंभीर तकलीफ, या शरीर के किसी हिस्से में अचानक कमजोरी दिखने पर इंतजार न करें। तुरंत नजदीकी अस्पताल के इमरजेंसी विभाग में जाएं या एम्बुलेंस (108 / 112) को कॉल करें।"
      : "🚨 This can be a high-risk medical emergency. Severe chest discomfort, sudden breathlessness, or one-sided weakness requires immediate medical evaluation. Please contact emergency services (108 / 112) or go to the nearest emergency department right away.";
    followUpQuestions = isHi
      ? [
          "क्या दर्द बाएं हाथ, जबड़े या पीठ की तरफ फैल रहा है?",
          "क्या बहुत अधिक पसीना, चक्कर या सांस फूलने की समस्या हो रही है?",
          "क्या पहले से बीपी या हृदय संबंधी बीमारी का इतिहास है?",
        ]
      : [
          "Does the pain or tightness radiate to your left arm, jaw, neck, or back?",
          "Are you experiencing cold sweating, nausea, dizziness, or lightheadedness?",
          "Do you have a personal or family history of cardiac conditions or high blood pressure?",
        ];
    redFlags = [
      isHi ? "सीने में असहनीय दबाव या भारीपन" : "Crushing chest pressure or heaviness",
      isHi ? "सांस लेने में भारी परेशानी" : "Severe sudden shortness of breath",
      isHi ? "चेहरे या हाथ-पैर में अचानक कमजोरी" : "Sudden numbness or drooping in face/arms",
      isHi ? "बेहोशी या चक्कर खाकर गिरना" : "Fainting or loss of consciousness",
    ];
    nextStep = isHi
      ? "तुरंत आपातकालीन चिकित्सा सेवा (108 / 112) से संपर्क करें या निकटतम अस्पताल जाएं।"
      : "Seek immediate emergency hospital care (Call 108 / 112). Do not drive yourself.";
  }
  // 2. GREETINGS & CAPABILITY INQUIRIES ("how r u", "hello", "hi", "who are you")
  else if (
    /\b(how\s+(r|are)\s*(u|you)|how\s+do\s+you\s+do|how('s|s)\s+it\s+going|kaise\s+ho|kya\s+haal|kaisa\s+hai|aap\s+kaise)\b/i.test(
      raw
    )
  ) {
    aiUrgency = "low";
    conciseAssessment = isHi
      ? "स्वास्थ्य सहायक कुशलक्षेम व परिचय"
      : "Health assistant wellbeing inquiry";
    reply = isHi
      ? "नमस्ते! मैं बहुत अच्छा हूँ, पूछने के लिए धन्यवाद! 😊 मैं RoboDoctor AI, आपका 24/7 स्वास्थ्य सहायक हूँ। आज आप कैसा महसूस कर रहे हैं? क्या आप कोई लक्षण (जैसे बुखार, सिरदर्द, खांसी या दर्द) अनुभव कर रहे हैं, या दवाओं/वाइटल्स (BP या शुगर) के बारे में कोई सवाल है?"
      : "Hello! I am doing great, thank you for asking! 😊 I'm RoboDoctor AI, your 24/7 personal health assistant. How are you feeling today? Are you experiencing any symptoms (such as fever, cough, headache, or pain), or do you have a question about medications or vitals (like BP or sugar)?";
    followUpQuestions = isHi
      ? [
          "क्या आप किसी विशेष लक्षण के बारे में परामर्श चाहते हैं?",
          "क्या आपके पास कोई हालिया BP या शुगर की रीडिंग है?",
          "क्या आप किसी दवा या डाइट के बारे में जानना चाहते हैं?",
        ]
      : [
          "Are you looking for advice on a specific symptom or feeling?",
          "Do you have a recent blood pressure or blood sugar reading to check?",
          "Would you like guidance on general nutrition or medicine precautions?",
        ];
    redFlags = [];
    nextStep = isHi
      ? "अपने लक्षण या स्वास्थ्य सवाल लिखकर भेजें।"
      : "Type any symptom, question, or reading to receive triage guidance.";
  }
  // 2b. GENERAL HELLOS & CAPABILITY INQUIRIES
  else if (
    /^(h[el]+o+|h+i+|h+e+y+|namaste|pranam|greetings|hola|good\s*(morning|afternoon|evening))/i.test(
      raw
    ) ||
    raw.includes("who are you") ||
    raw.includes("what can you do") ||
    raw.includes("help me") ||
    raw.includes("aap kaun ho")
  ) {
    aiUrgency = "low";
    conciseAssessment = isHi
      ? "सामान्य परिचय एवं स्वास्थ्य सहायता"
      : "General health assistant greeting and orientation";
    reply = isHi
      ? "नमस्ते! 👋 मैं आपका RoboDoctor AI स्वास्थ्य सहायक हूँ। मैं आपके लक्षणों (जैसे बुखार, सिरदर्द, पेट दर्द), वाइटल रीडिंग (BP, शुगर, पल्स), और दवा संबंधी सवालों को समझने में मदद कर सकता हूँ। आप अभी क्या महसूस कर रहे हैं?"
      : "Hello! 👋 I am your RoboDoctor AI Health Assistant. I can help guide you through symptoms (like fever, headache, cough, stomach upset), interpret your vitals (BP, blood sugar, heart rate), and outline safe next steps. What symptoms or readings would you like to check today?";
    followUpQuestions = isHi
      ? [
          "आपको इस समय क्या मुख्य लक्षण महसूस हो रहे हैं?",
          "क्या आपके पास कोई हालिया BP या ब्लड शुगर की रीडिंग है?",
          "यह समस्या कितने समय से चल रही है?",
        ]
      : [
          "What primary symptom or concern are you currently experiencing?",
          "Do you have any recent blood pressure, pulse, or sugar readings to share?",
          "How long have these symptoms been bothering you?",
        ];
    redFlags = [];
    nextStep = isHi
      ? "अपने लक्षण या स्वास्थ्य रीडिंग लिखकर भेजें।"
      : "Type your symptoms, duration, or health readings to begin the triage check.";
  }
  // 3. FEVER & INFECTIONS / VIRAL
  else if (
    raw.includes("fever") ||
    raw.includes("बुखार") ||
    raw.includes("temperature") ||
    raw.includes("chills") ||
    raw.includes("shivering") ||
    raw.includes("dengue") ||
    raw.includes("malaria") ||
    raw.includes("typhoid") ||
    raw.includes("body ache") ||
    raw.includes("badan dard")
  ) {
    aiUrgency = "medium";
    conciseAssessment = isHi
      ? "संभावित वायरल अथवा संक्रामक बुखार (हाइड्रेशन और तापमान निगरानी आवश्यक)"
      : "Probable febrile/infectious syndrome (Monitor hydration and temperature curves)";
    reply = isHi
      ? "बुखार शरीर में किसी संक्रमण से लड़ने का संकेत होता है। पर्याप्त आराम करें, खूब पानी और तरल पदार्थ (नारियल पानी, सूप, ओआरएस) पिएं। बुखार अधिक होने पर डॉक्टर की सलाह से पैरासिटामोल (500mg या 650mg) भोजन के बाद ले सकते हैं। बिना डॉक्टर की सलाह के एंटीबायोटिक न लें।"
      : "A fever is usually your immune system fighting an infection. Prioritize bed rest and aggressive hydration (water, ORS, broths). If needed, over-the-counter Paracetamol (500mg or 650mg) after food can provide temporary fever and body ache relief. Avoid self-medicating with antibiotics or NSAIDs like ibuprofen if dengue is suspected.";
    followUpQuestions = isHi
      ? [
          "आपका थर्मामीटर से मापा गया तापमान कितना है (उदा. 100°F, 102°F)?",
          "बुखार कितने दिनों से है और क्या इसके साथ कंपकंपी या ठंड लगती है?",
          "क्या सिर में तेज दर्द, गर्दन में अकड़न, या उल्टी की समस्या भी है?",
        ]
      : [
          "What is your current recorded temperature on a thermometer (e.g. 100.5°F, 102°F)?",
          "How many days has the fever persisted, and does it come with chills or night sweats?",
          "Are you having a stiff neck, persistent vomiting, a rash, or severe headache?",
        ];
    redFlags = [
      isHi ? "103°F से अधिक तेज बुखार जो दवा से न उतरे" : "Persistent high fever over 103°F unresponsive to antipyretics",
      isHi ? "गर्दन में अकड़न या रोशनी से तेज परेशानी" : "Stiff neck, photophobia, or mental confusion",
      isHi ? "3 दिन से अधिक लगातार बुखार" : "Fever lasting more than 3 consecutive days",
      isHi ? "त्वचा पर लाल चकत्ते या सांस फूलना" : "Petechial rash, bleeding gums, or breathing difficulty",
    ];
    nextStep = isHi
      ? "दिन में 3-4 बार तापमान नोट करें, तरल पदार्थ पिएं और 48 घंटे से अधिक बुखार रहने पर सीबीसी व डॉक्टर जांच कराएं।"
      : "Log temperature every 4-6 hours, hydrate thoroughly, and see a clinician for a CBC / workup if fever exceeds 48 hours.";
  }
  // 4. COUGH, COLD, SORE THROAT & RESPIRATORY
  else if (
    raw.includes("cough") ||
    raw.includes("खांसी") ||
    raw.includes("sore throat") ||
    raw.includes("throat") ||
    raw.includes("gale me dard") ||
    raw.includes("cold") ||
    raw.includes("khansi") ||
    raw.includes("runny nose") ||
    raw.includes("sneezing") ||
    raw.includes("congestion") ||
    raw.includes("phlegm") ||
    raw.includes("balgam")
  ) {
    aiUrgency = "low";
    conciseAssessment = isHi
      ? "ऊपरी श्वसन नली का हल्का संक्रमण या एलर्जी (गले की देखभाल व आराम आवश्यक)"
      : "Upper respiratory tract symptoms / irritation (Symptomatic and airway care)";
    reply = isHi
      ? "खांसी और गले की खराश आमतौर पर मौसमी वायरल या एलर्जी के कारण होती है। दिन में 2-3 बार हल्के गुनगुने पानी में नमक डालकर गरारे करें, गर्म पानी की भाप लें और शहद-अदरक का गर्म काढ़ा पिएं। ठंडी व खट्टी चीजों से परहेज रखें।"
      : "Cough and throat irritation are commonly caused by viral upper respiratory infections or allergens. Warm saline gargles twice daily, steam inhalation, and warm fluids (ginger tea or honey-lemon water) provide soothing relief. Ensure your throat stays moist and avoid very cold or dry environments.";
    followUpQuestions = isHi
      ? [
          "क्या खांसी सूखी है या बलगम/कफ के साथ आ रही है?",
          "क्या खांसी के साथ सांस लेने में सीटी जैसी आवाज या सीने में जकड़न है?",
          "यह खांसी कितने दिनों या हफ्तों से बनी हुई है?",
        ]
      : [
          "Is your cough predominantly dry, tickly, or productive with phlegm/mucus?",
          "Are you experiencing any wheezing, chest tightness, or shortness of breath?",
          "How long have you had this cough (more or less than 2 weeks)?",
        ];
    redFlags = [
      isHi ? "खांसी के साथ बलगम में खून आना" : "Coughing up blood or blood-tinged sputum",
      isHi ? "सांस लेने में भारी कठिनाई या पसलियां चलना" : "Significant breathlessness or stridor",
      isHi ? "2-3 सप्ताह से अधिक पुरानी खांसी" : "Chronic cough lasting longer than 3 weeks",
    ];
    nextStep = isHi
      ? "गुनगुने पानी के गरारे करें और भाप लें; यदि 10 दिन से अधिक खांसी रहे या बलगम में खून दिखे तो डॉक्टर से छाती की जांच कराएं।"
      : "Continue warm saline gargles and hydration; seek medical review if cough lasts over 2 weeks or produces colored thick mucus.";
  }
  // 5. BLOOD PRESSURE
  else if (
    raw.includes("bp") ||
    raw.includes("blood pressure") ||
    raw.includes("hypertension") ||
    raw.includes("hypotension") ||
    /\b\d{2,3}\s*\/\s*\d{2,3}\b/.test(raw)
  ) {
    const bpMatch = raw.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
    const sys = bpMatch ? parseInt(bpMatch[1], 10) : Number(enrichedProfile.bloodPressure?.split("/")[0]) || null;
    const dia = bpMatch ? parseInt(bpMatch[2], 10) : Number(enrichedProfile.bloodPressure?.split("/")[1]) || null;

    if (sys && dia && (sys >= 180 || dia >= 120)) {
      aiUrgency = "high";
      conciseAssessment = isHi
        ? "अत्यधिक उच्च ब्लड प्रेशर (हाइपरटेंसिव क्राइसिस का खतरा)"
        : "Severely elevated BP (Hypertensive urgency / crisis range)";
      reply = isHi
        ? `⚠️ आपकी बीपी रीडिंग (${sys}/${dia} mmHg) बहुत अधिक है। 5 मिनट शांत बैठकर दोबारा मापें। यदि यह अभी भी 180/120 के करीब है और सिरदर्द, सीने में भारीपन या धुंधला दिख रहा है, तो तुरंत डॉक्टर या इमरजेंसी वार्ड में जाएं।`
        : `⚠️ Your blood pressure reading of ${sys}/${dia} mmHg is critically elevated. Rest quietly for 5 minutes and repeat the measurement. If it remains near or above 180/120 mmHg, particularly with chest tightness, shortness of breath, or severe headache, seek immediate medical attention.`;
      nextStep = isHi ? "तुरंत डॉक्टर या आपातकालीन वार्ड से संपर्क करें।" : "Seek immediate medical evaluation.";
    } else if (sys && dia && (sys >= 140 || dia >= 90)) {
      aiUrgency = "medium";
      conciseAssessment = isHi
        ? "उच्च ब्लड प्रेशर (स्टेज 1/2 हाइपरटेंशन)"
        : "Elevated / Hypertensive blood pressure reading";
      reply = isHi
        ? `आपकी बीपी रीडिंग (${sys}/${dia} mmHg) सामान्य से अधिक है (आदर्श रीडिंग 120/80 होती है)। नमक का सेवन कम करें (दिन में 1 छोटा चम्मच से कम), नियमित टहलें, तनाव कम करें और इसे एक डायरी में नोट करें। डॉक्टर से मिलकर दवा की जरूरत की समीक्षा करें।`
        : `Your BP reading (${sys}/${dia} mmHg) is above normal (ideal target is around 120/80 mmHg). Cut down on dietary sodium and packaged snacks, maintain 30 minutes of brisk walking, and log morning and evening readings in a diary for your doctor's review.`;
      nextStep = isHi
        ? "नमक कम करें और 3-4 दिन सुबह-शाम बीपी नोट करके डॉक्टर को दिखाएं।"
        : "Maintain a BP log for 3-5 days and schedule a routine physician review.";
    } else {
      aiUrgency = "low";
      conciseAssessment = isHi ? "ब्लड प्रेशर मार्गदर्शन" : "Blood pressure wellness overview";
      reply = isHi
        ? "सामान्य स्वस्थ बीपी 120/80 mmHg के आसपास माना जाता है। बीपी नापते समय 5 मिनट पहले शांत बैठें, बात न करें और मशीन का कफ दिल की ऊंचाई पर रखें। स्वस्थ बीपी के लिए कम नमक और रोजाना वॉक जरूरी है।"
        : "A healthy resting blood pressure is typically around 120/80 mmHg. Always rest quietly for 5 minutes before taking a reading with an arm cuff at heart level. Regular aerobic exercise and moderate sodium intake keep arteries flexible.";
      nextStep = isHi ? "हफ्ते में 1 बार नियमित बीपी जांचें।" : "Check resting BP periodically.";
    }
    followUpQuestions = isHi
      ? [
          "क्या आप वर्तमान में कोई बीपी की नियमित दवा ले रहे हैं?",
          "क्या सिर में भारीपन, चक्कर या आंखों में धुंधलापन महसूस होता है?",
          "यह रीडिंग किस समय और किस स्थिति में ली गई थी?",
        ]
      : [
          "Are you currently prescribed any antihypertensive medications?",
          "Do you have headaches, dizziness, or vision changes accompanying this reading?",
          "Was this measurement taken while completely rested?",
        ];
    redFlags = [
      isHi ? "180/120 mmHg से अधिक बीपी" : "BP at or above 180/120 mmHg",
      isHi ? "बीपी के साथ सीने में दर्द या सांस फूलना" : "High BP paired with chest pain or breathlessness",
      isHi ? "अचानक धुंधला दिखना या भ्रम होना" : "Sudden vision blurring, mental confusion, or weakness",
    ];
  }
  // 6. HEADACHE & MIGRAINE
  else if (
    raw.includes("headache") ||
    raw.includes("सिरदर्द") ||
    raw.includes("sir dard") ||
    raw.includes("migraine") ||
    raw.includes("head pain") ||
    raw.includes("half head")
  ) {
    aiUrgency = "low";
    conciseAssessment = isHi
      ? "तनाव या माइग्रेन संबंधी सिरदर्द (स्क्रीन समय व पानी की जांच करें)"
      : "Cephalea / Headache syndrome (Tension vs Migrainous spectrum)";
    reply = isHi
      ? "सिरदर्द के मुख्य कारणों में पानी की कमी, नींद पूरी न होना, तनाव, लगातार स्क्रीन देखना या माइग्रेन शामिल हैं। शांत व अंधेरे कमरे में आराम करें, भरपूर पानी पिएं और माथे पर ठंडा या गुनगुना सेक लगाएं। यदि आवश्यकता हो तो पैरासिटामोल ले सकते हैं।"
      : "Most headaches stem from dehydration, eye strain, lack of sleep, muscle tension, or migraine tendencies. Rest in a dark, quiet room, hydrate well, and try a cold or warm compress on your forehead or neck. Simple analgesics like Paracetamol may help if taken early.";
    followUpQuestions = isHi
      ? [
          "दर्द सिर के एक हिस्से में धड़कन जैसा है या दोनों तरफ भारीपन है?",
          "क्या रोशनी, तेज आवाज या उल्टी जैसा महसूस होता है?",
          "क्या आपने हाल ही में अपना ब्लड प्रेशर जांचा है?",
        ]
      : [
          "Is the pain throbbing on one side (migrainous) or a dull band around the head (tension)?",
          "Do you have sensitivity to light/sound, nausea, or visual aura spots?",
          "What is your recent blood pressure reading?",
        ];
    redFlags = [
      isHi ? "अचानक हुआ अत्यधिक तेज 'बिजली कड़कने' जैसा सिरदर्द" : "Sudden severe 'thunderclap' onset headache",
      isHi ? "सिरदर्द के साथ तेज बुखार और गर्दन का न मुड़ना" : "Headache accompanied by high fever and neck stiffness",
      isHi ? "बोलने में लड़खड़ाहट, कमजोरी या एक आंख से न दिखना" : "Neurological deficits, slurred speech, or visual loss",
    ];
    nextStep = isHi
      ? "स्क्रीन से ब्रेक लें, 2-3 गिलास पानी पिएं और आराम करें; यदि बीपी 160 से अधिक हो तो डॉक्टर को दिखाएं।"
      : "Step away from screens, drink water, and rest; check your BP and consult a physician if headaches recur frequently.";
  }
  // 7. STOMACH PAIN, ACIDITY, GAS & GERD
  else if (
    raw.includes("stomach") ||
    raw.includes("pet dard") ||
    raw.includes("acidity") ||
    raw.includes("acid reflux") ||
    raw.includes("heartburn") ||
    raw.includes("gas") ||
    raw.includes("bloating") ||
    raw.includes("indigestion") ||
    raw.includes("gastric") ||
    raw.includes("seene me jalan")
  ) {
    aiUrgency = "low";
    conciseAssessment = isHi
      ? "गैस, एसिडिटी या अपच संबंधी परेशानी (आहार नियंत्रण आवश्यक)"
      : "Gastrointestinal discomfort / Dyspepsia / Acid reflux";
    reply = isHi
      ? "पेट में जलन, गैस या भारीपन अक्सर अनियमित भोजन, चाय-कॉफी की अधिकता या तीखे-तले खाने से होता है। अधिक मिर्च-मसाले से बचें, एक बार में भरपेट न खाकर हल्का भोजन लें और खाने के तुरंत बाद न लेटें। राहत के लिए एंटासिड सिरप या ठंडा दूध ले सकते हैं।"
      : "Abdominal discomfort, burning in the upper stomach, and gas are frequently triggered by heavy, oily, or acidic meals, caffeine, or irregular eating schedules. Eat smaller, frequent meals, avoid lying down for at least 2 hours after eating, and consider an over-the-counter antacid for fast symptomatic relief.";
    followUpQuestions = isHi
      ? [
          "दर्द पेट के किस हिस्से में है (ऊपर छाती के पास, नाभि के आसपास, या नीचे दाईं तरफ)?",
          "क्या खाने के तुरंत बाद सीने में खट्टा पानी या जलन महसूस होती है?",
          "क्या उल्टी, बुखार या शौच में किसी प्रकार का बदलाव हुआ है?",
        ]
      : [
          "Where is the pain centered (upper epigastric, around navel, or lower right abdomen)?",
          "Is there acid regurgitation, sour taste, or burning in the chest after meals?",
          "Have you had any vomiting, fever, or change in bowel habits?",
        ];
    redFlags = [
      isHi ? "पेट के निचले दाएं हिस्से में असहनीय तेज दर्द (अपेंडिक्स का खतरा)" : "Severe acute pain in the lower right abdomen (possible appendicitis)",
      isHi ? "खून की उल्टी या गहरे काले रंग का मल आना" : "Vomiting blood or passing black tarry stools",
      isHi ? "पेट का पत्थर जैसा सख्त हो जाना" : "Board-like abdominal rigidity or severe tenderness",
    ];
    nextStep = isHi
      ? "हल्की मूंग दाल खिचड़ी या ओट्स लें, तीखे भोजन से बचें; यदि दर्द पेट के निचले हिस्से में तेजी से बढ़े तो तुरंत डॉक्टर को दिखाएं।"
      : "Adopt a bland non-spicy diet (khichdi, oats, curd); seek urgent medical evaluation if pain is severe or localized to the lower right.";
  }
  // 8. DIARRHEA, VOMITING & FOOD POISONING
  else if (
    raw.includes("diarrhea") ||
    raw.includes("dast") ||
    raw.includes("loose motion") ||
    raw.includes("vomiting") ||
    raw.includes("ulti") ||
    raw.includes("food poisoning") ||
    raw.includes("nausea")
  ) {
    aiUrgency = "medium";
    conciseAssessment = isHi
      ? "गैस्ट्रोएंटेराइटिस अथवा फूड पॉइजनिंग (डिहाइड्रेशन से बचाव सर्वोच्च प्राथमिकता)"
      : "Acute gastroenteritis / Diarrheal illness (Dehydration prevention is top priority)";
    reply = isHi
      ? "दस्त या उल्टी में सबसे बड़ा खतरा शरीर में पानी व नमक की कमी (डिहाइड्रेशन) का होता है। हर दस्त के बाद 1 गिलास ओआरएस (ORS) का घोल घूंट-घूंट करके पिएं। नारियल पानी, छाछ और चावल का मांड़ भी बहुत लाभकारी है। हल्का खाना जैसे केला, उबले चावल, मूंग दाल खिचड़ी और टोस्ट (BRAT डाइट) लें।"
      : "With diarrhea or vomiting, fluid and electrolyte loss is the primary risk. Drink WHO-formula Oral Rehydration Solution (ORS) in small, frequent sips after every loose stool. Coconut water and buttermilk are also beneficial. Stick to bland foods (bananas, white rice, applesauce, toast/khichdi) and strictly avoid dairy, oily items, and sugary juices.";
    followUpQuestions = isHi
      ? [
          "आज लगभग कितनी बार उल्टी या पतले दस्त हुए हैं?",
          "क्या आप पानी या ओआरएस पचा पा रहे हैं या पीते ही उल्टी हो रही है?",
          "क्या मल में खून या पेट में बहुत तेज मरोड़ है?",
        ]
      : [
          "Approximately how many loose stools or vomiting episodes have occurred today?",
          "Are you able to keep sips of fluid down without immediately vomiting?",
          "Is there any visible blood, mucus in the stool, or associated high fever?",
        ];
    redFlags = [
      isHi ? "पेशाब का बहुत कम आना या गहरे पीले रंग का होना (गंभीर डिहाइड्रेशन)" : "Signs of severe dehydration (sunken eyes, no urination for 6+ hours)",
      isHi ? "मुंह का अत्यधिक सूखना, कमजोरी से चक्कर आना" : "Dry mouth, lightheadedness upon standing, confusion",
      isHi ? "मल में खून आना या लगातार अनियंत्रित उल्टी" : "Blood in the stool or completely inability to retain oral fluids",
    ];
    nextStep = isHi
      ? "तुरंत ओआरएस घोल पीना शुरू करें; यदि 24 घंटे में सुधार न हो या पेशाब रुक जाए तो अस्पताल जाकर ड्रिप/जांच कराएं।"
      : "Start oral rehydration immediately; visit an outpatient clinic for fluids if vomiting prevents any oral intake.";
  }
  // 9. BLOOD SUGAR & DIABETES
  else if (
    raw.includes("sugar") ||
    raw.includes("शुगर") ||
    raw.includes("diabetes") ||
    raw.includes("glucose") ||
    raw.includes("fasting") ||
    raw.includes("hba1c")
  ) {
    const sugarNum = Number(raw.match(/\b(\d{2,3})\b/)?.[1] || enrichedProfile.sugar);

    if (sugarNum && sugarNum < 70) {
      aiUrgency = "high";
      conciseAssessment = isHi ? "हाइपोग्लाइसीमिया (लो ब्लड शुगर - तुरंत ध्यान दें)" : "Hypoglycemia (Low blood sugar - Action needed)";
      reply = isHi
        ? `⚠️ आपकी शुगर रीडिंग (${sugarNum} mg/dL) खतरनाक रूप से कम है (70 से कम)। तुरंत '15-15 का नियम' अपनाएं: 3 चम्मच चीनी, आधा गिलास फलों का जूस या 1 चम्मच शहद तुरंत लें। 15 मिनट बाद दोबारा शुगर जांचें।`
        : `⚠️ Your blood sugar (${sugarNum} mg/dL) is in the hypoglycemia range (<70 mg/dL). Apply the Rule of 15 immediately: consume 15 grams of fast-acting carbohydrate (3 teaspoons of sugar in water, 1/2 cup fruit juice, or 3 glucose tablets). Rest and re-check sugar in 15 minutes.`;
      nextStep = isHi ? "तुरंत 15 ग्राम मीठा लें और 15 मिनट बाद री-टेस्ट करें।" : "Take 15g fast sugars now and re-test in 15 minutes.";
    } else if (sugarNum && sugarNum >= 200) {
      aiUrgency = "medium";
      conciseAssessment = isHi ? "उच्च ब्लड शुगर (हाइपरग्लाइसीमिया)" : "Elevated blood sugar (Hyperglycemia)";
      reply = isHi
        ? `आपकी शुगर रीडिंग (${sugarNum} mg/dL) बढ़ी हुई है। पर्याप्त पानी पिएं, मीठे खाद्य पदार्थों व मैदे से पूरी तरह परहेज करें। यदि आप इंसुलिन या दवा लेते हैं तो अपने डॉक्टर द्वारा निर्धारित डोज का पालन करें।`
        : `Your blood sugar reading (${sugarNum} mg/dL) is high. Stay well hydrated with plain water to flush excess glucose, strictly avoid simple sugars and refined carbs, and verify your prescribed medication timing with your diabetologist.`;
      nextStep = isHi ? "पानी पिएं, मीठा बंद रखें और डॉक्टर से सलाह लें।" : "Hydrate, monitor ketones/sugar, and consult your physician.";
    } else {
      aiUrgency = "low";
      conciseAssessment = isHi ? "ब्लड शुगर मार्गदर्शन" : "Blood sugar wellness guidance";
      reply = isHi
        ? "सामान्य फास्टिंग शुगर 70 से 99 mg/dL और खाने के 2 घंटे बाद 140 mg/dL से कम होनी चाहिए। फाइबर युक्त आहार (सलाद, मेथी, चोकरदार रोटी) और 30 मिनट की वॉक शुगर को नियंत्रित रखने में सबसे कारगर है।"
        : "Normal fasting blood sugar ranges between 70–99 mg/dL, and under 140 mg/dL two hours post-meal. A high-fiber diet, limiting refined carbohydrates, and 30 minutes of daily brisk walking are the best lifestyle pillars for glycemic stability.";
      nextStep = isHi ? "खाली पेट और खाने के बाद की शुगर ट्रैक करें।" : "Track fasting and postprandial glucose levels.";
    }
    followUpQuestions = isHi
      ? [
          "क्या यह खाली पेट (Fasting) की रीडिंग है या खाना खाने के बाद (PP) की?",
          "क्या आपको डायबिटीज की कोई दवा या इंसुलिन चल रहा है?",
          "क्या बहुत अधिक प्यास, बार-बार पेशाब या कमजोरी की शिकायत है?",
        ]
      : [
          "Was this a fasting sample or measured 2 hours after a meal?",
          "Are you currently on oral diabetes pills (like Metformin) or insulin?",
          "Are you feeling excessive thirst, frequent urination, or unexplained fatigue?",
        ];
    redFlags = [
      isHi ? "शुगर 54 mg/dL से कम या बेहोशी के लक्षण" : "Severe hypoglycemia under 54 mg/dL with altered sensorium",
      isHi ? "300 से अधिक शुगर के साथ लगातार उल्टी या सांस में फल जैसी गंध" : "Sugar >300 mg/dL with vomiting or deep rapid breathing (DKA)",
    ];
  }
  // 10. MEDICINE & OTC GUIDANCE
  else if (
    raw.includes("medicine") ||
    raw.includes("dawa") ||
    raw.includes("davai") ||
    raw.includes("tablet") ||
    raw.includes("paracetamol") ||
    raw.includes("dolo") ||
    raw.includes("crocin") ||
    raw.includes("cetirizine") ||
    raw.includes("pantoprazole") ||
    raw.includes("combiflam")
  ) {
    aiUrgency = "low";
    conciseAssessment = isHi ? "दवा सुरक्षा व सामान्य मार्गदर्शन" : "Medication safety & OTC education";
    reply = isHi
      ? "दवाओं के मामले में सावधानी बहुत जरूरी है। बुखार या बदन दर्द के लिए पैरासिटामोल (500mg/650mg) वयस्कों में भोजन के बाद ली जाने वाली एक सुरक्षित सामान्य दवा है (24 घंटे में अधिकतम 3-4 ग्राम)। खाली पेट दर्द निवारक दवाएं (जैसे ब्रूफेन, कॉम्बीफ्लेम) लेने से बचें क्योंकि वे पेट में अल्सर कर सकती हैं। बिना डॉक्टर पर्चे के एंटीबायोटिक कभी न लें।"
      : "Medication safety is vital: Paracetamol (500mg/650mg) is a standard antipyretic/analgesic that should be taken after food (maximum 3–4 grams daily in adults). Never take NSAIDs (like Ibuprofen) on an empty stomach due to gastric irritation risk. Crucially, never take antibiotics without an explicit doctor's prescription and culture evaluation.";
    followUpQuestions = isHi
      ? [
          "आप किस विशेष लक्षण या बीमारी के लिए दवा के बारे में पूछ रहे हैं?",
          "क्या आपको किसी दवा से एलर्जी या लिवर/किडनी की कोई बीमारी है?",
          "क्या आप वर्तमान में कोई अन्य नियमित दवाएं भी ले रहे हैं?",
        ]
      : [
          "What specific condition or symptom are you considering medication for?",
          "Do you have any drug allergies, liver conditions, or kidney disease?",
          "Are you currently taking any other chronic prescription drugs?",
        ];
    redFlags = [
      isHi ? "दवा लेने के बाद सांस फूलना या चेहरे/होंठों पर सूजन (एलर्जी रिएक्शन)" : "Anaphylaxis: swelling of lips/face, hives, or breathing difficulty after meds",
      isHi ? "एक साथ कई दवाएं मिलाना बिना जांचे" : "Accidental duplication of paracetamol across multiple cold brand medicines",
    ];
    nextStep = isHi
      ? "होमपेज पर हमारे 'Drug Interaction Checker' से दो दवाओं के आपसी रिएक्शन की जांच करें।"
      : "Use our Drug Interaction Checker on the homepage before taking multiple medications together.";
  }
  // 11. GENERAL HEALTH / DEFAULT TAILORED TRIAGE
  else {
    aiUrgency = baseline.riskLevel === "High" ? "high" : baseline.riskLevel === "Moderate" ? "medium" : "low";
    conciseAssessment = isHi
      ? `${baseline.summary} (क्लिनिकल स्वास्थ्य समीक्षा)`
      : `${baseline.summary} (Clinical triage evaluation)`;
    reply = isHi
      ? `आपके बताए गए लक्षणों और प्रोफाइल के आधार पर: ${baseline.summary} ${baseline.recommendations[0] || "अपने लक्षणों को रोजाना नोट करें और स्थिति बिगड़ने पर डॉक्टर से परामर्श लें।"}`
      : `Based on your reported details: ${baseline.summary} ${baseline.recommendations[0] || "Keep a daily log of symptoms, maintain hydration and rest, and consult a physician if discomfort intensifies."}`;
    followUpQuestions = isHi
      ? [
          "यह लक्षण कितने दिनों से महसूस हो रहा है और क्या यह धीरे-धीरे बढ़ रहा है?",
          "क्या आपको बुखार, सीने में दर्द, या सांस लेने में कोई परेशानी है?",
          "क्या आप पहले से किसी पुरानी बीमारी (जैसे बीपी, थायरॉइड, शुगर) के मरीज हैं?",
        ]
      : [
          "How many days have you been noticing these symptoms, and are they worsening?",
          "Are you experiencing any accompanying fever, chest tightness, or breathlessness?",
          "Do you have any existing chronic conditions (such as diabetes, hypertension, or asthma)?",
        ];
    redFlags = baseline.urgentFlags.length
      ? baseline.urgentFlags
      : [
          isHi ? "सांस लेने में गंभीर तकलीफ या बेहोशी" : "Severe breathlessness, fainting, or sudden collapse",
          isHi ? "असहनीय दर्द जो साधारण आराम से कम न हो" : "Intense unremitting pain or high fever",
        ];
    nextStep = baseline.recommendations[0] || (isHi ? "लक्षणों पर नजर रखें और डॉक्टर से सलाह लें।" : "Monitor symptoms and schedule a clinical evaluation.");
  }

  return {
    reply: reply.trim(),
    followUpQuestions: followUpQuestions.slice(0, 4),
    redFlags: redFlags.slice(0, 4),
    nextStep: nextStep.trim(),
    risk: wrapExistingHealthAnalysis(analysis, aiUrgency, conciseAssessment, redFlags),
    baseline,
    provider: "fallback",
    model: "clinical-triage-v2",
    fallbackUsed: true,
  };
}

function toModelMessages(messages: AssistantConversationMessage[]): ModelMessage[] {
  return messages
    .map((message) => ({
      role: message.role,
      parts: [
        {
          kind: "text" as const,
          text: message.text.trim(),
        },
      ],
    }))
    .filter((message) => message.parts[0].text.length > 0);
}

export async function runSymptomChat(input: {
  profile: BaselineHealthProfile;
  messages: AssistantConversationMessage[];
}): Promise<ChatAssistantOutput> {
  const latestUserMessage =
    [...input.messages].reverse().find((message) => message.role === "user")
      ?.text ?? "";
  const enrichedProfile = mergeSymptoms(input.profile, latestUserMessage);
  const analysis = buildBaselineHealthAnalysis(enrichedProfile);
  const baseline = summarizeHealthAnalysis(analysis);

  const contextBlock = [
    "Patient profile for context only:",
    `- Age: ${enrichedProfile.age ?? "unknown"}`,
    `- Height (cm): ${enrichedProfile.heightCm ?? "unknown"}`,
    `- Weight (kg): ${enrichedProfile.weightKg ?? "unknown"}`,
    `- Blood pressure: ${enrichedProfile.bloodPressure ?? "unknown"}`,
    `- Sugar: ${enrichedProfile.sugar ?? "unknown"}`,
    `- Heart rate: ${enrichedProfile.heartRate ?? "unknown"}`,
    `- Symptoms note: ${enrichedProfile.symptoms ?? "none"}`,
    `- Existing rule-based risk level: ${baseline.riskLevel}`,
    `- Existing rule-based risk score: ${baseline.riskScore}`,
    `- Existing rule-based summary: ${baseline.summary}`,
    baseline.urgentFlags.length
      ? `- Existing rule-based urgent flags: ${baseline.urgentFlags.join(" | ")}`
      : "- Existing rule-based urgent flags: none",
  ].join("\n");

  try {
    const { data, meta } = await generateStructuredJson<ChatModelPayload>({
      systemInstruction: [
        "You are RoboDoctor AI's AI Health Assistant for symptom conversations.",
        "Be cautious, practical, and non-alarmist. Do not diagnose with certainty.",
        "Use the provided rule-based health screening as context, but continue the conversation naturally.",
        "Ask follow-up questions when information is missing.",
        "If you see emergency warning signs, say so clearly and recommend urgent care.",
        "Return strict JSON only with keys: reply, followUpQuestions, aiUrgency, redFlags, nextStep, conciseAssessment.",
        "reply must be plain-language and 2 to 5 sentences.",
        "followUpQuestions must contain 1 to 4 short questions.",
        "aiUrgency must be one of low, medium, high.",
        "nextStep must be one concrete next action.",
        "conciseAssessment must be a short explanation of concern level without diagnosing.",
      ].join("\n"),
      messages: [
        {
          role: "user",
          parts: [{ kind: "text", text: contextBlock }],
        },
        ...toModelMessages(input.messages),
      ],
      maxOutputTokens: 2048,
      temperature: 0.2,
    });

    let replyText = typeof data.reply === "string" ? data.reply.trim() : "";
    const replyFieldMatch = replyText.match(/"reply"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"|"\s*\}|$)/);
    if (replyFieldMatch) {
      replyText = replyFieldMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').trim();
    } else if (replyText.startsWith("{") && replyText.endsWith("}")) {
      try {
        const nested = JSON.parse(replyText);
        if (nested.reply && typeof nested.reply === "string") {
          replyText = nested.reply.trim();
        }
      } catch {}
    }

    return {
      reply: replyText || (data.reply ? String(data.reply).trim() : "Thank you for sharing your symptoms. Please monitor them closely."),
      followUpQuestions: (data.followUpQuestions || [])
        .map((question) => String(question).trim())
        .filter(Boolean)
        .slice(0, 4),
      redFlags: (data.redFlags || [])
        .map((flag) => String(flag).trim())
        .filter(Boolean)
        .slice(0, 6),
      nextStep: typeof data.nextStep === "string" ? data.nextStep.trim() : "Monitor symptoms and discuss with your physician.",
      risk: wrapExistingHealthAnalysis(
        analysis,
        data.aiUrgency || "low",
        data.conciseAssessment || "Clinical assessment",
        data.redFlags || []
      ),
      baseline,
      provider: meta.provider,
      model: meta.model,
      fallbackUsed: false,
    };
  } catch (err) {
    console.warn("runSymptomChat error:", err);
    return buildFallbackChat(input.profile, input.messages);
  }
}
