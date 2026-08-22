"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/app/context/LanguageContext";
import { translateUi } from "@/lib/uiI18n";

type Contact = {
  id: number;
  name: string;
  role: string;
  phone: string;
};

export default function EmergencyContactsPage() {
  const { language } = useLanguage();
  const isHindi = language === "hi";
  const localize = (english: string, hindi: string) =>
    isHindi ? hindi : translateUi(english, language);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
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
          <section className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
            <h2 className="text-2xl font-bold">
              {localize("Add new contact", "नया संपर्क जोड़ें")}
            </h2>
            <div className="mt-5 grid gap-4">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={localize("Name", "नाम")}
                className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-3"
              />
              <input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder={localize("Role or relation", "रिश्ता या भूमिका")}
                className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-3"
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={localize("Phone number", "फोन नंबर")}
                className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-3"
              />
              <button
                type="button"
                onClick={() => {
                  if (!name.trim() || !phone.trim()) {
                    return;
                  }
                  setContacts((current) => [
                    {
                      id: Date.now(),
                      name: name.trim(),
                      role: role.trim(),
                      phone: phone.trim(),
                    },
                    ...current,
                  ]);
                  setName("");
                  setRole("");
                  setPhone("");
                }}
                className="rounded-full bg-rose-400 px-6 py-3 font-semibold text-slate-950"
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
