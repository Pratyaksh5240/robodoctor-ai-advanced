export type DrugSeverity = "major" | "moderate" | "minor" | "none";

export interface DrugInfo {
  id: string;
  genericName: string;
  brandNames: string[];
  category: string;
  commonUses: string;
  foodWarnings?: string;
  alcoholWarning?: string;
}

export interface DrugInteractionResult {
  drugA: DrugInfo;
  drugB: DrugInfo;
  severity: DrugSeverity;
  title: string;
  mechanism: string;
  symptoms: string[];
  timingAdvice: string;
  precautions: string[];
}

export interface CombinedSafetyReport {
  selectedDrugs: DrugInfo[];
  overallRisk: DrugSeverity;
  coverage: "checked" | "unchecked_pair";
  interactions: DrugInteractionResult[];
  unverifiedPairs: Array<[DrugInfo, DrugInfo]>;
  foodAndBeverageWarnings: string[];
  specialWarnings: string[];
}

export const DRUG_DATABASE: DrugInfo[] = [
  {
    id: "paracetamol",
    genericName: "Paracetamol / Acetaminophen",
    brandNames: ["Dolo 650", "Crocin", "Calpol", "Tylenol", "Panadol"],
    category: "Analgesic / Antipyretic",
    commonUses: "Fever relief, mild-to-moderate pain, headaches",
    foodWarnings: "Can be taken with or without food.",
    alcoholWarning: "Avoid chronic heavy alcohol consumption due to severe liver toxicity risk."
  },
  {
    id: "ibuprofen",
    genericName: "Ibuprofen",
    brandNames: ["Combiflam", "Brufen", "Advil", "Motrin", "Nurofen"],
    category: "NSAID (Non-Steroidal Anti-Inflammatory Drug)",
    commonUses: "Inflammation, joint pain, muscle pain, fever",
    foodWarnings: "Always take with food or milk to prevent gastric distress.",
    alcoholWarning: "Alcohol increases risk of stomach bleeding and ulcers when taking NSAIDs."
  },
  {
    id: "aspirin",
    genericName: "Aspirin (Acetylsalicylic Acid)",
    brandNames: ["Ecosprin", "Disprin", "Bayer", "Bufferin"],
    category: "NSAID / Antiplatelet (Blood Thinner)",
    commonUses: "Cardiovascular protection, stroke prevention, pain, inflammation",
    foodWarnings: "Take with meals or food to protect stomach lining.",
    alcoholWarning: "Increased risk of gastrointestinal bleeding with alcohol."
  },
  {
    id: "warfarin",
    genericName: "Warfarin",
    brandNames: ["Coumadin", "Jantoven", "Marevan", "Warf"],
    category: "Anticoagulant (Blood Thinner)",
    commonUses: "Prevents blood clots, deep vein thrombosis, atrial fibrillation",
    foodWarnings: "Maintain consistent intake of Vitamin K rich foods (spinach, kale, broccoli).",
    alcoholWarning: "Avoid heavy or binge drinking as it significantly alters blood clotting time (INR)."
  },
  {
    id: "amoxicillin",
    genericName: "Amoxicillin",
    brandNames: ["Augmentin", "Mox", "Amoxil", "Novamox"],
    category: "Penicillin Antibiotic",
    commonUses: "Bacterial infections (bacterial throat, ear, urinary, respiratory infections)",
    foodWarnings: "Can be taken with or without meals.",
    alcoholWarning: "Alcohol does not direct cut antibiotic power but slows overall immune recovery."
  },
  {
    id: "ciprofloxacin",
    genericName: "Ciprofloxacin",
    brandNames: ["Ciplox", "Cipro", "Ciprobay"],
    category: "Fluoroquinolone Antibiotic",
    commonUses: "Severe bacterial urinary, gastrointestinal, and respiratory infections",
    foodWarnings: "Avoid consuming milk, yogurt, or calcium-fortified juice within 2 hours of taking.",
    alcoholWarning: "May worsen dizziness and central nervous system side effects."
  },
  {
    id: "metformin",
    genericName: "Metformin",
    brandNames: ["Glycomet", "Glucophage", "Obimet", "Riomet"],
    category: "Biguanide Antidiabetic",
    commonUses: "Type 2 Diabetes mellitus blood sugar management",
    foodWarnings: "Best taken with meals to minimize stomach upset and nausea.",
    alcoholWarning: "Avoid excessive alcohol due to heightened risk of fatal Lactic Acidosis."
  },
  {
    id: "lisinopril",
    genericName: "Lisinopril",
    brandNames: ["Prinivil", "Zestril", "Lisoril"],
    category: "ACE Inhibitor (Blood Pressure)",
    commonUses: "Hypertension (High BP), heart failure, post-heart attack recovery",
    foodWarnings: "Avoid excessive potassium-rich salt substitutes or potassium supplements.",
    alcoholWarning: "Alcohol can excessively drop blood pressure causing dizziness or fainting."
  },
  {
    id: "amlodipine",
    genericName: "Amlodipine",
    brandNames: ["Amlong", "Norvasc", "Stamlo", "Telma-AM"],
    category: "Calcium Channel Blocker",
    commonUses: "Hypertension, chest pain (angina)",
    foodWarnings: "Grapefruit juice may increase drug blood concentrations; consume in moderation.",
    alcoholWarning: "May enhance blood pressure lowering effects leading to lightheadedness."
  },
  {
    id: "atorvastatin",
    genericName: "Atorvastatin",
    brandNames: ["Atorva", "Lipitor", "Storvas", "Totalip"],
    category: "Statin (Cholesterol-Lowering)",
    commonUses: "High cholesterol reduction, cardiovascular disease prevention",
    foodWarnings: "Avoid large quantities of grapefruit juice (more than 1.2 liters daily).",
    alcoholWarning: "Limit alcohol to avoid combined hepatic (liver) stress."
  },
  {
    id: "omeprazole",
    genericName: "Omeprazole / Pantoprazole",
    brandNames: ["Prilosec", "Omez", "Pantocid", "Pan 40", "Nexium"],
    category: "Proton Pump Inhibitor (Antacid)",
    commonUses: "Acid reflux, GERD, stomach ulcers, gastritis",
    foodWarnings: "Best taken 30 to 60 minutes before breakfast.",
    alcoholWarning: "Alcohol triggers gastric acid secretion and counteracts reflux control."
  },
  {
    id: "levothyroxine",
    genericName: "Levothyroxine",
    brandNames: ["Thyronorm", "Eltroxin", "Synthroid", "Levoxyl"],
    category: "Thyroid Hormone",
    commonUses: "Hypothyroidism (underactive thyroid replacement)",
    foodWarnings: "Take on empty stomach with plain water at least 30 to 60 mins before breakfast.",
    alcoholWarning: "Moderate alcohol intake does not directly impair thyroid hormone absorption."
  },
  {
    id: "calcium",
    genericName: "Calcium Carbonate + Vitamin D3",
    brandNames: ["Shelcal", "Caltrate", "Cipcal", "Osteocare"],
    category: "Mineral & Vitamin Supplement",
    commonUses: "Bone health, osteoporosis prevention, calcium deficiency",
    foodWarnings: "Best taken with food for optimal intestinal absorption.",
    alcoholWarning: "Heavy alcohol impairs intestinal calcium absorption and bone density."
  },
  {
    id: "cetirizine",
    genericName: "Cetirizine / Levocetirizine",
    brandNames: ["Cetzine", "Zyrtec", "Alerid", "1-AL"],
    category: "Antihistamine (Allergy)",
    commonUses: "Allergic rhinitis, hives, runny nose, sneezing, skin itching",
    foodWarnings: "Can be taken with or without food.",
    alcoholWarning: "Avoid alcohol as it increases drowsiness and slows motor reflexes."
  },
  {
    id: "metoprolol",
    genericName: "Metoprolol / Atenolol",
    brandNames: ["Betaloc", "Toprol-XL", "Metolar", "Tenormin"],
    category: "Beta Blocker",
    commonUses: "High blood pressure, tachycardia, angina, arrhythmia",
    foodWarnings: "Take with or immediately after a meal.",
    alcoholWarning: "Alcohol can destabilize blood pressure and increase drowsiness."
  }
];

