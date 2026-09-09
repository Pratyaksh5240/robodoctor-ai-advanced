import { createWorker } from "tesseract.js";
import sharp from "sharp";
import path from "path";

export type ScannedMedicineItem = {
  name: string;
  dosageGuess?: string;
  frequencyGuess?: string;
  whenToEat?: string;
  howMuchToEat?: string;
  harmOveruse?: string;
  purpose?: string;
  confidence: "high" | "medium" | "low";
};

interface ClinicalDrugRule {
  id: string;
  canonicalName: string;
  aliases: string[];
  defaultDosage: string;
  defaultFrequency: string;
  whenToEat: string;
  howMuchToEat: string;
  harmOveruse: string;
  purpose: string;
}

const CLINICAL_DRUG_RULES: ClinicalDrugRule[] = [
  // OTC & HOUSEHOLD MEDICINES (Topical Balms, Ointments, Syrups)
  {
    id: "vicks",
    canonicalName: "Vicks VapoRub (Camphor, Menthol & Eucalyptus)",
    aliases: ["vicks", "vaporub", "vapo rub", "action 500", "vaporub classic"],
    defaultDosage: "10ml / 25ml / 50ml Topical Rub",
    defaultFrequency: "Apply 2 to 3 times daily or as needed",
    whenToEat: "Topical application or steam inhalation: Rub gently on chest, throat, and back before bedtime. Or add 1-2 teaspoons into hot water for steam inhalation. NEVER swallow or ingest orally.",
    howMuchToEat: "Adults and children over 2 years: Apply a generous layer to chest, throat, and back. Do not apply inside nostrils or on broken/damaged skin.",
    harmOveruse: "TOXIC IF SWALLOWED — Camphor can cause severe central nervous system seizures and poisoning if ingested orally. Do not heat directly in microwave.",
    purpose: "Topical decongestant & analgesic: relieves cough, nasal congestion, body aches, and cold symptoms.",
  },
  {
    id: "volini",
    canonicalName: "Volini / Pain Relief Gel (Diclofenac & Methyl Salicylate)",
    aliases: ["volini", "moov", "iodex", "omnigel", "relispray", "fastum", "move"],
    defaultDosage: "Topical Gel / Spray",
    defaultFrequency: "Apply 2 to 3 times daily",
    whenToEat: "Apply a thin layer to the affected painful area and massage gently until absorbed. Wash hands thoroughly with soap after application.",
    howMuchToEat: "Apply 2g to 4g to painful area 2-3 times daily as needed for pain.",
    harmOveruse: "For external use only. Do not apply to open cuts, burns, or eyes. Excessive application over large body surfaces can cause systemic NSAID toxicity.",
    purpose: "Topical NSAID pain relief: relieves joint pain, muscle sprains, neck stiffness, and backache.",
  },
  {
    id: "benadryl",
    canonicalName: "Cough Syrup (Diphenhydramine / Expectorant)",
    aliases: ["benadryl", "ascoril", "corex", "grilinctus", "chericof", "alex", "zedex", "cofsils", "koflet", "cough syrup"],
    defaultDosage: "5ml - 10ml Oral Liquid",
    defaultFrequency: "Every 6 to 8 hours as needed (1-1-1)",
    whenToEat: "Take 5ml to 10ml after food using a calibrated medicine cup. Shake the bottle well before each dose.",
    howMuchToEat: "Adults: 5ml to 10ml up to 3 times daily (do not exceed 30ml in 24 hours).",
    harmOveruse: "May cause significant drowsiness, dizziness, and impaired alertness. Avoid driving, machinery, and alcohol.",
    purpose: "Antitussive and expectorant: relieves productive cough, bronchial irritation, and throat tickle.",
  },
  {
    id: "digene",
    canonicalName: "Digene / Antacid (Magnesium & Aluminium Hydroxide)",
    aliases: ["digene", "gelusil", "eno", "gaviscon", "polycrol", "antacid"],
    defaultDosage: "10ml Liquid or 2 Chewable Tablets",
    defaultFrequency: "After meals and at bedtime as needed",
    whenToEat: "Take 10ml of liquid or chew 1 to 2 tablets thoroughly 30 minutes after meals and at bedtime.",
    howMuchToEat: "Adults: 10ml to 20ml per dose. Do not exceed 6 doses in 24 hours.",
    harmOveruse: "Prolonged excessive use can alter bowel habits (aluminum causes constipation, magnesium causes diarrhea) and interfere with drug absorption.",
    purpose: "Antacid: rapid neutralization of gastric acid, relieving heartburn, acidity, sour stomach, and indigestion.",
  },
  {
    id: "otrivin",
    canonicalName: "Otrivin / Nasivion (Xylometazoline Nasal Decongestant)",
    aliases: ["otrivin", "nasivion", "xylometazoline", "nasal drops", "nasal spray"],
    defaultDosage: "0.1% / 1-2 Sprays per nostril",
    defaultFrequency: "2 to 3 times daily (Max 5 consecutive days)",
    whenToEat: "Blow nose gently before use. Administer 1 to 2 drops/sprays into each nostril while breathing in gently.",
    howMuchToEat: "1 to 2 drops in each nostril, 2-3 times daily. Strictly do NOT exceed 5 consecutive days of continuous use.",
    harmOveruse: "Rebound congestion (rhinitis medicamentosa): nose becomes permanently blocked if used beyond 5 days. Can also elevate blood pressure.",
    purpose: "Nasal vasoconstrictor: opens blocked nasal passages and relieves sinus congestion within 2 minutes.",
  },
  {
    id: "betadine",
    canonicalName: "Betadine / Antiseptic (Povidone-Iodine / Framycetin)",
    aliases: ["betadine", "soframycin", "neosporin", "burnol", "povidone", "antiseptic ointment"],
    defaultDosage: "5% / 10% Topical Ointment",
    defaultFrequency: "Apply 1 to 2 times daily",
    whenToEat: "Clean the wound or abrasion with water, pat dry, and apply a thin layer with sterile cotton or bandage.",
    howMuchToEat: "Apply small pea-sized amount directly to cut, scrape, or minor burn.",
    harmOveruse: "For external use only. Avoid prolonged use on large open burns to prevent systemic iodine absorption and thyroid disruption.",
    purpose: "Broad-spectrum antiseptic: destroys bacteria, viruses, and fungi to prevent infection in cuts and burns.",
  },
  {
    id: "dettol",
    canonicalName: "Dettol / Savlon Antiseptic Liquid (Chloroxylenol / Cetrimide)",
    aliases: ["dettol", "savlon", "chloroxylenol"],
    defaultDosage: "Diluted Liquid Solution",
    defaultFrequency: "As needed for first-aid skin cleansing",
    whenToEat: "ALWAYS dilute with water (1 tablespoon in 250ml water) before applying to skin. NEVER drink or ingest.",
    howMuchToEat: "Use diluted solution with clean cotton to swab cuts or minor scrapes.",
    harmOveruse: "EXTREMELY TOXIC IF SWALLOWED. Can cause severe throat chemical burns, laryngeal edema, respiratory failure, and poisoning.",
    purpose: "Topical first-aid antiseptic and disinfectant for minor wounds, cuts, and scrapes.",
  },
  {
    id: "electral",
    canonicalName: "Electral / ORS (WHO Oral Rehydration Salts)",
    aliases: ["electral", "ors", "prolyte", "oral rehydration"],
    defaultDosage: "1 Sachet in 1 Litre Water",
    defaultFrequency: "Sip throughout the day during dehydration",
    whenToEat: "Mix complete sachet in 1 litre of clean boiled and cooled water. Sip slowly over 24 hours.",
    howMuchToEat: "Adults: 1 to 2 litres daily during active diarrhea, vomiting, or heavy sweating.",
    harmOveruse: "Do not mix with milk, fruit juices, or soft drinks. Discard any solution left over after 24 hours.",
    purpose: "Electrolyte replacement: replenishes sodium, potassium, chloride, and glucose during diarrhea and heat exhaustion.",
  },
  {
    id: "zandu_balm",
    canonicalName: "Zandu Balm / Tiger Balm (Menthol & Herbal Camphor)",
    aliases: ["zandu balm", "tiger balm", "amrutanjan", "headache balm"],
    defaultDosage: "Topical Herbal Balm",
    defaultFrequency: "Apply gently to forehead/temples as needed",
    whenToEat: "Apply a small amount and massage gently on temples, forehead, or nape of neck for tension headaches.",
    howMuchToEat: "Small pea-sized amount as needed. For external use only.",
    harmOveruse: "Avoid contact with eyes, eyelids, nostrils, or irritated skin. Do not swallow.",
    purpose: "Herbal pain-relieving balm for tension headaches, cold congestion, and neck stiffness.",
  },
  {
    id: "strepsils",
    canonicalName: "Strepsils / Throat Lozenges (Dichlorobenzyl Alcohol)",
    aliases: ["strepsils", "vicks drops", "halls", "cofsils lozenges", "lozenges"],
    defaultDosage: "1 Lozenge every 2 to 3 hours",
    defaultFrequency: "Every 2-3 hours as needed (Max 8-10/day)",
    whenToEat: "Place 1 lozenge in mouth and dissolve slowly. Do not chew or swallow whole.",
    howMuchToEat: "Adults: 1 lozenge every 2 to 3 hours as needed.",
    harmOveruse: "Choking hazard in children under 6 years. High sugar content in standard lozenges should be monitored by diabetics.",
    purpose: "Antibacterial and soothing relief for sore throat, throat tickle, and hoarseness.",
  },

  // CARDIOVASCULAR
  {
    id: "atorvastatin",
    canonicalName: "Atorvastatin Calcium",
    aliases: ["atorvastatin", "atorva", "lipitor", "storvas", "atocor", "atorlip"],
    defaultDosage: "20mg",
    defaultFrequency: "Once daily at bedtime (0-0-1)",
    whenToEat: "Take once daily at night / bedtime with water. Statins work most effectively during nighttime hepatic cholesterol synthesis.",
    howMuchToEat: "Adults: 10mg to 40mg daily (max 80mg under cardiologist supervision). Do not take double dose if missed.",
    harmOveruse: "Risk of muscle breakdown (rhabdomyolysis), severe liver enzyme elevation, and jaundice. Avoid large quantities of grapefruit juice.",
    purpose: "HMG-CoA reductase inhibitor: lowers LDL bad cholesterol and stabilizes coronary artery plaques.",
  },
  {
    id: "rosuvastatin",
    canonicalName: "Rosuvastatin",
    aliases: ["rosuvastatin", "rosuvas", "crestor", "rosave", "razel"],
    defaultDosage: "10mg",
    defaultFrequency: "Once daily at bedtime (0-0-1)",
    whenToEat: "Take once daily in evening or bedtime with a glass of water.",
    howMuchToEat: "Adults: 5mg to 20mg once daily.",
    harmOveruse: "Muscle weakness, elevated creatine kinase, hepatotoxicity, and proteinuria.",
    purpose: "Potent statin: reduces LDL cholesterol and triglycerides while raising HDL.",
  },
  {
    id: "metoprolol",
    canonicalName: "Metoprolol Succinate ER",
    aliases: ["metoprolol", "metolar", "betaloc", "seloken", "toprol"],
    defaultDosage: "50mg",
    defaultFrequency: "Once daily in morning after breakfast (1-0-0)",
    whenToEat: "Take in the morning immediately after breakfast with water. Swallow extended-release tablet whole without crushing.",
    howMuchToEat: "Adults: 25mg to 50mg daily (titrated up to 100mg by physician).",
    harmOveruse: "Severe bradycardia (dangerously low heart rate <50 bpm), acute hypotension, dizziness, cold extremities, and heart block.",
    purpose: "Selective beta-1 blocker: lowers resting heart rate and protects heart from excessive workload.",
  },
  {
    id: "atenolol",
    canonicalName: "Atenolol",
    aliases: ["atenolol", "tenormin", "betacard"],
    defaultDosage: "50mg",
    defaultFrequency: "Once daily in morning (1-0-0)",
    whenToEat: "Take in the morning with a full glass of water, ideally with or after breakfast.",
    howMuchToEat: "Adults: 25mg to 50mg once daily.",
    harmOveruse: "Extreme fatigue, marked bradycardia, wheezing/bronchospasm, and lightheadedness.",
    purpose: "Cardioselective beta blocker for hypertension, angina pectoris, and arrhythmia.",
  },
  {
    id: "aspirin",
    canonicalName: "Ecosprin (Enteric-Coated Aspirin)",
    aliases: ["aspirin", "ecosprin", "acetylsalicylic", "disprin", "ecospirin"],
    defaultDosage: "75mg",
    defaultFrequency: "Once daily strictly after lunch or dinner (0-1-0)",
    whenToEat: "Take strictly after a full meal with water. Never consume on an empty stomach to prevent gastric mucosal damage.",
    howMuchToEat: "Adults: 75mg to 150mg daily for cardioprotection. Do not exceed prescribed limit.",
    harmOveruse: "Stomach ulcers, severe gastrointestinal bleeding (black tarry stools), gastritis, and hemorrhagic risks.",
    purpose: "Anti-platelet blood thinner: prevents blood clot formation in coronary stents and arteries.",
  },
  {
    id: "clopidogrel",
    canonicalName: "Clopidogrel",
    aliases: ["clopidogrel", "deplatt", "plavix", "clopilet", "ceruvit"],
    defaultDosage: "75mg",
    defaultFrequency: "Once daily with or after meals (1-0-0)",
    whenToEat: "Take once daily at the same time each day, with or after food.",
    howMuchToEat: "Adults: 75mg once daily.",
    harmOveruse: "Uncontrolled bleeding, easy bruising, hematuria, and thrombotic thrombocytopenic purpura (TTP).",
    purpose: "P2Y12 platelet inhibitor: prevents arterial thrombosis and ischemic stroke.",
  },
  {
    id: "telmisartan",
    canonicalName: "Telmisartan",
    aliases: ["telmisartan", "telma", "micardis", "telmikem", "sartel", "telsartan"],
    defaultDosage: "40mg",
    defaultFrequency: "Once daily in morning (1-0-0)",
    whenToEat: "Take once daily in the morning with or without food at the same time each day.",
    howMuchToEat: "Adults: 20mg to 40mg daily (max 80mg).",
    harmOveruse: "Hypotension (severe dizziness, fainting upon standing) and elevated serum potassium (hyperkalemia).",
    purpose: "Angiotensin II receptor blocker (ARB): relaxes blood vessels and shields kidney capillaries.",
  },
  {
    id: "amlodipine",
    canonicalName: "Amlodipine Besylate",
    aliases: ["amlodipine", "amlong", "norvasc", "stamlo", "amlovas"],
    defaultDosage: "5mg",
    defaultFrequency: "Once daily in morning (1-0-0)",
    whenToEat: "Take once daily in the morning with water, with or without food.",
    howMuchToEat: "Adults: 2.5mg to 5mg daily (max 10mg).",
    harmOveruse: "Peripheral edema (swelling of ankles and lower legs), facial flushing, headaches, and rapid heart palpitations.",
    purpose: "Dihydropyridine calcium channel blocker: dilates peripheral arteries to reduce blood pressure.",
  },

  // DIABETES & METABOLIC
  {
    id: "metformin",
    canonicalName: "Metformin Hydrochloride",
    aliases: ["metformin", "glycomet", "glucophage", "gluconorm", "obimet", "cetapin"],
    defaultDosage: "500mg",
    defaultFrequency: "Twice daily with major meals (1-0-1)",
    whenToEat: "Take strictly with or immediately after major meals (breakfast and dinner) to avoid stomach upset and nausea.",
    howMuchToEat: "Adults: 500mg to 1000mg twice daily with food (max 2000mg/day in divided doses).",
    harmOveruse: "Overdose can trigger rare but dangerous lactic acidosis, persistent vomiting, diarrhea, and abdominal distress.",
    purpose: "Biguanide: improves insulin sensitivity, increases glucose uptake, and suppresses liver sugar output.",
  },
  {
    id: "glimepiride",
    canonicalName: "Glimepiride",
    aliases: ["glimepiride", "amaryl", "zoryl", "glimy"],
    defaultDosage: "1mg",
    defaultFrequency: "Once daily in morning 15 mins before breakfast (1-0-0)",
    whenToEat: "Take exactly 15 minutes before breakfast. Never skip breakfast after taking this medication.",
    howMuchToEat: "Adults: 1mg to 2mg daily in the morning (max 4mg).",
    harmOveruse: "Severe hypoglycemia (sweating, trembling, confusion, seizures, loss of consciousness). Always carry sugar candies.",
    purpose: "Sulfonylurea: stimulates pancreatic beta-cells to secrete insulin in response to meals.",
  },
  {
    id: "dapagliflozin",
    canonicalName: "Dapagliflozin",
    aliases: ["dapagliflozin", "forxiga", "oxra", "dapacip"],
    defaultDosage: "10mg",
    defaultFrequency: "Once daily in morning with water (1-0-0)",
    whenToEat: "Take once daily in the morning. Drink plenty of water throughout the day.",
    howMuchToEat: "Adults: 10mg once daily.",
    harmOveruse: "Genital mycotic infections, urinary tract infections, dehydration, and euglycemic diabetic ketoacidosis (DKA).",
    purpose: "SGLT2 inhibitor: promotes excretion of excess blood sugar through urine and protects heart & kidneys.",
  },

  // GASTRO-PROTECTION & ACIDITY
  {
    id: "pantoprazole",
    canonicalName: "Pantoprazole Sodium",
    aliases: ["pantoprazole", "pantocid", "pantodac", "protonix", "pantop"],
    defaultDosage: "40mg",
    defaultFrequency: "Once daily 30-45 minutes before breakfast (1-0-0)",
    whenToEat: "Take 30 to 45 minutes before your first meal/breakfast in the morning with plain water.",
    howMuchToEat: "Adults: 40mg once daily.",
    harmOveruse: "Long-term unmonitored use (>1 year) can cause hypomagnesemia, vitamin B12 deficiency, and reduced bone mineral density.",
    purpose: "Proton-pump inhibitor (PPI): suppresses gastric acid secretion and protects stomach lining.",
  },
  {
    id: "omeprazole",
    canonicalName: "Omeprazole",
    aliases: ["omeprazole", "omez", "prilosec", "omizac"],
    defaultDosage: "20mg",
    defaultFrequency: "Once daily before breakfast (1-0-0)",
    whenToEat: "Take 30 minutes before food in the morning. Swallow capsule whole.",
    howMuchToEat: "Adults: 20mg to 40mg daily.",
    harmOveruse: "Diarrhea, headaches, magnesium depletion, and increased risk of intestinal infections.",
    purpose: "Proton-pump inhibitor for acid reflux, GERD, and peptic ulcer healing.",
  },
  {
    id: "rabeprazole",
    canonicalName: "Rabeprazole Sodium",
    aliases: ["rabeprazole", "rabecid", "aciphex", "rabeloc", "rabium", "cyra"],
    defaultDosage: "20mg",
    defaultFrequency: "Once daily before breakfast (1-0-0)",
    whenToEat: "Take once daily on an empty stomach in the morning before food.",
    howMuchToEat: "Adults: 20mg once daily.",
    harmOveruse: "Abdominal discomfort, headache, dry mouth, and chronic micronutrient malabsorption.",
    purpose: "Fast-acting PPI for rapid relief of severe acid reflux, heartburn, and gastritis.",
  },

  // ANALGESICS, NSAIDs & ANTIPYRETICS
  {
    id: "paracetamol",
    canonicalName: "Paracetamol (Acetaminophen)",
    aliases: ["paracetamol", "acetaminophen", "dolo", "crocin", "calpol", "tylenol", "panadol", "pacimol"],
    defaultDosage: "650mg",
    defaultFrequency: "Every 6 to 8 hours as needed for fever/pain (Max 3/day)",
    whenToEat: "Take after food or milk with a full glass of water. Do not consume on an empty stomach.",
    howMuchToEat: "Adults: 500mg to 650mg per dose. Minimum interval of 6 hours between tablets. Maximum 3 to 4 tablets (2000mg-2600mg) in 24 hours.",
    harmOveruse: "Severe liver injury (hepatotoxicity) and acute hepatic necrosis if exceeded 3000mg-4000mg/day. Strictly avoid alcohol.",
    purpose: "Antipyretic and analgesic: relieves acute fever, headaches, body aches, and post-vaccination discomfort.",
  },
  {
    id: "ibuprofen",
    canonicalName: "Ibuprofen",
    aliases: ["ibuprofen", "brufen", "advil", "motrin", "combiflam", "nurofen"],
    defaultDosage: "400mg",
    defaultFrequency: "Every 8 hours with meals as needed (1-0-1)",
    whenToEat: "Take strictly after meals with food or milk. Never take NSAIDs on an empty stomach.",
    howMuchToEat: "Adults: 200mg to 400mg every 8 hours as needed (max 1200mg/day OTC, 2400mg prescription).",
    harmOveruse: "Gastric ulcers, intestinal bleeding, kidney injury, fluid retention, and heightened cardiovascular risk.",
    purpose: "NSAID: relieves inflammatory pain, arthritis flare-ups, muscle sprains, and fever.",
  },
  {
    id: "aceclofenac",
    canonicalName: "Aceclofenac",
    aliases: ["aceclofenac", "zerodol", "hifenac", "acemiz", "dolokind"],
    defaultDosage: "100mg",
    defaultFrequency: "Twice daily after food (1-0-1)",
    whenToEat: "Take with or immediately after food with plenty of water.",
    howMuchToEat: "Adults: 100mg twice daily (morning and evening).",
    harmOveruse: "Peptic ulceration, gastrointestinal hemorrhage, renal impairment, and hepatic enzyme derangement.",
    purpose: "Potent anti-inflammatory and painkiller for osteoarthritis, rheumatoid arthritis, and dental pain.",
  },
  {
    id: "diclofenac",
    canonicalName: "Diclofenac Sodium",
    aliases: ["diclofenac", "voveran", "voltaren", "dicloran"],
    defaultDosage: "50mg",
    defaultFrequency: "Twice daily after meals (1-0-1)",
    whenToEat: "Take strictly after meals with a full glass of water. Swallow tablet whole.",
    howMuchToEat: "Adults: 50mg twice or thrice daily (max 150mg/day).",
    harmOveruse: "Stomach ulcers, severe GI bleeding, elevated blood pressure, kidney dysfunction, and cardiac risk.",
    purpose: "Non-steroidal anti-inflammatory drug for severe joint, tendon, and musculoskeletal pain.",
  },

  // ANTIBIOTICS & ANTIMICROBIALS
  {
    id: "amoxicillin",
    canonicalName: "Amoxicillin / Clavulanate",
    aliases: ["amoxicillin", "augmentin", "clavam", "moxikind", "mox", "novamox"],
    defaultDosage: "625mg",
    defaultFrequency: "Twice daily for 5 to 7 days (1-0-1)",
    whenToEat: "Take at the start of or immediately after a meal to reduce stomach irritation.",
    howMuchToEat: "Adults: 500mg to 625mg twice or thrice daily. Strictly complete the entire prescribed course!",
    harmOveruse: "Antibiotic resistance, severe C. difficile diarrhea, hepatic cholestasis, and allergic anaphylaxis.",
    purpose: "Broad-spectrum beta-lactam antibiotic for bacterial respiratory, ENT, skin, and dental infections.",
  },
  {
    id: "azithromycin",
    canonicalName: "Azithromycin",
    aliases: ["azithromycin", "azithral", "zithromax", "aziwon", "azee"],
    defaultDosage: "500mg",
    defaultFrequency: "Once daily for 3 to 5 days (1-0-0)",
    whenToEat: "Take once daily 1 hour before food or 2 hours after food at the same time each day.",
    howMuchToEat: "Adults: 500mg once daily for 3 consecutive days (or 500mg day 1, then 250mg days 2-5).",
    harmOveruse: "Prolonged cardiac QT interval, ventricular arrhythmias, antibiotic-resistant strains, and severe diarrhea.",
    purpose: "Macrolide antibiotic for throat infections, bronchitis, sinusitis, and atypical pneumonia.",
  },
  {
    id: "ciprofloxacin",
    canonicalName: "Ciprofloxacin",
    aliases: ["ciprofloxacin", "ciplox", "cipro", "cifran"],
    defaultDosage: "500mg",
    defaultFrequency: "Twice daily for 5 to 7 days (1-0-1)",
    whenToEat: "Take with water. Avoid consuming dairy products (milk, yogurt) or calcium within 2 hours of dose.",
    howMuchToEat: "Adults: 250mg to 500mg twice daily.",
    harmOveruse: "Tendon rupture (especially Achilles tendon), peripheral neuropathy, and CNS toxicity.",
    purpose: "Fluoroquinolone antibiotic for urinary tract infections, typhoid, and gastrointestinal infections.",
  },

  // ALLERGY & RESPIRATORY
  {
    id: "cetirizine",
    canonicalName: "Cetirizine Hydrochloride",
    aliases: ["cetirizine", "cetzine", "zyrtec", "alarid", "okacet"],
    defaultDosage: "10mg",
    defaultFrequency: "Once daily in evening or before bedtime (0-0-1)",
    whenToEat: "Take once daily in the evening with water, with or without food.",
    howMuchToEat: "Adults: 5mg to 10mg once daily.",
    harmOveruse: "Excessive sedation, drowsiness, dry mouth, urinary retention, and impaired motor coordination. Avoid driving.",
    purpose: "Second-generation antihistamine: relieves allergic rhinitis, runny nose, sneezing, and hives (urticaria).",
  },
  {
    id: "levocetirizine",
    canonicalName: "Levocetirizine",
    aliases: ["levocetirizine", "levocet", "xyzal", "teczine"],
    defaultDosage: "5mg",
    defaultFrequency: "Once daily at bedtime (0-0-1)",
    whenToEat: "Take once daily at bedtime with water.",
    howMuchToEat: "Adults: 5mg once daily.",
    harmOveruse: "Daytime sleepiness, fatigue, dry mouth, and CNS depression if mixed with alcohol.",
    purpose: "Purified antihistamine for seasonal allergies, persistent itching, and allergic skin conditions.",
  },
  {
    id: "montelukast",
    canonicalName: "Montelukast Sodium",
    aliases: ["montelukast", "montair", "singulair", "romilast", "montek"],
    defaultDosage: "10mg",
    defaultFrequency: "Once daily at bedtime (0-0-1)",
    whenToEat: "Take once daily in the evening / bedtime with or without food.",
    howMuchToEat: "Adults: 10mg once daily.",
    harmOveruse: "Neuropsychiatric effects (vivid dreams, mood changes, anxiety, insomnia), headache, and abdominal pain.",
    purpose: "Leukotriene receptor antagonist: prevents asthma symptoms and allergic airway inflammation.",
  },

  // THYROID & VITAMINS
  {
    id: "levothyroxine",
    canonicalName: "Levothyroxine Sodium",
    aliases: ["levothyroxine", "thyronorm", "eltroxin", "synthroid", "thyrox"],
    defaultDosage: "50mcg",
    defaultFrequency: "Once daily early morning on empty stomach (1-0-0)",
    whenToEat: "Take first thing in the morning with a full glass of water, at least 45-60 minutes before tea, coffee, or breakfast.",
    howMuchToEat: "Dose titrated strictly based on regular serum TSH lab tests (commonly 25mcg to 100mcg daily).",
    harmOveruse: "Iatrogenic hyperthyroidism: heart palpitations, tachycardia, sweating, weight loss, tremors, and bone loss.",
    purpose: "Synthetic thyroid hormone replacement for hypothyroidism (underactive thyroid).",
  },
  {
    id: "vitamind3",
    canonicalName: "Vitamin D3 (Cholecalciferol)",
    aliases: ["cholecalciferol", "vitamin d3", "calcirol", "depura", "uprise-d3"],
    defaultDosage: "60,000 IU",
    defaultFrequency: "Once weekly with milk for 8 weeks (0-0-1/week)",
    whenToEat: "Take once a week with milk or a meal containing healthy fats for optimal fat-soluble absorption.",
    howMuchToEat: "1 capsule (60,000 IU) once per week for 8 weeks, then monthly maintenance.",
    harmOveruse: "Hypercalcemia (dangerously high blood calcium), kidney stones, soft tissue calcification, and nausea.",
    purpose: "High-dose Vitamin D3 replenishment for bone density, joint health, and immune-metabolic vitality.",
  },
];

