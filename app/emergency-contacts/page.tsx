"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/app/context/LanguageContext";
import { useLocalize } from "@/lib/useLocalize";

type Contact = {
  id: number;
  name: string;
  role: string;
  phone: string;
};

export default function EmergencyContactsPage() {
  const { language } = useLanguage();
  const localize = useLocalize();
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }
    const saved = localStorage.getItem("robodoctor-emergency-contacts");
    return saved ? (JSON.parse(saved) as Contact[]) : [];
  });

  useEffect(() => {
    localStorage.setItem("robodoctor-emergency-contacts", JSON.stringify(contacts));
  }, [contacts]);

  return (
    <div className="min-h-screen bg-[var(--background)] px-6 py-10 text-[var(--foreground)] md:px-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-2 text-sm uppercase tracking-[0.25em] text-rose-400">
              {localize("Emergency Contacts", "इमरजेंसी कॉन्टैक्ट्स")}
            </p>
            <h1 className="text-4xl font-black md:text-5xl">
              {localize("Emergency contact list", "आपातकालीन संपर्क सूची")}
            </h1>
            <p className="mt-3 max-w-3xl text-[var(--muted)]">
              {localize(
                "Keep family, doctor, ambulance, or nearby help numbers saved here for quick access.",
                "परिवार, डॉक्टर, एम्बुलेंस, या नजदीकी मदद के लिए जरूरी नंबर यहां सेव रखें।"
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              href="/"
              className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-3 text-sm hover:opacity-90"
            >
              {localize("Back Home", "होम पर वापस जाएं")}
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-xl">
            <h2 className="text-2xl font-bold">
              {localize("Add new contact", "नया संपर्क जोड़ें")}
            </h2>

            {/* Quick 1-Click National Helplines */}
            <div className="mt-4">
              <p className="text-xs font-semibold text-[var(--muted)] mb-2 uppercase tracking-wider">
                {localize("⚡ Quick Add Helplines", "⚡ त्वरित हेल्पलाइन जोड़ें")}
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: "National Ambulance", role: "Ambulance", phone: "108", label: "🚑 Ambulance (108)" },
                  { name: "All Emergency Services", role: "Emergency / Police", phone: "112", label: "🚨 All Emergency (112)" },
                  { name: "National Health Helpline", role: "Govt Helpline", phone: "1075", label: "🏥 Health Helpline (1075)" },
                ].map((preset) => (
                  <button
                    key={preset.phone}
                    type="button"
                    onClick={() => {
                      if (contacts.some((c) => c.phone === preset.phone)) {
                        setErrorNotice(localize("This helpline is already in your contacts.", "यह हेल्पलाइन पहले से आपके संपर्कों में है।"));
                        setTimeout(() => setErrorNotice(null), 3000);
                        return;
                      }
                      setContacts((current) => [
                        {
                          id: Date.now(),
                          name: preset.name,
                          role: preset.role,
                          phone: preset.phone,
                        },
                        ...current,
                      ]);
                      setSuccessNotice(localize(`Added ${preset.name} (${preset.phone})`, `${preset.name} जोड़ा गया`));
                      setTimeout(() => setSuccessNotice(null), 4000);
                    }}
                    className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {errorNotice && (
              <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
                ⚠️ {errorNotice}
              </div>
            )}

            {successNotice && (
              <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-200">
                ✅ {successNotice}
              </div>
            )}

            <div className="mt-5 grid gap-4">
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errorNotice) setErrorNotice(null);
                }}
                placeholder={localize("Name (e.g. Dr. Rajesh Sharma, Father)", "नाम (जैसे: डॉ. राजेश शर्मा, पिता)")}
                className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-3 text-sm focus:border-rose-400 focus:outline-none"
              />
              <input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder={localize("Role or relation (e.g. Cardiologist, Mother)", "रिश्ता या भूमिका (जैसे: हृदय रोग विशेषज्ञ, माता)")}
                className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-3 text-sm focus:border-rose-400 focus:outline-none"
              />
              <input
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (errorNotice) setErrorNotice(null);
                }}
                placeholder={localize("Phone number", "फोन नंबर")}
                className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-3 text-sm focus:border-rose-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (!name.trim() || !phone.trim()) {
                    setErrorNotice(localize("Please enter both a contact name and phone number.", "कृपया संपर्क का नाम और फोन नंबर दोनों दर्ज करें।"));
                    return;
                  }
                  setContacts((current) => [
                    {
                      id: Date.now(),
                      name: name.trim(),
                      role: role.trim() || localize("Emergency contact", "आपात संपर्क"),
                      phone: phone.trim(),
                    },
                    ...current,
                  ]);
                  setName("");
                  setRole("");
                  setPhone("");
                  setErrorNotice(null);
                  setSuccessNotice(localize("Contact saved successfully!", "संपर्क सफलतापूर्वक सहेजा गया!"));
                  setTimeout(() => setSuccessNotice(null), 4000);
                }}
                className="rounded-full bg-rose-500 px-6 py-3.5 font-bold text-white hover:bg-rose-600 transition cursor-pointer shadow-lg active:scale-95"
              >
                {localize("Save contact", "संपर्क सेव करें")}
              </button>
            </div>
          </section>

          <section className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
            <h2 className="text-2xl font-bold">
              {localize("Saved contacts", "सेव किए गए संपर्क")}
            </h2>
            <div className="mt-5 space-y-4">
              {contacts.length === 0 ? (
                <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-5 text-[var(--muted)]">
                  {localize("No contacts saved yet.", "अभी कोई संपर्क सेव नहीं है।")}
                </div>
              ) : (
                contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold">{contact.name}</h3>
                        <p className="text-sm text-[var(--muted)]">
                          {contact.role || localize("Emergency contact", "आपात संपर्क")}
                        </p>
                        <p className="mt-2">{contact.phone}</p>
                      </div>
                      <div className="flex gap-2">
                        <a
                          href={`tel:${contact.phone}`}
                          className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950"
                        >
                          {localize("Call", "कॉल करें")}
                        </a>
                        <button
                          type="button"
                          onClick={() =>
                            setContacts((current) =>
                              current.filter((item) => item.id !== contact.id)
                            )
                          }
                          className="rounded-full border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-200"
                        >
                          {localize("Delete", "हटाएं")}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