export const PRESET_COMBINATIONS = [
  {
    id: "preset_bleeding",
    titleEn: "Blood Thinner + NSAID Painkiller",
    titleHi: "ब्लड थिनर + दर्द निवारक",
    drugIds: ["warfarin", "ibuprofen"]
  },
  {
    id: "preset_thyroid",
    titleEn: "Thyroid Medicine + Calcium Supplement",
    titleHi: "थायराइड दवा + कैल्शियम",
    drugIds: ["levothyroxine", "calcium"]
  },
  {
    id: "preset_antibiotic",
    titleEn: "Fluoroquinolone Antibiotic + Antacid",
    titleHi: "एंटीबायोटिक + एंटासिड",
    drugIds: ["ciprofloxacin", "omeprazole"]
  },
  {
    id: "preset_bp_potassium",
    titleEn: "BP Medicine + Painkiller",
    titleHi: "बीपी दवा + दर्द निवारक",
    drugIds: ["lisinopril", "aspirin"]
  }
];

// Defined Interaction Rules
const INTERACTION_RULES: Array<{
  pair: [string, string];
  severity: DrugSeverity;
  title: string;
  mechanism: string;
  symptoms: string[];
  timingAdvice: string;
  precautions: string[];
}> = [
  {
    pair: ["warfarin", "ibuprofen"],
    severity: "major",
    title: "Severe Bleeding & Gastrointestinal Ulceration Risk",
    mechanism: "Ibuprofen inhibits platelet function and irritates stomach lining, dramatically magnifying the anticoagulant effect of Warfarin.",
    symptoms: ["Unexplained bruising", "Bleeding gums", "Black/tarry stools", "Severe stomach pain"],
    timingAdvice: "Avoid combining NSAID painkillers with Warfarin unless prescribed under close INR blood monitoring.",
    precautions: [
      "Use Paracetamol as an alternative pain reliever after consulting your doctor.",
      "Seek emergency medical attention if dark blood or coffee-ground vomiting occurs."
    ]
  },
  {
    pair: ["warfarin", "aspirin"],
    severity: "major",
    title: "High Risk of Severe Internal Hemorrhage",
    mechanism: "Both medications suppress blood clotting through different pathways. Combining them significantly increases major bleeding risks.",
    symptoms: ["Prolonged bleeding from cuts", "Frequent nosebleeds", "Dizziness/fainting", "Severe abdominal pain"],
    timingAdvice: "Dual antiplatelet/anticoagulant therapy requires strict physician supervision.",
    precautions: [
      "Monitor blood pressure and INR levels regularly.",
      "Inform surgeons or dentists immediately if taking this combination before procedures."
    ]
  },
  {
    pair: ["levothyroxine", "calcium"],
    severity: "moderate",
    title: "Reduced Thyroid Hormone Absorption",
    mechanism: "Calcium ions bind to Levothyroxine in the stomach, forming an insoluble complex that drastically lowers drug absorption into the bloodstream.",
    symptoms: ["Fatigue", "Unexplained weight gain", "Cold intolerance", "Sluggish metabolism"],
    timingAdvice: "Separate doses by at least 4 hours. Take Levothyroxine early morning and Calcium at mid-day or evening.",
    precautions: [
      "Do not take thyroid hormone simultaneously with calcium-fortified juices or dairy supplements."
    ]
  },
  {
    pair: ["ciprofloxacin", "omeprazole"],
    severity: "moderate",
    title: "Decreased Antibiotic Bioavailability & Efficacy",
    mechanism: "Antacids like Omeprazole or metal cations alter stomach pH and chelate Ciprofloxacin, preventing full antibiotic absorption.",
    symptoms: ["Persistent bacterial infection", "Slow symptom improvement"],
    timingAdvice: "Take Ciprofloxacin at least 2 hours before or 4 to 6 hours after taking antacids.",
    precautions: [
      "Complete full antibiotic course as prescribed even if symptoms improve."
    ]
  },
  {
    pair: ["lisinopril", "ibuprofen"],
    severity: "moderate",
    title: "Reduced BP Control & Risk of Acute Kidney Injury",
    mechanism: "NSAIDs reduce renal prostaglandin synthesis, which antagonizes the blood pressure lowering effect of ACE inhibitors and increases kidney stress.",
    symptoms: ["Elevated blood pressure spikes", "Fluid retention / ankle swelling", "Reduced urine output"],
    timingAdvice: "Limit routine NSAID usage if taking blood pressure medications.",
    precautions: [
      "Stay well hydrated.",
      "Monitor blood pressure at home if taking short-term painkillers."
    ]
  },
  {
    pair: ["metformin", "alcohol"],
    severity: "major",
    title: "Risk of Lactic Acidosis & Severe Hypoglycemia",
    mechanism: "Heavy alcohol consumption combined with Metformin inhibits hepatic gluconeogenesis and can trigger rare but dangerous Lactic Acidosis.",
    symptoms: ["Muscle cramping", "Severe weakness", "Rapid breathing", "Nausea and stomach coldness"],
    timingAdvice: "Avoid binge drinking or chronic heavy alcohol consumption while taking Metformin.",
    precautions: [
      "Always consume food alongside alcohol to avoid sharp blood sugar drops."
    ]
  },
  {
    pair: ["metoprolol", "amlodipine"],
    severity: "minor",
    title: "Additive Blood Pressure & Heart Rate Slowing",
    mechanism: "Combining a Beta-blocker with a Calcium Channel Blocker produces additive heart rate lowering (bradycardia) and antihypertensive response.",
    symptoms: ["Mild dizziness when standing up quickly", "Slower pulse", "Fatigue"],
    timingAdvice: "Commonly prescribed together, but initial dosage titration should be monitored by a physician.",
    precautions: [
      "Stand up slowly from lying or sitting positions to prevent orthostatic lightheadedness."
    ]
  },
  {
    pair: ["paracetamol", "ibuprofen"],
    severity: "minor",
    title: "Safe Dual Analgesia (When Dosages are Managed)",
    mechanism: "Paracetamol and Ibuprofen work through distinct pathways (central analgesia vs peripheral anti-inflammatory) and can be safely alternated for acute fever or pain.",
    symptoms: ["None when taken within daily maximum dosage limits"],
    timingAdvice: "Stagger doses 2 to 3 hours apart or alternate between doses if fever is refractory.",
    precautions: [
      "Do not exceed maximum daily limits: 4000mg Paracetamol / 1200mg OTC Ibuprofen daily."
    ]
  }
];

