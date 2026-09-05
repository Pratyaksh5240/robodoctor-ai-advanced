export function isEmergencyInput(input: string): boolean {
  if (!input || !input.trim()) return false;
  const text = input.toLowerCase();

  const emergencyKeywords = [
    "chest pain",
    "chest pressure",
    "chest tightness",
    "सीने में दर्द",
    "सीने में दबाव",
    "dolor en el pecho",
    "douleur thoracique",
    "brustschmerzen",
    "shortness of breath",
    "difficulty breathing",
    "breathlessness",
    "unable to breathe",
    "सांस लेने में तकलीफ",
    "सांस फूलना",
    "dificultad para respirar",
    "difficulte a respirer",
    "fainting",
    "fainted",
    "unconscious",
    "loss of consciousness",
    "collapsed",
    "बेहोश",
    "बेहोशी",
    "desmayo",
    "perte de connaissance",
    "heavy bleeding",
    "uncontrolled bleeding",
    "bleeding heavily",
    "खून बहना",
    "sangrado abundante",
    "saignement abondant",
    "stroke",
    "face drooping",
    "slurred speech",
    "one-sided weakness",
    "paralysis",
    "स्ट्रोक",
    "parálisis",
    "suicide",
    "suicidal",
    "end my life",
    "self harm",
    "आत्महत्या"
  ];

  return emergencyKeywords.some((keyword) => text.includes(keyword.toLowerCase()));
}
