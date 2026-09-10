"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ProfileSwitcher, { openAddFamilyMemberModal } from "@/components/ProfileSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import MedicalDisclaimer from "@/components/MedicalDisclaimer";
import FeatureGuide from "@/components/FeatureGuide";
import { useAuth } from "@/components/AuthProvider";
import { useActiveProfile } from "@/app/context/ActiveProfileContext";
import { useLocalize } from "@/lib/useLocalize";
import { FamilyRole, HealthCategory, IFamilyGroup, IFamilyMember } from "@/lib/models/FamilyGroup";

const HEALTH_CATEGORIES: Array<{ key: HealthCategory; en: string; hi: string; icon: string }> = [
  { key: "vitals", en: "Vitals & Heart Screening", hi: "वाइटल्स व हृदय जांच", icon: "❤️" },
  { key: "skin", en: "Skin & Rash Screenings", hi: "त्वचा व रैश जांच", icon: "🔬" },
  { key: "medications", en: "Active Prescriptions & Reminders", hi: "सक्रिय दवाएं व रिमाइंडर", icon: "💊" },
  { key: "adherence", en: "Medication Adherence Checklist", hi: "दवा अनुपालन चेकलिस्ट", icon: "🗓️" },
  { key: "conditions", en: "Chronic Health History", hi: "दीर्घकालिक स्वास्थ्य इतिहास", icon: "📋" },
  { key: "family_pedigree", en: "Family Tree & Hereditary Risk", hi: "पारिवारिक स्वास्थ्य वृक्ष", icon: "🌳" },
  { key: "lab_reports", en: "Lab Test Reports", hi: "लैब टेस्ट रिपोर्ट", icon: "🧪" },
  { key: "diet", en: "Diet & Nutrition Plans", hi: "डाइट व पोषण योजनाएं", icon: "🥗" },
  { key: "emergency_profile", en: "Emergency Medical ID & SOS", hi: "आपातकालीन मेडिकल आईडी", icon: "🚨" },
  { key: "clinical_export", en: "SBAR Doctor Dossier Export", hi: "डॉक्टर SBAR रिपोर्ट निर्यात", icon: "📄" },
];

const ROLES_INFO: Record<FamilyRole, { en: string; hi: string; descEn: string; descHi: string }> = {
  Owner: {
    en: "Owner",
    hi: "समूह स्वामी",
    descEn: "Full administrative access and member permissions management.",
    descHi: "पूर्ण प्रशासनिक पहुंच और सदस्य अनुमतियों का प्रबंधन।",
  },
  "Adult member": {
    en: "Adult Member",
    hi: "वयस्क सदस्य",
    descEn: "Co-equal family member with configurable category permissions.",
    descHi: "कॉन्फ़िगर करने योग्य श्रेणी अनुमतियों के साथ वयस्क परिवार सदस्य।",
  },
  Caregiver: {
    en: "Caregiver",
    hi: "देखभालकर्ता (केयरगिवर)",
    descEn: "Can log vitals, track daily doses, and view health summaries.",
    descHi: "वाइटल्स दर्ज कर सकते हैं, दैनिक खुराक ट्रैक कर सकते हैं।",
  },
  "Dependent manager": {
    en: "Dependent Manager",
    hi: "आश्रित प्रबंधक",
    descEn: "Can manage profiles, prescriptions, and history for dependents.",
    descHi: "आश्रितों के लिए प्रोफाइल, दवाएं और इतिहास प्रबंधित कर सकते हैं।",
  },
  "Read-only clinician": {
    en: "Read-Only Clinician",
    hi: "चिकित्सक (केवल अवलोकन)",
    descEn: "Can view clinical summaries, vitals, and adherence reports.",
    descHi: "क्लीनिकल सारांश, वाइटल्स और अनुपालन रिपोर्ट देख सकते हैं।",
  },
};

