"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ProfileSwitcher from "@/components/ProfileSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import MedicalDisclaimer from "@/components/MedicalDisclaimer";
import FeatureGuide from "@/components/FeatureGuide";
import { useAuth } from "@/components/AuthProvider";
import { useActiveProfile } from "@/app/context/ActiveProfileContext";
import { useLocalize } from "@/lib/useLocalize";
import { IEmergencyContact, IEmergencyProfile } from "@/lib/models/EmergencyProfile";

function EmergencyProfileContent() {
  const searchParams = useSearchParams();
  const publicToken = searchParams?.get("token");

  const localize = useLocalize();
  const { user } = useAuth();
  const { activeProfileId, activeProfile } = useActiveProfile();

  const [isPublicResponderView, setIsPublicResponderView] = useState<boolean>(Boolean(publicToken));
  const [profile, setProfile] = useState<Partial<IEmergencyProfile>>({
    patientName: "",
    bloodGroup: "O+",
    allergies: [],
    chronicConditions: [],
    currentEmergencyMeds: [],
    emergencyContacts: [],
    hospitalPreference: "",
    insuranceInfo: { provider: "", policyNumber: "" },
    organDonor: false,
    specialMedicalNotes: "",
    sharingSettings: {
      isPubliclyAccessibleViaEmergencyLink: false,
      publicToken: undefined,
      showAllergies: true,
      showBloodGroup: true,
      showMeds: true,
      showConditions: true,
      showContacts: true,
    },
  });

  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Form input buffers
  const [allergyInput, setAllergyInput] = useState("");
  const [conditionInput, setConditionInput] = useState("");
  const [medInput, setMedInput] = useState("");

  const [contactName, setContactName] = useState("");
  const [contactRelation, setContactRelation] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactFormError, setContactFormError] = useState<string | null>(null);

  // Load Profile
  const loadProfile = async () => {
    setLoading(true);
    try {
      if (publicToken) {
        // Public responder view
        const res = await fetch(`/api/emergency-profile?token=${encodeURIComponent(publicToken)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.profile) {
            setProfile(data.profile);
            setIsPublicResponderView(true);
          }
        }
      } else {
        const uParam = encodeURIComponent(user?.uid || "guest");
        const pParam = encodeURIComponent(activeProfileId || "myself");
        const res = await fetch(`/api/emergency-profile?userId=${uParam}&profileId=${pParam}`);
        if (res.ok) {
          const data = await res.json();
          if (data.profile) {
            setProfile(data.profile);
          } else {
            // Default pre-fill
            setProfile((prev) => ({
              ...prev,
              patientName: activeProfile?.name || user?.displayName || "Patient",
            }));
          }
        }
      }
    } catch (err) {
      console.warn("Failed to load emergency profile:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [user, activeProfileId, publicToken]);

  // Save Profile Changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        userId: user?.uid || "guest",
        profileId: activeProfileId || "myself",
        profileData: {
          ...profile,
          patientName: profile.patientName || activeProfile?.name || user?.displayName || "Patient",
        },
      };

      const res = await fetch("/api/emergency-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setProfile(data.profile);
        }
        setIsEditing(false);
        setSaveToast(localize("Emergency profile updated successfully!", "आपातकालीन प्रोफ़ाइल सफलतापूर्वक सहेजी गई!"));
        setTimeout(() => setSaveToast(null), 5000);
      }
    } catch (err) {
      console.error("Failed to save emergency profile:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Helpers for tags
  const addTag = (type: "allergy" | "condition" | "med") => {
    if (type === "allergy" && allergyInput.trim()) {
      setProfile((prev) => ({
        ...prev,
        allergies: [...(prev.allergies || []), allergyInput.trim()],
      }));
      setAllergyInput("");
    } else if (type === "condition" && conditionInput.trim()) {
      setProfile((prev) => ({
        ...prev,
        chronicConditions: [...(prev.chronicConditions || []), conditionInput.trim()],
      }));
      setConditionInput("");
    } else if (type === "med" && medInput.trim()) {
      setProfile((prev) => ({
        ...prev,
        currentEmergencyMeds: [...(prev.currentEmergencyMeds || []), medInput.trim()],
      }));
      setMedInput("");
    }
  };

  const removeTag = (type: "allergy" | "condition" | "med", index: number) => {
    if (type === "allergy") {
      setProfile((prev) => ({
        ...prev,
        allergies: (prev.allergies || []).filter((_, i) => i !== index),
      }));
    } else if (type === "condition") {
      setProfile((prev) => ({
        ...prev,
        chronicConditions: (prev.chronicConditions || []).filter((_, i) => i !== index),
      }));
    } else if (type === "med") {
      setProfile((prev) => ({
        ...prev,
        currentEmergencyMeds: (prev.currentEmergencyMeds || []).filter((_, i) => i !== index),
      }));
    }
  };

  const addContact = () => {
    if (!contactName.trim() || !contactPhone.trim()) {
      setContactFormError(localize("Please enter both contact name and phone number.", "कृपया संपर्क का नाम और फोन नंबर दोनों दर्ज करें।"));
      return;
    }
    const newC: IEmergencyContact = {
      id: `c-${Date.now()}`,
      name: contactName.trim(),
      relationship: contactRelation.trim() || "Family",
      phone: contactPhone.trim(),
      isPrimary: (profile.emergencyContacts || []).length === 0,
    };
    setProfile((prev) => ({
      ...prev,
      emergencyContacts: [...(prev.emergencyContacts || []), newC],
    }));
    setContactName("");
    setContactRelation("");
    setContactPhone("");
    setContactFormError(null);
  };

  const removeContact = (id: string) => {
    setProfile((prev) => ({
      ...prev,
      emergencyContacts: (prev.emergencyContacts || []).filter((c) => c.id !== id),
    }));
  };

  const publicShareUrl =
    typeof window !== "undefined" && profile.sharingSettings?.publicToken
      ? `${window.location.origin}/emergency-profile?token=${profile.sharingSettings.publicToken}`
      : null;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[color:var(--border)] bg-[color:var(--surface)]/90 backdrop-blur-md px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition"
            >
              ←
            </Link>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span className="text-xl">🚨</span>
                <span>{localize("Emergency Medical Profile & SOS Card", "आपातकालीन मेडिकल आईडी व एसओएस")}</span>
              </h1>
              <p className="text-xs text-[var(--muted)]">
                {localize(
                  "Critical blood group, allergy warnings, emergency meds, and primary contacts",
                  "रक्त समूह, एलर्जी चेतावनी, जरूरी दवाएं और प्राथमिक आपातकालीन संपर्क"
                )}
              </p>
            </div>
          </div>

          {!isPublicResponderView && (
            <div className="flex items-center gap-3">
              <ProfileSwitcher />
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-6 md:px-8 space-y-6">
        <MedicalDisclaimer />

        {/* Public Responder Banner */}
        {isPublicResponderView && (
          <div className="rounded-3xl border border-rose-500/50 bg-rose-950/40 p-5 shadow-2xl flex items-center gap-4">
            <span className="text-3xl">🚑</span>
            <div>
              <p className="text-xs uppercase tracking-wider text-rose-400 font-extrabold">
                {localize("First Responder / Paramedic View", "पैरामेडिक / फर्स्ट रिस्पॉन्डर दृश्य")}
              </p>
              <h2 className="text-lg font-black text-white">
                {localize("Verified Emergency Medical Record", "सत्यापित आपातकालीन चिकित्सा रिकॉर्ड")}
              </h2>
              <p className="text-xs text-rose-200 mt-0.5">
                {localize(
                  "This record is shared publicly for triage and emergency resuscitation purposes by the patient.",
                  "यह रिकॉर्ड मरीज द्वारा आपातकालीन उपचार व ट्रायज हेतु साझा किया गया है।"
                )}
              </p>
            </div>
          </div>
        )}

        {/* Feature Guide (Hidden on Public View) */}
        {!isPublicResponderView && (
          <FeatureGuide
            badge={localize("Emergency SOS Medical Card", "आपातकालीन एसओएस मेडिकल कार्ड")}
            title={localize("How to Setup Your Emergency Profile & Sharing Toggles", "अपनी आपातकालीन प्रोफ़ाइल और शेयरिंग कैसे सेट करें")}
            purpose={localize(
              "Store your blood group, severe allergies, active chronic conditions, and primary emergency contacts for immediate access during clinical emergencies.",
              "आपातकालीन स्थिति में त्वरित पहुंच के लिए अपना रक्त समूह, गंभीर एलर्जी, दवाएं और प्राथमिक संपर्क सेव रखें।"
            )}
            inputs={[
              localize("Blood Group (A+, B+, O+, AB+, etc.)", "रक्त समूह (A+, B+, O+, AB+, आदि)"),
              localize("Severe Allergies (Penicillin, Peanuts, Sulfa, NSAIDs)", "गंभीर एलर्जी (पेनिसिलिन, मूंगफली, सल्फा आदि)"),
              localize("Emergency Contacts with relationship & phone numbers", "रिश्ते और फोन नंबर के साथ आपातकालीन संपर्क"),
              localize("Public Sharing Toggle (generates a secure emergency URL / QR code)", "सार्वजनिक शेयरिंग टॉगल (सुरक्षित आपातकालीन लिंक बनाता है)"),
            ]}
            steps={[
              localize("1. Fill or edit your vital emergency details below", "1. नीचे अपना महत्वपूर्ण आपातकालीन विवरण भरें"),
              localize("2. Toggle which fields are visible on your public emergency card", "2. चुनें कि आपके आपातकालीन कार्ड पर कौन सी जानकारी दिखेगी"),
              localize("3. Save and bookmark or print your public emergency link for your wallet or lock screen", "3. सहेजें और अपने लॉक स्क्रीन या वॉलेट के लिए लिंक सुरक्षित रखें"),
            ]}
            outputs={[
              localize("High-visibility digital Medical ID card formatted for emergency responders", "आपातकालीन कर्मियों के लिए स्पष्ट डिजिटल मेडिकल आईडी कार्ड"),
              localize("One-tap direct dial buttons for your designated emergency contacts", "नामित संपर्कों को सीधे कॉल करने के लिए सिंगल-टैप बटन"),
              localize("Field-level privacy controls keeping sensitive diagnoses confidential", "संवेदनशील निदान को गोपनीय रखने के लिए गोपनीयता नियंत्रण"),
            ]}
            tip={localize(
              "Wallet Tip: You can save this link as a QR code or add it to your phone's lock screen emergency contact info for first responders.",
              "सुझाव: आप इस लिंक का क्यूआर कोड बनाकर अपने फोन के लॉक स्क्रीन पर जोड़ सकते हैं ताकि पैरामेडिक्स इसे तुरंत देख सकें।"
            )}
          />
        )}

        {/* Success Alert */}
        {saveToast && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-emerald-500/40 bg-emerald-500/15 p-4 text-sm font-semibold text-emerald-300 flex items-center justify-between"
          >
            <span>{saveToast}</span>
            <button onClick={() => setSaveToast(null)} className="text-xs underline text-emerald-400">
              ✕
            </button>
          </motion.div>
        )}

        {/* EMERGENCY MEDICAL CARD HERO */}
        <div className="rounded-[32px] border-2 border-rose-500/40 bg-gradient-to-br from-slate-900/95 via-slate-900/85 to-rose-950/50 p-6 md:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rose-500/20 pb-5">
            <div>
              <span className="rounded-full bg-rose-500/20 border border-rose-500/40 px-3 py-1 text-xs font-black uppercase tracking-wider text-rose-300">
                🚨 {localize("Medical Emergency ID", "मेडिकल इमरजेंसी आईडी")}
              </span>
              <h2 className="text-3xl font-black text-white mt-2">
                {profile.patientName || localize("Patient Record", "रोगी रिकॉर्ड")}
              </h2>
              <p className="text-xs text-rose-300/80 mt-1">
                {activeProfile ? `${activeProfile.relationship} • ` : ""}
                {localize("Emergency Profile active", "आपातकालीन प्रोफ़ाइल सक्रिय")}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Blood Group Badge */}
              {profile.bloodGroup && (
                <div className="rounded-2xl border-2 border-rose-500 bg-rose-600 px-5 py-3 text-center shadow-lg shadow-rose-600/30">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-rose-100 block">
                    {localize("Blood Group", "रक्त समूह")}
                  </span>
                  <span className="text-2xl md:text-3xl font-black text-white block">
                    {profile.bloodGroup}
                  </span>
                </div>
              )}

              {!isPublicResponderView && (
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-5 py-3 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 transition cursor-pointer"
                >
                  {isEditing ? localize("✕ Close Edit", "✕ संपादन बंद करें") : localize("✏️ Edit Medical ID", "✏️ आईडी संपादित करें")}
                </button>
              )}
            </div>
          </div>

          {/* Grid of Critical Warnings */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* Allergies */}
            <div className="rounded-2xl border border-rose-500/30 bg-slate-950/70 p-4 space-y-2">
              <div className="flex items-center gap-2 text-rose-400 font-extrabold text-xs uppercase tracking-wider">
                <span>⚠️</span>
                <span>{localize("Severe Allergies", "गंभीर एलर्जी")}</span>
              </div>
              {(profile.allergies || []).length === 0 ? (
                <p className="text-xs text-slate-400">{localize("No known drug allergies reported (NKDA)", "कोई ज्ञात एलर्जी दर्ज नहीं")}</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {profile.allergies?.map((a, i) => (
                    <span
                      key={i}
                      className="rounded-xl border border-rose-500/40 bg-rose-500/20 px-2.5 py-1 text-xs font-bold text-rose-200"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Chronic Conditions */}
            <div className="rounded-2xl border border-amber-500/30 bg-slate-950/70 p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs uppercase tracking-wider">
                <span>🩺</span>
                <span>{localize("Chronic Conditions", "दीर्घकालिक बीमारियां")}</span>
              </div>
              {(profile.chronicConditions || []).length === 0 ? (
                <p className="text-xs text-slate-400">{localize("No chronic conditions reported", "कोई पुरानी बीमारी दर्ज नहीं")}</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {profile.chronicConditions?.map((c, i) => (
                    <span
                      key={i}
                      className="rounded-xl border border-amber-500/40 bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-200"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Emergency Medications */}
            <div className="rounded-2xl border border-cyan-500/30 bg-slate-950/70 p-4 space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-extrabold text-xs uppercase tracking-wider">
                <span>💊</span>
                <span>{localize("Current Emergency Meds", "सक्रिय आपातकालीन दवाएं")}</span>
              </div>
              {(profile.currentEmergencyMeds || []).length === 0 ? (
                <p className="text-xs text-slate-400">{localize("No emergency medications specified", "कोई आपातकालीन दवा दर्ज नहीं")}</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {profile.currentEmergencyMeds?.map((m, i) => (
                    <span
                      key={i}
                      className="rounded-xl border border-cyan-500/40 bg-cyan-500/20 px-2.5 py-1 text-xs font-bold text-cyan-200"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Special Notes & Hospital Preference */}
          {(profile.specialMedicalNotes || profile.hospitalPreference || profile.organDonor) && (
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 space-y-2 text-xs">
              {profile.specialMedicalNotes && (
                <p className="text-slate-300">
                  <strong className="text-white font-bold">{localize("Special Medical Directives:", "विशेष चिकित्सा निर्देश:")}</strong>{" "}
                  {profile.specialMedicalNotes}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1">
                {profile.hospitalPreference && (
                  <span>🏥 {localize("Preferred Hospital:", "पसंदीदा अस्पताल:")} <strong className="text-white">{profile.hospitalPreference}</strong></span>
                )}
                {profile.organDonor && (
                  <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-emerald-300 font-bold border border-emerald-500/30">
                    ❤️ {localize("Registered Organ Donor", "पंजीकृत अंग दाता")}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* EMERGENCY CONTACTS LIST */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <span>📞</span>
              <span>{localize("Designated Emergency Contacts (One-Tap Dial)", "नामित आपातकालीन संपर्क (कॉल करें)")}</span>
            </h3>

            {(profile.emergencyContacts || []).length === 0 ? (
              <p className="text-xs text-slate-400">{localize("No emergency contacts added yet.", "अभी तक कोई संपर्क नहीं जोड़ा गया है।")}</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {profile.emergencyContacts?.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-2xl border border-white/10 bg-slate-950 p-4 flex items-center justify-between gap-3 shadow-md"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{c.name}</span>
                        {c.isPrimary && (
                          <span className="rounded bg-rose-500/20 text-rose-300 px-1.5 py-0.2 text-[10px] font-bold border border-rose-500/30">
                            {localize("Primary", "मुख्य")}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--muted)]">{c.relationship}</p>
                      <p className="text-xs font-mono text-cyan-300 mt-1">{c.phone}</p>
                    </div>

                    <a
                      href={`tel:${c.phone}`}
                      className="rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-rose-500 shadow-md shadow-rose-600/30 transition flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <span>📞</span>
                      <span>{localize("Call Now", "कॉल करें")}</span>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* EDIT PROFILE MODAL / EXPANDED FORM */}
        {isEditing && (
          <form
            onSubmit={handleSaveProfile}
            className="rounded-3xl border border-cyan-500/30 bg-slate-900/90 p-6 md:p-8 shadow-2xl space-y-6"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>✏️</span>
                <span>{localize("Edit Emergency Medical Details & Privacy", "आपातकालीन विवरण व गोपनीयता संपादित करें")}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕ {localize("Cancel", "रद्द करें")}
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Patient Name */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {localize("Patient Full Name", "रोगी का पूरा नाम")}
                </label>
                <input
                  type="text"
                  value={profile.patientName || ""}
                  onChange={(e) => setProfile({ ...profile, patientName: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs text-white"
                  required
                />
              </div>

              {/* Blood Group */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {localize("Blood Group", "रक्त समूह")}
                </label>
                <select
                  value={profile.bloodGroup || "O+"}
                  onChange={(e) => setProfile({ ...profile, bloodGroup: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs font-semibold text-white"
                >
                  {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-", "Unknown"].map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Allergies Editor */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                {localize("Severe Allergies", "गंभीर एलर्जी")}
              </label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={allergyInput}
                  onChange={(e) => setAllergyInput(e.target.value)}
                  placeholder={localize("e.g. Penicillin, Peanuts, Sulfa", "उदा. पेनिसिलिन, मूंगफली")}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-xs text-white"
                />
                <button
                  type="button"
                  onClick={() => addTag("allergy")}
                  className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700"
                >
                  {localize("Add", "जोड़ें")}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.allergies?.map((a, i) => (
                  <span
                    key={i}
                    className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-300 flex items-center gap-1.5"
                  >
                    {a}
                    <button type="button" onClick={() => removeTag("allergy", i)} className="hover:text-white">
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Chronic Conditions Editor */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                {localize("Chronic Conditions", "दीर्घकालिक स्थितियां")}
              </label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={conditionInput}
                  onChange={(e) => setConditionInput(e.target.value)}
                  placeholder={localize("e.g. Type 2 Diabetes, Hypertension, Asthma", "उदा. टाइप 2 डायबिटीज, अस्थमा")}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-xs text-white"
                />
                <button
                  type="button"
                  onClick={() => addTag("condition")}
                  className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700"
                >
                  {localize("Add", "जोड़ें")}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.chronicConditions?.map((c, i) => (
                  <span
                    key={i}
                    className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300 flex items-center gap-1.5"
                  >
                    {c}
                    <button type="button" onClick={() => removeTag("condition", i)} className="hover:text-white">
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Emergency Contacts Editor */}
            <div className="space-y-3 pt-2 border-t border-white/10">
              <label className="block text-xs font-bold text-slate-300">
                {localize("Add Emergency Contact", "आपातकालीन संपर्क जोड़ें")}
              </label>
              {contactFormError && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-2.5 text-xs text-rose-300">
                  ⚠️ {contactFormError}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => {
                    setContactName(e.target.value);
                    if (contactFormError) setContactFormError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addContact();
                    }
                  }}
                  placeholder={localize("Name", "नाम")}
                  className="rounded-xl border border-slate-700 bg-slate-950 p-2 text-xs text-white"
                />
                <input
                  type="text"
                  value={contactRelation}
                  onChange={(e) => setContactRelation(e.target.value)}
                  placeholder={localize("Relationship (Spouse, Son)", "संबंध")}
                  className="rounded-xl border border-slate-700 bg-slate-950 p-2 text-xs text-white"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={addContact}
                    className="rounded-xl bg-cyan-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400"
                  >
                    {localize("Add", "जोड़ें")}
                  </button>
                </div>
              </div>

              {/* List of current contacts */}
              <div className="space-y-1.5 pt-2">
                {profile.emergencyContacts?.map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-xs bg-slate-950/60 p-2 rounded-xl">
                    <span>
                      <strong>{c.name}</strong> ({c.relationship}) • {c.phone}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeContact(c.id)}
                      className="text-rose-400 hover:text-rose-300 font-bold"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Special Directives */}
            <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-white/10">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {localize("Preferred Hospital / ER", "पसंदीदा अस्पताल")}
                </label>
                <input
                  type="text"
                  value={profile.hospitalPreference || ""}
                  onChange={(e) => setProfile({ ...profile, hospitalPreference: e.target.value })}
                  placeholder={localize("e.g. City General Hospital", "उदा. सिटी हॉस्पिटल")}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {localize("Special Medical Notes / Directives", "विशेष चिकित्सा निर्देश")}
                </label>
                <input
                  type="text"
                  value={profile.specialMedicalNotes || ""}
                  onChange={(e) => setProfile({ ...profile, specialMedicalNotes: e.target.value })}
                  placeholder={localize("e.g. Pacemaker implanted 2023, diabetic", "उदा. पेसमेकर लगा है")}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs text-white"
                />
              </div>
            </div>

            {/* GRANULAR PRIVACY & SHARING CONTROLS */}
            <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-5 space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-extrabold text-indigo-300 uppercase tracking-wider">
                    🔒 {localize("Granular Sharing & Public Link Controls", "आपातकालीन शेयरिंग व गोपनीयता नियंत्रण")}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {localize("Control which fields appear when paramedics view your public emergency link.", "तय करें कि सार्वजनिक आपातकालीन लिंक पर कौन सी जानकारी दिखेगी।")}
                  </p>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.sharingSettings?.isPubliclyAccessibleViaEmergencyLink || false}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        sharingSettings: {
                          ...profile.sharingSettings!,
                          isPubliclyAccessibleViaEmergencyLink: e.target.checked,
                        },
                      })
                    }
                    className="h-4 w-4 rounded accent-indigo-500"
                  />
                  <span className="text-xs font-bold text-white">
                    {localize("Enable Public Link", "सार्वजनिक लिंक सक्षम करें")}
                  </span>
                </label>
              </div>

              {profile.sharingSettings?.isPubliclyAccessibleViaEmergencyLink && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs pt-2">
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profile.sharingSettings.showBloodGroup}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          sharingSettings: { ...profile.sharingSettings!, showBloodGroup: e.target.checked },
                        })
                      }
                      className="accent-cyan-500"
                    />
                    <span>{localize("Blood Group", "रक्त समूह")}</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profile.sharingSettings.showAllergies}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          sharingSettings: { ...profile.sharingSettings!, showAllergies: e.target.checked },
                        })
                      }
                      className="accent-cyan-500"
                    />
                    <span>{localize("Allergies", "एलर्जी")}</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profile.sharingSettings.showConditions}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          sharingSettings: { ...profile.sharingSettings!, showConditions: e.target.checked },
                        })
                      }
                      className="accent-cyan-500"
                    />
                    <span>{localize("Conditions", "बीमारियां")}</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profile.sharingSettings.showMeds}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          sharingSettings: { ...profile.sharingSettings!, showMeds: e.target.checked },
                        })
                      }
                      className="accent-cyan-500"
                    />
                    <span>{localize("Medications", "दवाएं")}</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profile.sharingSettings.showContacts}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          sharingSettings: { ...profile.sharingSettings!, showContacts: e.target.checked },
                        })
                      }
                      className="accent-cyan-500"
                    />
                    <span>{localize("Contacts", "संपर्क")}</span>
                  </label>
                </div>
              )}

              {publicShareUrl && (
                <div className="rounded-xl border border-indigo-500/40 bg-slate-950 p-3 flex items-center justify-between gap-2 text-xs">
                  <span className="font-mono text-cyan-300 truncate">{publicShareUrl}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(publicShareUrl);
                      alert(localize("Emergency link copied!", "आपातकालीन लिंक कॉपी किया गया!"));
                    }}
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 font-bold text-white whitespace-nowrap hover:bg-indigo-500"
                  >
                    {localize("Copy Link", "कॉपी करें")}
                  </button>
                </div>
              )}
            </div>

            {/* Save Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-xl px-5 py-2.5 text-xs font-semibold text-slate-400 hover:text-white"
              >
                {localize("Cancel", "रद्द करें")}
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-xl bg-cyan-400 px-7 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-300 shadow-lg disabled:opacity-50"
              >
                {isSaving ? localize("Saving...", "सहेज रहे हैं...") : localize("Save Emergency Profile", "प्रोफ़ाइल सहेजें")}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

export default function EmergencyProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--background)] p-10 text-[var(--foreground)]">
          Loading Emergency Medical Profile...
        </div>
      }
    >
      <EmergencyProfileContent />
    </Suspense>
  );
}
