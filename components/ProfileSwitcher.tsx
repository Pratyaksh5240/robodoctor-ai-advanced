"use client";

import { useState } from "react";
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
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("Child");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Male");
  const [submitting, setSubmitting] = useState(false);

  const activeLabel = activeProfile
    ? `${activeProfile.name} (${activeProfile.relationship})`
    : localize("Myself", "स्वयं (मैं)");

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
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
    } catch (err) {
      console.error("Failed to add family member:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative inline-block text-left">
      {/* Active Profile Dropdown Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 text-sm font-medium hover:bg-[color:var(--surface-strong)] transition"
      >
        <span className="text-base">👤</span>
        <span className="max-w-[140px] truncate">{activeLabel}</span>
        <span className="text-xs text-[var(--muted)]">▼</span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-2 shadow-2xl backdrop-blur-xl"
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            {localize("Select Profile", "प्रोफ़ाइल चुनें")}
          </div>

          {/* Myself Option */}
          <button
            type="button"
            onClick={() => {
              setActiveProfileId(null);
              setIsOpen(false);
            }}
            className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium ${
              activeProfileId === null
                ? "bg-lime-500/20 text-lime-300 font-bold"
                : "hover:bg-[color:var(--surface)]"
            }`}
          >
            <div className="flex items-center gap-2">
              <span>👤</span>
              <span>{localize("Myself (Account Owner)", "स्वयं (खाताधारक)")}</span>
            </div>
            {activeProfileId === null && <span>✓</span>}
          </button>

          {/* Dependents List */}
          {dependents.map((dep) => (
            <div
              key={dep.id}
              className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm ${
                activeProfileId === dep.id
                  ? "bg-lime-500/20 text-lime-300 font-bold"
                  : "hover:bg-[color:var(--surface)]"
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setActiveProfileId(dep.id);
                  setIsOpen(false);
                }}
                className="flex flex-1 items-center gap-2 text-left"
              >
                <span>👶</span>
                <span className="truncate">
                  {dep.name} ({dep.relationship})
                </span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(localize(`Remove ${dep.name}?`, `क्या आप ${dep.name} को हटाना चाहते हैं?`))) {
                    deleteDependent(dep.id);
                  }
                }}
                className="ml-2 hidden text-xs text-rose-400 hover:text-rose-300 group-hover:inline"
                title={localize("Delete Profile", "प्रोफ़ाइल हटाएं")}
              >
                ✕
              </button>
            </div>
          ))}

          <hr className="my-2 border-[color:var(--border)]" />

          {/* Add Family Member Button */}
          <button
            type="button"
            onClick={() => {
              setShowAddModal(true);
              setIsOpen(false);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-lime-500/10 px-3 py-2.5 text-sm font-medium text-lime-400 hover:bg-lime-500/20 transition"
          >
            <span>➕</span>
            <span>{localize("Add Family Member", "परिवार का सदस्य जोड़ें")}</span>
          </button>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[color:var(--border)] pb-4">
              <h3 className="text-xl font-bold">
                {localize("Add Family Member", "परिवार का नया सदस्य जोड़ें")}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-lg text-[var(--muted)] hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMember} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  {localize("Full Name", "पूरा नाम")}
                </label>
                <input
                  type="text"
                  required
                  placeholder={localize("e.g. Aarav Sharma", "उदा. आरव शर्मा")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  {localize("Relationship", "संबंध")}
                </label>
                <select
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3 text-sm"
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
                  <label className="mb-1 block text-sm font-medium">
                    {localize("Age", "उम्र")}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    placeholder="e.g. 8"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    {localize("Gender", "लिंग")}
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3 text-sm"
                  >
                    <option value="Male">{localize("Male", "पुरुष")}</option>
                    <option value="Female">{localize("Female", "महिला")}</option>
                    <option value="Other">{localize("Other", "अन्य")}</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-[color:var(--border)] px-4 py-2.5 text-sm hover:opacity-80"
                >
                  {localize("Cancel", "रद्द करें")}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-lime-500 px-5 py-2.5 text-sm font-bold text-black hover:bg-lime-400 disabled:opacity-50"
                >
                  {submitting
                    ? localize("Saving...", "सेव हो रहा है...")
                    : localize("Save Member", "सदस्य सेव करें")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