function FamilyHealthContent() {
  const localize = useLocalize();
  const { user } = useAuth();
  const { dependents, deleteDependent } = useActiveProfile();

  const [groups, setGroups] = useState<IFamilyGroup[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & Forms State
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<FamilyRole>("Adult member");

  const [enterInviteCode, setEnterInviteCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  // Selected Member for Permission Matrix editing
  const [selectedMember, setSelectedMember] = useState<IFamilyMember | null>(null);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);

  // Feedback Notification
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Load Family Data
  const loadFamilyData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/family-health?userId=${encodeURIComponent(user.uid)}`);
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
        setInvitations(data.invitations || []);
        setAuditLogs(data.auditLogs || []);

        if (data.groups && data.groups.length > 0 && !selectedMember) {
          const firstNonOwner = data.groups[0].members.find((m: any) => m.userId !== user.uid);
          if (firstNonOwner) setSelectedMember(firstNonOwner);
        }
      }
    } catch (err) {
      console.warn("Failed to load family health records:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFamilyData();
  }, [user]);

  const activeGroup = groups[0] || null;
  const isOwner = activeGroup?.ownerUserId === user?.uid;

  // 1. Create Group
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    try {
      const res = await fetch("/api/family-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_group", name: newGroupName.trim() }),
      });
      if (res.ok) {
        setShowCreateGroupModal(false);
        setNewGroupName("");
        setStatusNotice(localize("Family group created successfully!", "पारिवारिक समूह सफलतापूर्वक बनाया गया!"));
        setTimeout(() => setStatusNotice(null), 5000);
        await loadFamilyData();
      }
    } catch (err) {
      console.error("Failed to create group:", err);
    }
  };

  // 2. Invite Member
  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !activeGroup) return;

    try {
      const res = await fetch("/api/family-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "invite_member",
          familyGroupId: activeGroup.id,
          inviteeEmail: inviteEmail.trim(),
          role: inviteRole,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setShowInviteModal(false);
        setInviteEmail("");
        setStatusNotice(
          localize(
            `Invitation sent to ${inviteEmail}! Invite code: ${data.invitation.inviteCode}`,
            `${inviteEmail} को आमंत्रण भेजा गया! कोड: ${data.invitation.inviteCode}`
          )
        );
        setTimeout(() => setStatusNotice(null), 8000);
        await loadFamilyData();
      }
    } catch (err) {
      console.error("Failed to send invitation:", err);
    }
  };

  // 3. Accept Invite by Code
  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enterInviteCode.trim()) return;

    setIsJoining(true);
    try {
      const res = await fetch("/api/family-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept_invite", inviteCode: enterInviteCode.trim() }),
      });

      if (res.ok) {
        setEnterInviteCode("");
        setStatusNotice(localize("Joined family group successfully!", "सफलतापूर्वक परिवार समूह में शामिल हुए!"));
        setTimeout(() => setStatusNotice(null), 6000);
        await loadFamilyData();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to join group");
      }
    } catch (err) {
      console.error("Failed to accept invite:", err);
    } finally {
      setIsJoining(false);
    }
  };

  // 4. Revoke Member Access
  const handleRevokeMember = async (targetUserId: string, targetEmail: string) => {
    if (!activeGroup) return;
    if (
      !confirm(
        localize(
          `Are you sure you want to revoke access for ${targetEmail}? They will no longer be able to view shared records.`,
          `क्या आप वाकई ${targetEmail} की पहुंच रद्द करना चाहते हैं?`
        )
      )
    ) {
      return;
    }

    try {
      const res = await fetch("/api/family-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "revoke_member",
          familyGroupId: activeGroup.id,
          targetUserId,
        }),
      });

      if (res.ok) {
        setStatusNotice(localize("Member access revoked.", "सदस्य पहुंच रद्द की गई।"));
        setTimeout(() => setStatusNotice(null), 4000);
        if (selectedMember?.userId === targetUserId) {
          setSelectedMember(null);
        }
        await loadFamilyData();
      }
    } catch (err) {
      console.error("Failed to revoke member:", err);
    }
  };

  // 5. Toggle Category Permission for Selected Member
  const handleTogglePermission = async (categoryKey: HealthCategory, actionType: "view" | "edit") => {
    if (!activeGroup || !selectedMember || !isOwner) return;

    const currentPerms = { ...selectedMember.permissions };
    const catList = [...(currentPerms[categoryKey] || [])];

    let updatedList: ("view" | "edit" | "admin")[];
    if (catList.includes(actionType)) {
      updatedList = catList.filter((a) => a !== actionType);
    } else {
      updatedList = [...catList, actionType];
      if (actionType === "edit" && !updatedList.includes("view")) {
        updatedList.push("view");
      }
    }

    currentPerms[categoryKey] = updatedList;

    // Optimistic UI update
    setSelectedMember({ ...selectedMember, permissions: currentPerms });

    try {
      setIsSavingPermissions(true);
      const res = await fetch("/api/family-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_permissions",
          familyGroupId: activeGroup.id,
          targetUserId: selectedMember.userId,
          permissions: currentPerms,
        }),
      });

      if (res.ok) {
        await loadFamilyData();
      }
    } catch (err) {
      console.error("Failed to save permissions:", err);
    } finally {
      setIsSavingPermissions(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-24">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-[color:var(--border)] bg-[color:var(--surface)]/90 backdrop-blur-md px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition"
            >
              ←
            </Link>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>🛡️</span>
                <span>{localize("Family Health Sharing & Access Hub", "पारिवारिक स्वास्थ्य साझाकरण केंद्र")}</span>
              </h1>
              <p className="text-xs text-[var(--muted)]">
                {localize(
                  "Granular permission matrix, role-based records sharing, and audit logging",
                  "विस्तृत अनुमति मैट्रिक्स, भूमिका आधारित शेयरिंग और सुरक्षा ऑडिट लॉग"
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ProfileSwitcher />
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pt-6 md:px-8 space-y-8">
        <MedicalDisclaimer />

        {/* Feature Usage Guide */}
        <FeatureGuide
          badge={localize("Multi-User Health Sharing", "बहु-उपयोगकर्ता स्वास्थ्य साझाकरण")}
          title={localize("How to Manage Family Sharing & Privacy Controls", "पारिवारिक शेयरिंग और गोपनीयता को कैसे नियंत्रित करें")}
          purpose={localize(
            "Share health records safely across managed dependent profiles (children, elderly) and linked adult accounts (spouse, caregivers, doctors) with strict category-level permissions.",
            "आश्रितों और वयस्क परिजनों या डॉक्टरों के साथ 10 श्रेणियों में विशिष्ट अनुमतियों के आधार पर सुरक्षित रूप से मेडिकल रिकॉर्ड साझा करें।"
          )}
          inputs={[
            localize("Managed Dependents: Children or elderly family members created directly under your account", "आश्रित: आपके खाते में सीधे बनाए गए बच्चे या बुजुर्ग"),
            localize("Linked Adults: Invite family members or clinicians by email with an 8-character invite code", "वयस्क सदस्य: 8-अक्षरों के आमंत्रण कोड के साथ परिजनों या डॉक्टरों को जोड़ें"),
            localize("Granular Matrix: Select which categories (Vitals, Meds, Adherence, Labs) they can view or edit", "अनुमति मैट्रिक्स: तय करें कि वे कौन से रिकॉर्ड देख या संपादित कर सकते हैं"),
          ]}
          steps={[
            localize("1. Check your Managed Dependents in Section 1 and linked members in Section 2", "1. अनुभाग 1 में आश्रित और अनुभाग 2 में जुड़े सदस्य देखें"),
            localize("2. Click 'Invite Adult Member' to generate an invite code for spouse or caregiver", "2. परिजन या डॉक्टर के लिए 'Invite' पर क्लिक करके कोड बनाएं"),
            localize("3. Adjust the Granular Permission Matrix below to toggle View / Edit rights", "3. नीचे दी गई मैट्रिक्स में देखने या बदलने की अनुमति तय करें"),
            localize("4. View the Security Audit Log to monitor who accessed or modified records", "4. किसने कौन सा रिकॉर्ड देखा, यह जानने के लिए ऑडिट लॉग देखें"),
          ]}
          outputs={[
            localize("Coordinated family health oversight without compromising account passwords", "बिना पासवर्ड साझा किए पूरे परिवार की समन्वित स्वास्थ्य निगरानी"),
            localize("Instant 1-click access revocation anytime you wish to terminate sharing", "जब चाहें एक क्लिक में पहुंच रद्द करने की पूर्ण स्वतंत्रता"),
            localize("Tamper-evident audit trail of all record accesses and exports", "सभी रिकॉर्ड देखे जाने और निर्यात का स्थायी सुरक्षा ऑडिट रिकॉर्ड"),
          ]}
          tip={localize(
            "Privacy Tip: Caregivers can log vitals and daily medication doses without accessing full diagnosis histories or financial details.",
            "गोपनीयता सुझाव: देखभालकर्ता (Caregiver) मरीज का पूरा इतिहास देखे बिना केवल वाइटल्स और दैनिक दवा की खुराक दर्ज कर सकते हैं।"
          )}
        />

        {/* Feedback Alert Notice */}
        {statusNotice && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-emerald-500/40 bg-emerald-500/15 p-4 text-sm font-semibold text-emerald-300 flex items-center justify-between"
          >
            <span>{statusNotice}</span>
            <button onClick={() => setStatusNotice(null)} className="text-xs underline text-emerald-400">
              ✕
            </button>
          </motion.div>
        )}

        {/* SECTION 1: MANAGED DEPENDENTS */}
        <section className="rounded-3xl border border-[color:var(--border)] bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-cyan-950/40 p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">👶</span>
                <h2 className="text-lg font-bold text-white">
                  {localize("Managed Dependent Profiles", "प्रबंधित आश्रित प्रोफ़ाइल (बच्चे व बुजुर्ग)")}
                </h2>
              </div>
              <p className="text-xs text-[var(--muted)] mt-1">
                {localize(
                  "Profiles managed directly under your account without requiring separate login credentials.",
                  "बिना अलग लॉगिन क्रेडेंशियल के आपके खाते के अंतर्गत सीधे प्रबंधित प्रोफ़ाइल।"
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={() => openAddFamilyMemberModal()}
              className="rounded-full bg-cyan-400 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-300 transition flex items-center gap-2 cursor-pointer shadow-md shadow-cyan-500/20"
            >
              <span>➕</span>
              <span>{localize("Add Dependent", "आश्रित जोड़ें")}</span>
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* Account Owner Card */}
            <div className="rounded-2xl border border-emerald-500/30 bg-slate-950/70 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-emerald-400 font-bold">
                  {localize("Account Owner", "खाता धारक")}
                </span>
                <span className="text-xs">👑</span>
              </div>
              <p className="text-base font-extrabold text-white mt-1">
                {user?.displayName || localize("Myself", "स्वयं")}
              </p>
              <p className="text-xs text-[var(--muted)]">{user?.email}</p>
            </div>

            {/* Dependents Cards */}
            {dependents.map((dep) => (
              <div
                key={dep.id}
                className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-cyan-400 font-bold">
                      {dep.relationship}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteDependent(dep.id)}
                      className="text-xs text-rose-400/70 hover:text-rose-400 transition"
                      title={localize("Remove dependent", "आश्रित हटाएं")}
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-base font-extrabold text-white mt-1">{dep.name}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {dep.age ? `${dep.age} ${localize("yrs", "वर्ष")}` : ""} {dep.gender ? `• ${dep.gender}` : ""}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">{localize("Full Owner Control", "पूर्ण नियंत्रण")}</span>
                  <Link
                    href={`/medication-adherence`}
                    className="text-[11px] text-cyan-400 hover:underline font-semibold"
                  >
                    {localize("View Adherence ↗", "खुराक देखें ↗")}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 2: LINKED ADULT MEMBERS & CAREGIVERS */}
        <section className="rounded-3xl border border-[color:var(--border)] bg-slate-900/60 p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🤝</span>
                <h2 className="text-lg font-bold text-white">
                  {localize("Linked Adult Members & Caregivers", "जुड़े वयस्क परिजन व देखभालकर्ता")}
                </h2>
              </div>
              <p className="text-xs text-[var(--muted)] mt-1">
                {localize(
                  "Independent user accounts connected via secure invite codes with assigned roles.",
                  "विशिष्ट भूमिकाओं के साथ सुरक्षित आमंत्रण कोड द्वारा जुड़े स्वतंत्र खाते।"
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {!activeGroup ? (
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(true)}
                  className="rounded-full bg-cyan-400 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-300 transition cursor-pointer shadow-md"
                >
                  ➕ {localize("Create Family Circle", "परिवार सर्कल बनाएं")}
                </button>
              ) : isOwner ? (
                <button
                  type="button"
                  onClick={() => setShowInviteModal(true)}
                  className="rounded-full bg-emerald-400 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-300 transition cursor-pointer shadow-md"
                >
                  ✉️ {localize("Invite Member / Caregiver", "सदस्य / केयरगिवर जोड़ें")}
                </button>
              ) : null}
            </div>
          </div>

          {/* Accept Code Form */}
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔑</span>
              <div>
                <p className="text-xs font-bold text-white">
                  {localize("Have a Family Invitation Code?", "क्या आपके पास पारिवारिक आमंत्रण कोड है?")}
                </p>
                <p className="text-[11px] text-[var(--muted)]">
                  {localize("Paste the 8-character code sent by your family member to join their circle.", "सर्कल में शामिल होने के लिए भेजा गया 8-अक्षरों का कोड दर्ज करें।")}
                </p>
              </div>
            </div>

            <form onSubmit={handleAcceptInvite} className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                value={enterInviteCode}
                onChange={(e) => setEnterInviteCode(e.target.value.toUpperCase())}
                placeholder="FAM12345"
                maxLength={8}
                className="w-full sm:w-36 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono font-bold text-white tracking-widest uppercase focus:border-cyan-400 focus:outline-none text-center"
              />
              <button
                type="submit"
                disabled={isJoining || !enterInviteCode.trim()}
                className="rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-50 whitespace-nowrap transition cursor-pointer"
              >
                {isJoining ? localize("Joining...", "शामिल हो रहे...") : localize("Join Circle", "सर्कल में जुड़ें")}
              </button>
            </form>
          </div>

          {/* Members Grid */}
          {!activeGroup ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <p>{localize("No family circle created yet.", "अभी तक कोई परिवार सर्कल नहीं बना है।")}</p>
              <button
                type="button"
                onClick={() => setShowCreateGroupModal(true)}
                className="mt-3 text-cyan-400 font-bold underline"
              >
                {localize("Create a Family Circle now ↗", "अभी परिवार सर्कल बनाएं ↗")}
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeGroup.members.map((member) => {
                const isSelected = selectedMember?.userId === member.userId;
                const isUserHimself = member.userId === user?.uid;
                const roleMeta = ROLES_INFO[member.role] || ROLES_INFO["Adult member"];

                return (
                  <div
                    key={member.userId}
                    onClick={() => setSelectedMember(member)}
                    className={`rounded-2xl border p-5 transition cursor-pointer flex flex-col justify-between shadow-lg ${
                      isSelected
                        ? "border-cyan-400 bg-slate-900/90 shadow-cyan-500/10"
                        : "border-white/10 bg-slate-950/70 hover:border-white/20"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-extrabold text-sm text-white">
                            {member.displayName || member.email.split("@")[0]}
                          </p>
                          <p className="text-xs text-[var(--muted)]">{member.email}</p>
                        </div>

                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            member.role === "Owner"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : member.role === "Caregiver"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : member.role === "Read-only clinician"
                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                              : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                          }`}
                        >
                          {localize(roleMeta.en, roleMeta.hi)}
                        </span>
                      </div>

                      <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
                        {localize(roleMeta.descEn, roleMeta.descHi)}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                      <span className="text-[10px] text-cyan-400 font-semibold">
                        {isSelected ? `✓ ${localize("Selected for Matrix", "मैट्रिक्स के लिए चुना गया")}` : localize("Click to inspect permissions", "अनुमति देखने के लिए क्लिक करें")}
                      </span>

                      {isOwner && !isUserHimself && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRevokeMember(member.userId, member.email);
                          }}
                          className="text-[11px] text-rose-400 hover:underline font-bold"
                        >
                          {localize("Revoke Access", "पहुंच हटाएं")}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pending Invitations list */}
          {invitations.length > 0 && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
              <span className="text-xs uppercase tracking-wider text-amber-300 font-bold block">
                ⏳ {localize("Pending Invitations", "लंबित आमंत्रण")}
              </span>
              <div className="divide-y divide-white/5">
                {invitations.map((inv) => (
                  <div key={inv.id} className="py-2 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-white font-semibold">{inv.inviteeEmail}</span>
                      <span className="text-[var(--muted)] ml-2">({inv.role})</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="rounded bg-slate-900 px-2 py-0.5 text-cyan-300 border border-slate-700">
                        {inv.inviteCode}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {localize("Expires in 7 days", "7 दिन में समाप्त")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* SECTION 3: GRANULAR PERMISSION MATRIX */}
        <section className="rounded-3xl border border-[color:var(--border)] bg-slate-900/60 p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🎛️</span>
                <h2 className="text-lg font-bold text-white">
                  {localize("Granular Permission Matrix", "विस्तृत अनुमति मैट्रिक्स (10 श्रेणियां)")}
                </h2>
              </div>
              <p className="text-xs text-[var(--muted)] mt-1">
                {selectedMember
                  ? localize(
                      `Configuring permissions for ${selectedMember.displayName || selectedMember.email} (${selectedMember.role})`,
                      `${selectedMember.displayName || selectedMember.email} के लिए अनुमतियों का समायोजन`
                    )
                  : localize("Select a linked member above to review category permissions", "अनुमतियां देखने के लिए ऊपर किसी सदस्य को चुनें")}
              </p>
            </div>

            {selectedMember && isOwner && (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <span>⚡</span>
                <span>{localize("Live Real-time Sync", "लाइव रीयल-टाइम सिंक")}</span>
              </span>
            )}
          </div>

          {!selectedMember ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              {localize("Please select an active member from the cards above to inspect their permissions.", "अनुमतियों की जांच के लिए ऊपर से किसी सदस्य को चुनें।")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">{localize("Health Category", "स्वास्थ्य श्रेणी")}</th>
                    <th className="py-3 px-4 text-center">{localize("Can View", "अवलोकन (View)")}</th>
                    <th className="py-3 px-4 text-center">{localize("Can Edit / Log", "संपादन (Edit / Log)")}</th>
                    <th className="py-3 px-4 text-right">{localize("Effective Status", "प्रभावी स्थिति")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {HEALTH_CATEGORIES.map((cat) => {
                    const memberPerms = (selectedMember.permissions as any)?.[cat.key] || [];
                    const canView = memberPerms.includes("view") || memberPerms.includes("admin") || selectedMember.role === "Owner";
                    const canEdit = memberPerms.includes("edit") || memberPerms.includes("admin") || selectedMember.role === "Owner";

                    const isEditable = isOwner && selectedMember.role !== "Owner" && selectedMember.role !== "Read-only clinician";

                    return (
                      <tr key={cat.key} className="hover:bg-slate-950/40 transition">
                        <td className="py-3.5 px-4 font-semibold text-white flex items-center gap-2">
                          <span className="text-base">{cat.icon}</span>
                          <span>{localize(cat.en, cat.hi)}</span>
                        </td>

                        {/* View Toggle */}
                        <td className="py-3.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={canView}
                            disabled={!isEditable || isSavingPermissions}
                            onChange={() => handleTogglePermission(cat.key, "view")}
                            className="h-4 w-4 rounded border-slate-700 accent-cyan-500 cursor-pointer disabled:cursor-not-allowed"
                          />
                        </td>

                        {/* Edit Toggle */}
                        <td className="py-3.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={canEdit}
                            disabled={!isEditable || isSavingPermissions}
                            onChange={() => handleTogglePermission(cat.key, "edit")}
                            className="h-4 w-4 rounded border-slate-700 accent-emerald-500 cursor-pointer disabled:cursor-not-allowed"
                          />
                        </td>

                        {/* Status Chip */}
                        <td className="py-3.5 px-4 text-right">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              canEdit
                                ? "bg-emerald-500/20 text-emerald-300"
                                : canView
                                ? "bg-cyan-500/20 text-cyan-300"
                                : "bg-slate-800 text-slate-500"
                            }`}
                          >
                            {canEdit
                              ? localize("Read & Write", "पढ़ना व लिखना")
                              : canView
                              ? localize("View Only", "केवल अवलोकन")
                              : localize("Restricted", "प्रतिबंधित")}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* SECTION 4: SECURITY & ACTIVITY AUDIT LOG */}
        <section className="rounded-3xl border border-[color:var(--border)] bg-slate-900/60 p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">📜</span>
              <h2 className="text-lg font-bold text-white">
                {localize("Security & Access Activity Audit Log", "सुरक्षा व गतिविधि ऑडिट लॉग")}
              </h2>
            </div>
            <span className="text-xs font-mono text-cyan-400">
              {auditLogs.length} {localize("recent events", "हालिया गतिविधियां")}
            </span>
          </div>

          {auditLogs.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              {localize("No audit events recorded yet. Accesses and updates will appear here automatically.", "अभी तक कोई ऑडिट गतिविधि दर्ज नहीं है।")}
            </div>
          ) : (
            <div className="divide-y divide-white/5 max-h-72 overflow-y-auto pr-2">
              {auditLogs.map((log) => {
                const dateStr = new Date(log.timestamp).toLocaleString();

                return (
                  <div key={log.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.2 text-[10px] font-mono font-bold uppercase ${
                            log.action === "delete"
                              ? "bg-rose-500/20 text-rose-300"
                              : log.action === "create" || log.action === "update"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-cyan-500/20 text-cyan-300"
                          }`}
                        >
                          {log.action}
                        </span>
                        <span className="font-semibold text-white">{log.actorName || log.actorEmail || "User"}</span>
                        <span className="text-[var(--muted)] text-[11px]">• category: {log.category}</span>
                      </div>
                      <p className="text-slate-300 text-[11px] pl-1">{log.detail}</p>
                    </div>

                    <span className="text-[10px] font-mono text-[var(--muted)] whitespace-nowrap">
                      {dateStr}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* CREATE GROUP MODAL */}
      <AnimatePresence>
        {showCreateGroupModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-white">
                  {localize("Create Family Health Circle", "परिवार स्वास्थ्य सर्कल बनाएं")}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  className="rounded-full bg-slate-800 p-1.5 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {localize("Circle Name", "सर्कल का नाम")}
                  </label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder={localize("e.g. Sharma Family Health Circle", "उदा. शर्मा परिवार सर्कल")}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateGroupModal(false)}
                    className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    {localize("Cancel", "रद्द करें")}
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-cyan-500 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400"
                  >
                    {localize("Create Circle", "सर्कल बनाएं")}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* INVITE MEMBER MODAL */}
      <AnimatePresence>
        {showInviteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-white">
                  {localize("Invite Adult Member or Caregiver", "वयस्क परिजन या केयरगिवर जोड़ें")}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="rounded-full bg-slate-800 p-1.5 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleInviteMember} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {localize("Email Address", "ईमेल पता")}
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="family@example.com"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {localize("Assigned Role", "निर्धारित भूमिका")}
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as FamilyRole)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs font-semibold text-white focus:border-cyan-400 focus:outline-none"
                  >
                    {(Object.keys(ROLES_INFO) as FamilyRole[])
                      .filter((r) => r !== "Owner")
                      .map((r) => (
                        <option key={r} value={r}>
                          {localize(ROLES_INFO[r].en, ROLES_INFO[r].hi)}
                        </option>
                      ))}
                  </select>
                  <p className="mt-1.5 text-[11px] text-[var(--muted)]">
                    {localize(ROLES_INFO[inviteRole].descEn, ROLES_INFO[inviteRole].descHi)}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    {localize("Cancel", "रद्द करें")}
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-emerald-400 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-300"
                  >
                    {localize("Generate Invitation", "आमंत्रण बनाएं")}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FamilyHealthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--background)] p-10 text-[var(--foreground)]">
          Loading Family Health Sharing...
        </div>
      }
    >
      <FamilyHealthContent />
    </Suspense>
  );
}