export function analyzeDrugSafety(selectedIds: string[]): CombinedSafetyReport {
  const selectedDrugs = DRUG_DATABASE.filter(d => selectedIds.includes(d.id));
  const interactions: DrugInteractionResult[] = [];
  const unverifiedPairs: Array<[DrugInfo, DrugInfo]> = [];
  const foodWarningsSet = new Set<string>();
  const specialWarningsSet = new Set<string>();

  selectedDrugs.forEach(d => {
    if (d.foodWarnings) foodWarningsSet.add(`${d.genericName}: ${d.foodWarnings}`);
    if (d.alcoholWarning) specialWarningsSet.add(`${d.genericName}: ${d.alcoholWarning}`);
  });

  // Evaluate pair interactions
  for (let i = 0; i < selectedDrugs.length; i++) {
    for (let j = i + 1; j < selectedDrugs.length; j++) {
      const drugA = selectedDrugs[i];
      const drugB = selectedDrugs[j];

      const rule = INTERACTION_RULES.find(r => 
        (r.pair[0] === drugA.id && r.pair[1] === drugB.id) ||
        (r.pair[0] === drugB.id && r.pair[1] === drugA.id)
      );

      if (rule) {
        interactions.push({
          drugA,
          drugB,
          severity: rule.severity,
          title: rule.title,
          mechanism: rule.mechanism,
          symptoms: rule.symptoms,
          timingAdvice: rule.timingAdvice,
          precautions: rule.precautions
        });
      } else {
        unverifiedPairs.push([drugA, drugB]);
      }
    }
  }

  // Determine overall risk
  let overallRisk: DrugSeverity = "none";
  if (interactions.some(i => i.severity === "major")) {
    overallRisk = "major";
  } else if (interactions.some(i => i.severity === "moderate")) {
    overallRisk = "moderate";
  } else if (interactions.some(i => i.severity === "minor")) {
    overallRisk = "minor";
  }

  const coverage: "checked" | "unchecked_pair" = unverifiedPairs.length > 0 ? "unchecked_pair" : "checked";

  return {
    selectedDrugs,
    overallRisk,
    coverage,
    interactions,
    unverifiedPairs,
    foodAndBeverageWarnings: Array.from(foodWarningsSet),
    specialWarnings: Array.from(specialWarningsSet)
  };
}
