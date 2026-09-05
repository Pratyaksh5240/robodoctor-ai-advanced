"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useActiveProfile } from "@/app/context/ActiveProfileContext";
import { useLocalize } from "@/lib/useLocalize";

export default function ProfileSwitcher() {
  const {
    activeProfileId,
    activeProfile,
    dependents,
    setActiveProfileId,
    addDependent,
    deleteDependent,
  } = useActiveProfile();
  const localize = useLocalize();

  const [isOpen, setIsOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("Child");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Male");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeLabel = activeProfile
    ? `${activeProfile.name} (${activeProfile.relationship})`
    : localize("Myself", "स्वयं (मैं)");

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg(localize("Please enter member name.", "कृपया सदस्य का नाम दर्ज करें।"));
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    try {
      const newId = await addDependent({
        name: name.trim(),
        relationship,
        age: age ? Number(age) : undefined,
        gender,
      });
      setActiveProfileId(newId);
      setName("");
      setAge("");
      setShowAddModal(false);
      setIsOpen(false);
    } catch (err: any) {
      console.error("Failed to add family member:", err);
      setErrorMsg(
        err?.message ||
          localize(
            "Failed to add family member. Please try again.",
            "सदस्य नहीं जुड़ पाया। कृपया फिर कोशिश करें।"
          )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectProfile = (id: string | null) => {
    setActiveProfileId(id);
    setIsOpen(false);
  };

  const modalJSX = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-3xl border border-[color:var(--border)] bg-slate-900 text-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h3 className="text-xl font-bold text-white">
            {localize("Add Family Member", "परिवार का नया सदस्य जोड़ें")}
          </h3>
          <button
            type="button"
            onClick={() => setShowAddModal(false)}
            className="text-lg text-slate-400 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleAddMember} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">
              {localize("Full Name", "पूरा नाम")}
            </label>
            <input
              type="text"
              required
              placeholder={localize("e.g. Aarav Sharma", "उदा. आरव शर्मा")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-lime-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">
              {localize("Relationship", "संबंध")}
            </label>
            <select
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-lime-500"
            >
              <option value="Child">{localize("Child (Son / Daughter)", "बच्चा (बेटा / बेटी)")}</option>
              <option value="Parent">{localize("Parent (Father / Mother)", "माता-पिता")}</option>
              <option value="Spouse">{localize("Spouse (Husband / Wife)", "पति / पत्नी")}</option>
              <option value="Grandparent">{localize("Grandparent", "दादा-दादी / नाना-नानी")}</option>
              <option value="Sibling">{localize("Sibling", "भाई / बहन")}</option>
              <option value="Other">{localize("Other", "अन्य")}</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                {localize("Age", "उम्र")}
              </label>
              <input
                type="number"
                min="0"
                max="120"
                placeholder="e.g. 8"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-lime-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                {localize("Gender", "लिंग")}
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-lime-500"
              >
                <option value="Male">{localize("Male", "पुरुष")}</option>
                <option value="Female">{localize("Female", "महिला")}</option>
                <option value="Other">{localize("Other", "अन्य")}</option>
              </select>
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs font-semibold text-rose-400 mt-1">{errorMsg}</p>
          )}

          <div className="mt-6 flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 cursor-pointer"
            >
              {localize("Cancel", "रद्द करें")}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-lime-500 px-5 py-2.5 text-sm font-bold text-black hover:bg-lime-400 disabled:opacity-50 cursor-pointer"
            >
              {submitting
                ? localize("Saving...", "सेव हो रहा है...")
                : localize("Save Member", "सदस्य सेव करें")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="relative inline-block text-left z-30">
      {/* Active Profile Dropdown Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 text-sm font-medium hover:bg-[color:var(--surface-strong)] transition shadow-sm cursor-pointer"
      >
        <span className="text-base">👤</span>
        <span className="max-w-[150px] truncate font-bold text-lime-400">
          {activeLabel}
        </span>
        <span className="text-xs text-[var(--muted)]">▼</span>
      </button>

      {/* Backdrop overlay for closing dropdown on outside click */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/10"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-2 shadow-2xl backdrop-blur-xl">
          <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
            {localize("Select Profile", "प्रोफ़ाइल चुनें")}
          </div>

          {/* Myself Option */}
          <button
            type="button"
            onClick={() => handleSelectProfile(null)}
            className={`flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-left text-sm font-medium transition cursor-pointer ${
              activeProfileId === null
                ? "bg-lime-500/20 text-lime-300 font-bold border border-lime-500/30"
                : "hover:bg-[color:var(--surface)] text-[var(--foreground)]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-lg">👤</span>
              <span>{localize("Myself (Account Owner)", "स्वयं (खाताधारक)")}</span>
            </div>
            {activeProfileId === null && <span className="text-lime-400 font-bold">✓</span>}
          </button>

          {/* Dependents List */}
          {dependents.map((dep) => {
            const isSelected = activeProfileId === dep.id;
            return (
              <div
                key={dep.id}
                className={`mt-1 flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm transition ${
                  isSelected
                    ? "bg-lime-500/20 text-lime-300 font-bold border border-lime-500/30"
                    : "hover:bg-[color:var(--surface)] text-[var(--foreground)]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleSelectProfile(dep.id)}
                  className="flex flex-1 items-center gap-2.5 text-left py-0.5 cursor-pointer"
                >
                  <span className="text-lg">👶</span>
                  <span className="truncate">
                    {dep.name} <span className="text-xs opacity-75">({dep.relationship})</span>
                  </span>
                </button>

                <div className="flex items-center gap-2">
                  {isSelected && <span className="text-lime-400 font-bold">✓</span>}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (
                        confirm(
                          localize(
                            `Remove ${dep.name}?`,
                            `क्या आप ${dep.name} को हटाना चाहते हैं?`
                          )
                        )
                      ) {
                        deleteDependent(dep.id);
                      }
                    }}
                    className="rounded-md p-1 text-xs text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition cursor-pointer"
                    title={localize("Delete Profile", "प्रोफ़ाइल हटाएं")}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}

          <hr className="my-2 border-[color:var(--border)]" />

          {/* Add Family Member Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setErrorMsg("");
              setShowAddModal(true);
              setIsOpen(false);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-lime-500/10 px-3 py-2.5 text-sm font-bold text-lime-400 hover:bg-lime-500/20 transition cursor-pointer"
          >
            <span>➕</span>
            <span>{localize("Add Family Member", "परिवार का सदस्य जोड़ें")}</span>
          </button>
        </div>
      )}

      {/* Render Modal into document.body via Portal to prevent header clipping/stacking issues */}
      {showAddModal && mounted && createPortal(modalJSX, document.body)}
    </div>
  );
}