export async function extractMedicinesFromImage(
  imageBuffer: Buffer
): Promise<{ medicines: ScannedMedicineItem[]; rawNotes: string; recognizedCount: number }> {
  let worker;
  try {
    // Sharp high-fidelity image preprocessing:
    // 1. Auto-orient based on mobile EXIF tags
    // 2. Resize small gallery photos up to 1600px width
    // 3. Normalize contrast and sharpen edges for optimal character recognition
    let processedBuffer = imageBuffer;
    try {
      processedBuffer = await sharp(imageBuffer)
        .rotate()
        .resize({ width: 1600, fit: "inside", withoutEnlargement: false })
        .grayscale()
        .normalize()
        .sharpen({ sigma: 1.2 })
        .png()
        .toBuffer();
    } catch (sharpErr) {
      console.warn("Sharp preprocessing notice:", sharpErr);
      processedBuffer = imageBuffer;
    }

    const workerPath = path.resolve(
      process.cwd(),
      "node_modules/tesseract.js/src/worker-script/node/index.js"
    );
    worker = await createWorker("eng", 1, { workerPath });

    // Primary Pass
    const ret = await worker.recognize(processedBuffer);
    let ocrText = ret.data.text || "";

    // Secondary Inverted Pass if primary text is sparse (common with dark bottles/tubs like Vicks blue lid!)
    if (ocrText.replace(/\s+/g, "").length < 40) {
      try {
        const invertedBuffer = await sharp(processedBuffer)
          .negate({ alpha: false })
          .toBuffer();
        const ret2 = await worker.recognize(invertedBuffer);
        if (ret2.data.text && ret2.data.text.length > 10) {
          ocrText = ocrText + "\n" + ret2.data.text;
        }
      } catch (_) {}
    }

    await worker.terminate();

    const normalized = ocrText.toLowerCase();
    const foundItems: ScannedMedicineItem[] = [];
    const matchedRuleIds = new Set<string>();

    for (const rule of CLINICAL_DRUG_RULES) {
      const isMatch = rule.aliases.some((alias) => {
        const regex = new RegExp(`\\b${alias}\\b`, "i");
        if (regex.test(ocrText)) return true;
        if (alias.length >= 5 && normalized.includes(alias.toLowerCase())) {
          return true;
        }
        return false;
      });

      if (isMatch && !matchedRuleIds.has(rule.id)) {
        matchedRuleIds.add(rule.id);

        // Extract text snippet specifically surrounding this medicine mention
        let snippet = ocrText;
        for (const alias of rule.aliases) {
          const idx = normalized.indexOf(alias.toLowerCase());
          if (idx !== -1) {
            snippet = ocrText.slice(Math.max(0, idx - 40), Math.min(ocrText.length, idx + 180));
            break;
          }
        }
        const snippetLower = snippet.toLowerCase();

        // Extract dosage from local snippet with OCR digit cleanup
        let extractedDosage = rule.defaultDosage;
        const dosageMatch = snippet.match(/([0-9SsoO]+(?:\.[0-9]+)?\s*(?:mg|mcg|iu|ml|g|gm)\b)/i);
        if (dosageMatch && dosageMatch[1]) {
          const rawCandidate = dosageMatch[1].trim();
          const cleanDose = rawCandidate
            .replace(/^[Ss](?=[0-9])/, "5")
            .replace(/[Oo]/g, "0");
          const numVal = parseFloat(cleanDose);
          if (!isNaN(numVal) && numVal >= 1 && !cleanDose.startsWith("0")) {
            extractedDosage = cleanDose;
          }
        }

        // Clinical sanity check: paracetamol adult tablets are 500mg or 650mg, never 50mg
        if (rule.id === "paracetamol" && (!extractedDosage || parseFloat(extractedDosage) < 250)) {
          extractedDosage = "650mg";
        }

        // Extract frequency / schedule from local snippet
        let extractedFreq = rule.defaultFrequency;
        if (snippet.includes("1-0-1") || snippetLower.includes("twice daily") || snippetLower.includes("bid")) {
          extractedFreq = "Twice daily with meals (1-0-1)";
        } else if (snippet.includes("0-0-1") || snippetLower.includes("bedtime") || snippetLower.includes("night") || snippetLower.includes("h.s")) {
          extractedFreq = "Once daily at bedtime (0-0-1)";
        } else if (snippet.includes("0-1-0") || snippetLower.includes("after lunch") || snippetLower.includes("afternoon")) {
          extractedFreq = "Once daily after lunch (0-1-0)";
        } else if (snippet.includes("1-0-0") || snippetLower.includes("morning") || snippetLower.includes("breakfast") || snippetLower.includes("o.d")) {
          extractedFreq = "Once daily in morning (1-0-0)";
        } else if (snippet.includes("1-1-1") || snippetLower.includes("thrice daily") || snippetLower.includes("tid")) {
          extractedFreq = "Three times daily (1-1-1)";
        }

        foundItems.push({
          name: rule.canonicalName,
          dosageGuess: extractedDosage,
          frequencyGuess: extractedFreq,
          whenToEat: rule.whenToEat,
          howMuchToEat: rule.howMuchToEat,
          harmOveruse: rule.harmOveruse,
          purpose: rule.purpose,
          confidence: "high",
        });
      }
    }

    if (foundItems.length > 0) {
      return {
        medicines: foundItems,
        rawNotes: `Optical Character Recognition detected ${foundItems.length} active clinical medication(s) from your photo.`,
        recognizedCount: foundItems.length,
      };
    }

    // Secondary fallback: Extract any labeled formulation lines (balm, rub, ml, gm, tab, syrup, cough, relief)
    const lines = ocrText.split("\n").map((l) => l.trim()).filter((l) => l.length > 3);
    const candidateLines = lines.filter((l) =>
      /(?:tab|cap|syp|inj|rx|tablet|capsule|balm|rub|gel|cream|ointment|lotion|drops?|spray|syrup|\bmg\b|\bmcg\b|\bml\b|\bgm\b|cough|cold|relief|pain)/i.test(l) &&
      !/(?:hospital|clinic|doctor|patient|date|phone|reg|institute|dr\.)/i.test(l)
    );

    for (const line of candidateLines.slice(0, 3)) {
      const cleanLine = line.replace(/^[0-9]+[.\s]+/, "").trim();
      if (cleanLine.length > 3) {
        foundItems.push({
          name: cleanLine,
          dosageGuess: "As labeled on packaging",
          frequencyGuess: "Follow product packaging / doctor instructions",
          whenToEat: "Use or consume strictly as directed on the manufacturer packaging or by your physician.",
          howMuchToEat: "Adhere to the labeled adult dosage. Do not exceed maximum daily limits.",
          harmOveruse: "Excessive or inappropriate use can cause adverse reactions. Discontinue and consult a doctor if irritation occurs.",
          purpose: "Healthcare product / medication identified via optical packaging scan.",
          confidence: "medium",
        });
      }
    }

    if (foundItems.length > 0) {
      return {
        medicines: foundItems,
        rawNotes: `Detected ${foundItems.length} medicine item(s) from packaging text.`,
        recognizedCount: foundItems.length,
      };
    }

    // No text found
    return {
      medicines: [],
      rawNotes: "No clear medicine names or packaging text could be detected in this photo. Please ensure the brand name label is front-facing, well-lit, and in sharp focus.",
      recognizedCount: 0,
    };
  } catch (err: any) {
    if (worker) {
      try {
        await worker.terminate();
      } catch (_) {}
    }
    console.error("OCR Extraction Error:", err);
    return {
      medicines: [],
      rawNotes: "OCR extraction encountered an error processing this image. Please ensure the image is a valid JPG/PNG.",
      recognizedCount: 0,
    };
  }
}
