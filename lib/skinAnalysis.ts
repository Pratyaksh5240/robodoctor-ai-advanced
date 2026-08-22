export type SkinSeverity = "low" | "moderate" | "high" | "urgent";

export type SkinInputs = {
  bodyPart: string;
  duration: string;
  symptoms: string;
  texture: string;
  spreading: boolean;
  pain: boolean;
  itching: boolean;
  fever: boolean;
  discharge: boolean;
  bleeding: boolean;
};

export type SkinFinding = {
  title: string;
  detail: string;
  severity: SkinSeverity;
};

export type SkinAnalysis = {
  severity: SkinSeverity;
  score: number;
  summary: string;
  likelyPatterns: SkinFinding[];
  redFlags: SkinFinding[];
  precautions: string[];
  followUp: string;
};

const symptomIncludes = (text: string, terms: string[]) =>
  terms.some((term) => text.includes(term));

function addPattern(
  patterns: SkinFinding[],
  title: string,
  detail: string,
  severity: SkinSeverity
) {
  patterns.push({ title, detail, severity });
}

function addFlag(
  flags: SkinFinding[],
  title: string,
  detail: string,
  severity: SkinSeverity
) {
  flags.push({ title, detail, severity });
}

export function analyzeSkin(inputs: SkinInputs): SkinAnalysis {
  const details = `${inputs.symptoms} ${inputs.texture}`.toLowerCase();
  const likelyPatterns: SkinFinding[] = [];
  const redFlags: SkinFinding[] = [];
  const precautions: string[] = [];

  let score = 10;

  if (symptomIncludes(details, ["itch", "itchy", "dry", "patch"])) {
    addPattern(
      likelyPatterns,
      "Eczema or allergic irritation pattern",
      "Itching with dry or patchy skin can match eczema, irritation, or allergy-related flare.",
      "moderate"
    );
    score += 18;
    precautions.push("Use a gentle cleanser, avoid harsh soaps, and do not scratch the area.");
  }

  if (symptomIncludes(details, ["pimple", "acne", "whitehead", "blackhead"])) {
    addPattern(
      likelyPatterns,
      "Acne-type pattern",
      "Bumps, pimples, or oil-related lesions often fit acne or follicle irritation.",
      "low"
    );
    score += 12;
    precautions.push("Keep the area clean, avoid squeezing lesions, and use non-comedogenic products.");
  }

  if (symptomIncludes(details, ["ring", "circular", "scaly", "fungal"])) {
    addPattern(
      likelyPatterns,
      "Possible fungal infection pattern",
      "Circular or scaly rash patterns can suggest a fungal skin issue.",
      "moderate"
    );
    score += 20;
    precautions.push("Keep the skin dry, avoid sharing towels, and consider medical review if it expands.");
  }

  if (symptomIncludes(details, ["red", "rash", "burning", "swollen"])) {
    addPattern(
      likelyPatterns,
      "Inflammatory rash pattern",
      "Redness, burning, or swelling can fit irritation, allergy, or infection-related inflammation.",
      "moderate"
    );
    score += 16;
    precautions.push("Avoid new cosmetic products or creams on the area until the cause is clearer.");
  }

  if (symptomIncludes(details, ["blister", "boil", "pus", "crust"])) {
    addPattern(
      likelyPatterns,
      "Possible infection pattern",
      "Blisters, boils, pus, or crusting can suggest bacterial or viral skin infection.",
      "high"
    );
    score += 24;
    precautions.push("Do not pop blisters or boils, and keep the area clean and covered if rubbing occurs.");
  }

  if (symptomIncludes(details, ["hive", "hives", "allergy", "allergic", "welts"])) {
    addPattern(
      likelyPatterns,
      "Possible allergic rash pattern",
      "Raised itchy welts or sudden rash can fit an allergic skin reaction.",
      "moderate"
    );
    score += 18;
    precautions.push("Avoid any new food, medicine, or cosmetic product that started before the rash.");
  }

  if (symptomIncludes(details, ["night itch", "night itching", "finger webs", "scabies"])) {
    addPattern(
      likelyPatterns,
      "Possible scabies pattern",
      "Intense itching, especially at night or in finger webs, can fit scabies.",
      "moderate"
    );
    score += 20;
    precautions.push("Avoid close skin contact and wash clothes or bedding if an infectious rash is suspected.");
  }

  if (symptomIncludes(details, ["silvery", "thick plaque", "plaque", "psoriasis"])) {
    addPattern(
      likelyPatterns,
      "Psoriasis-like pattern",
      "Thick scaly plaques may fit a psoriasis-type inflammatory condition.",
      "moderate"
    );
    score += 18;
    precautions.push("Avoid scratching plaques and use fragrance-free moisturizers while awaiting medical advice.");
  }

  if (symptomIncludes(details, ["one sided", "one-sided", "band", "tingling", "shingles"])) {
    addPattern(
      likelyPatterns,
      "Possible shingles pattern",
      "A painful one-sided rash or blister band can suggest shingles.",
      "high"
    );
    score += 24;
    precautions.push("Early medical review matters for painful blistering rashes, especially near the eye or face.");
  }

  if (symptomIncludes(details, ["cellulitis", "hot", "warm", "tender"])) {
    addPattern(
      likelyPatterns,
      "Possible cellulitis pattern",
      "Warm, painful, spreading redness can fit a deeper skin infection such as cellulitis.",
      "high"
    );
    score += 24;
  }

  if (symptomIncludes(details, ["mole", "black spot", "dark patch", "irregular border", "changing"])) {
    addPattern(
      likelyPatterns,
      "Changing mole or pigmented lesion",
      "A changing, irregular, dark, or bleeding spot should be reviewed to rule out a serious skin lesion.",
      "high"
    );
    score += 22;
  }

  if (inputs.spreading) {
    addFlag(
      redFlags,
      "Spreading rash",
      "A rash or lesion that is spreading needs earlier medical review.",
      "high"
    );
    score += 18;
  }

  if (inputs.pain) {
    addFlag(
      redFlags,
      "Painful lesion",
      "Pain suggests deeper inflammation or infection rather than a mild cosmetic issue.",
      "high"
    );
    score += 14;
  }

  if (inputs.fever) {
    addFlag(
      redFlags,
      "Skin symptoms with fever",
      "Fever with rash, swelling, or skin pain can signal an infection needing urgent care.",
      "urgent"
    );
    score += 26;
  }

  if (inputs.discharge || inputs.bleeding) {
    addFlag(
      redFlags,
      "Bleeding or discharge",
      "Bleeding, pus, or fluid release can indicate an infected or unstable lesion.",
      "urgent"
    );
    score += 24;
  }

  if (inputs.duration === "more-than-2-weeks") {
    addFlag(
      redFlags,
      "Persistent skin issue",
      "A lesion lasting more than two weeks should be reviewed by a clinician or dermatologist.",
      "high"
    );
    score += 14;
  }

  if (inputs.fever && inputs.spreading) {
    addFlag(
      redFlags,
      "Spreading rash with fever",
      "A fast-spreading rash together with fever can be a sign of a more serious infection.",
      "urgent"
    );
    score += 18;
  }

  if ((inputs.bodyPart === "face" || inputs.bodyPart === "genitals") && (inputs.pain || inputs.discharge || inputs.bleeding)) {
    addFlag(
      redFlags,
      "Sensitive area involvement",
      "Painful, draining, or bleeding skin problems on the face or private area should be reviewed promptly.",
      "urgent"
    );
    score += 18;
  }

  if (symptomIncludes(details, ["mole", "black spot", "changing", "irregular border"]) && inputs.bleeding) {
    addFlag(
      redFlags,
      "Changing or bleeding pigmented lesion",
      "A changing dark spot or mole that bleeds needs dermatologist review soon.",
      "urgent"
    );
    score += 20;
  }

  if (inputs.bodyPart === "face" || inputs.bodyPart === "genitals") {
    score += 8;
    precautions.push("Sensitive body areas need lower thresholds for professional review.");
  }

  if (likelyPatterns.length === 0) {
    addPattern(
      likelyPatterns,
      "Non-specific skin concern",
      "The entered details do not strongly match one pattern, so better images and symptom details would help.",
      "low"
    );
  }

  let severity: SkinSeverity = "low";
  let summary =
    "This looks like a lower-risk skin issue based on the entered details, but continue monitoring changes.";
  let followUp = "If it worsens, spreads, or fails to improve, book a routine doctor review.";

  if (redFlags.some((item) => item.severity === "urgent")) {
    severity = "urgent";
    summary =
      "One or more warning signs suggest this skin problem needs urgent medical attention.";
    followUp = "Seek urgent care now if fever, facial swelling, rapid spread, or severe pain is present.";
  } else if (score >= 55 || redFlags.length >= 2) {
    severity = "high";
    summary =
      "This skin issue has several concerning features and should be reviewed by a clinician soon.";
    followUp = "Arrange a doctor or dermatologist visit within 24 to 72 hours.";
  } else if (score >= 28) {
    severity = "moderate";
    summary =
      "This looks like a moderate skin concern. Home care may help, but follow-up is reasonable if it persists.";
    followUp = "Monitor for 2 to 3 days and seek medical review if it spreads or becomes painful.";
  }

  precautions.push("This screening cannot confirm diagnosis from a photo alone.");

  return {
    severity,
    score: Math.min(score, 100),
    summary,
    likelyPatterns,
    redFlags,
    precautions: Array.from(new Set(precautions)),
    followUp,
  };
}
