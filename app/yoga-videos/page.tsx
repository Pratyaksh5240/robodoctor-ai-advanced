"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage, useLocalize } from "@/app/context/LanguageContext";

type VideoItem = {
  id: string;
  category: string;
  tags: string[];
  titleEn: string;
  titleHi: string;
  descriptionEn: string;
  descriptionHi: string;
  embed: string;
};

const yogaVideos: VideoItem[] = [
  {
    id: "stress",
    category: "stress",
    tags: ["stress", "anxiety", "relax", "calm", "mind", "mental"],
    titleEn: "Yoga for Anxiety and Stress",
    titleHi: "तनाव और चिंता कम करने वाला योग",
    descriptionEn:
      "Gentle yoga and breathing to relax the body and calm the mind.",
    descriptionHi: "शरीर को रिलैक्स और मन को शांत करने के लिए हल्का योग और ब्रीदिंग।",
    embed: "https://www.youtube.com/embed/hJbRpHZr_d0",
  },
  {
    id: "neck",
    category: "backpain",
    tags: ["neck", "shoulder", "upper back", "stiffness", "desk", "pain"],
    titleEn: "Stretches for Neck, Shoulder & Upper Back",
    titleHi: "गर्दन और कंधे के दर्द के लिए स्ट्रेचिंग",
    descriptionEn:
      "Release desk fatigue, upper back tightness, and neck stiffness.",
    descriptionHi: "ऑफिस के काम की थकान, कंधे की जकड़न और गर्दन के दर्द से राहत पाएं।",
    embed: "https://www.youtube.com/embed/s-7lyvblFNI",
  },
  {
    id: "weightloss",
    category: "weightloss",
    tags: ["weight", "loss", "weightloss", "weight loss", "fat", "burn", "cardio", "power yoga", "exercise", "workout", "slim"],
    titleEn: "20 Min Weight Loss Yoga Flow",
    titleHi: "वजन घटाने के लिए 20 मिनट योग फ्लो",
    descriptionEn:
      "Dynamic flow session that boosts heart rate, builds core strength, and burns calories.",
    descriptionHi: "कैलोरी बर्न करने और कोर स्ट्रेंथ बढ़ाने के लिए डायनामिक पावर योग सत्र।",
    embed: "https://www.youtube.com/embed/c8hjhRqIwHE",
  },
  {
    id: "backpain",
    category: "backpain",
    tags: ["back", "backpain", "spine", "lumbar", "posture", "pain", "lower back"],
    titleEn: "Yoga for Lower Back Pain",
    titleHi: "पीठ और कमर दर्द के लिए योग",
    descriptionEn:
      "Targeted poses to relieve spinal tension, stiffness, and lower back aches.",
    descriptionHi: "रीढ़ की हड्डी के तनाव और कमर दर्द को दूर करने के लिए विशेष योग।",
    embed: "https://www.youtube.com/embed/XeXz8fIZDCE",
  },
  {
    id: "pushup",
    category: "fitness",
    tags: ["pushup", "pushups", "push-up", "push up", "chest", "arms", "triceps", "upper body", "strength", "exercise", "workout"],
    titleEn: "Perfect Push-Ups & Upper Body Strength",
    titleHi: "पुश-अप्स और अपर बॉडी स्ट्रेंथ वर्कआउट",
    descriptionEn:
      "Learn proper push-up technique, progression form, and upper body chest strength.",
    descriptionHi: "सही पुश-अप तकनीक, फॉर्म और सीने व हाथों की ताकत बढ़ाने का वर्कआउट।",
    embed: "https://www.youtube.com/embed/IODxDxX7oi4",
  },
  {
    id: "abs",
    category: "fitness",
    tags: ["abs", "core", "stomach", "belly fat", "plank", "exercise", "workout"],
    titleEn: "10 Min Abs & Core Strength Workout",
    titleHi: "10 मिनट एब्स और कोर वर्कआउट",
    descriptionEn:
      "At-home abdominal and core exercises to burn belly fat and strengthen your core.",
    descriptionHi: "घर पर कोर मजबूत करने और पेट की चर्बी घटाने के लिए 10 मिनट वर्कआउट।",
    embed: "https://www.youtube.com/embed/1919eTCoESo",
  },
  {
    id: "fatburn",
    category: "weightloss",
    tags: ["fat", "burn", "fatburn", "weight", "loss", "cardio", "hiit", "squat", "fitness", "workout"],
    titleEn: "30 Min Fat Burning Full Body Workout",
    titleHi: "30 मिनट फुल बॉडी फैट बर्निंग वर्कआउट",
    descriptionEn:
      "Achievable, low-impact exercise session to burn fat and boost stamina.",
    descriptionHi: "फैट बर्न करने और स्टैमिना बढ़ाने के लिए फुल बॉडी वर्कआउट।",
    embed: "https://www.youtube.com/embed/gC_L9qAHVJ8",
  },
  {
    id: "stretch",
    category: "stretching",
    tags: ["stretch", "flexibility", "morning", "mobility", "warmup", "full body"],
    titleEn: "15 Min Daily Full Body Stretch & Mobility",
    titleHi: "15 मिनट फुल बॉडी स्ट्रेचिंग और मोबिलिटी",
    descriptionEn:
      "A beginner-friendly daily stretching routine for flexibility and stiffness relief.",
    descriptionHi: "फ्लेक्सिबिलिटी बढ़ाने और शरीर की जकड़न दूर करने के लिए दैनिक स्ट्रेचिंग।",
    embed: "https://www.youtube.com/embed/g_tea8ZNk5A",
  },
  {
    id: "sleep",
    category: "sleep",
    tags: ["sleep", "bedtime", "night", "insomnia", "relaxation", "wind down"],
    titleEn: "12-Minute Bedtime Wind Down Yoga",
    titleHi: "अच्छी नींद के लिए 12 मिनट बेडटाइम योग",
    descriptionEn:
      "Calm evening yoga to unwind and prepare the body for sleep.",
    descriptionHi: "शरीर को सुलाने से पहले रिलैक्स करने के लिए शाम का शांत योग।",
    embed: "https://www.youtube.com/embed/BiWDsfZ3zbo",
  },
  {
    id: "meditation",
    category: "meditation",
    tags: ["meditation", "breathing", "mindfulness", "peace", "focus", "calm"],
    titleEn: "5-Minute Meditation You Can Do Anywhere",
    titleHi: "5 मिनट मेडिटेशन और डीप ब्रीदिंग",
    descriptionEn:
      "Quick guided meditation for stress relief, focus, and emotional balance.",
    descriptionHi: "तनाव, ध्यान और मानसिक संतुलन के लिए 5 मिनट गाइडेड मेडिटेशन।",
    embed: "https://www.youtube.com/embed/inpok4MKVLM",
  },
  {
    id: "beginners",
    category: "stretching",
    tags: ["beginner", "beginners", "easy", "starter", "home yoga", "basics"],
    titleEn: "20 Minute Home Yoga for Complete Beginners",
    titleHi: "शुरुआती लोगों के लिए 20 मिनट होम योग",
    descriptionEn:
      "Foundational yoga session for beginners to learn basic poses safely.",
    descriptionHi: "शुरुआती लोगों के लिए बुनियादी आसन सुरक्षित रूप से सीखने का योग।",
    embed: "https://www.youtube.com/embed/v7AYKMP6rOE",
  },
  {
    id: "backrelief",
    category: "backpain",
    tags: ["back", "hips", "lower back", "sciatica", "lumbar", "recovery"],
    titleEn: "Stretches for Lower Back Pain & Tight Hips",
    titleHi: "कमर दर्द और हिप्स के लिए स्ट्रेचिंग",
    descriptionEn:
      "Targeted recovery stretches to loosen tight hips and soothe lower back aches.",
    descriptionHi: "कमर के निचले हिस्से और हिप्स की जकड़न को दूर करने वाली रिकवरी स्ट्रेचिंग।",
    embed: "https://www.youtube.com/embed/HzXkMnvqojE",
  },
];

const categoryPills = [
  { id: "all", labelEn: "All Videos", labelHi: "सभी वीडियो" },
  { id: "fitness", labelEn: "Push-ups & Fitness", labelHi: "पुश-अप्स व फिटनेस" },
  { id: "backpain", labelEn: "Back & Neck Pain", labelHi: "पीठ व गर्दन" },
  { id: "weightloss", labelEn: "Weight Loss & Cardio", labelHi: "वजन घटाना" },
  { id: "stress", labelEn: "Stress Relief", labelHi: "तनाव राहत" },
  { id: "stretching", labelEn: "Stretching", labelHi: "स्ट्रेचिंग" },
  { id: "meditation", labelEn: "Meditation", labelHi: "मेडिटेशन" },
  { id: "sleep", labelEn: "Bedtime Sleep", labelHi: "अच्छी नींद" },
];

export default function YogaVideosPage() {
  const localize = useLocalize();

  const [inputQuery, setInputQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setActiveQuery(inputQuery.trim());
  };

  const clearSearch = () => {
    setInputQuery("");
    setActiveQuery("");
    setSelectedCategory("all");
  };

  const filteredVideos = useMemo(() => {
    const q = activeQuery.toLowerCase();

    return yogaVideos.filter((video) => {
      // Category filter
      const matchesCategory =
        selectedCategory === "all" || video.category === selectedCategory;

      if (!matchesCategory) return false;

      // Text query filter
      if (!q) return true;

      const titleEnMatch = video.titleEn.toLowerCase().includes(q);
      const titleHiMatch = video.titleHi.toLowerCase().includes(q);
      const descEnMatch = video.descriptionEn.toLowerCase().includes(q);
      const descHiMatch = video.descriptionHi.toLowerCase().includes(q);
      const tagMatch = video.tags.some((tag) => tag.toLowerCase().includes(q));

      return titleEnMatch || titleHiMatch || descEnMatch || descHiMatch || tagMatch;
    });
  }, [activeQuery, selectedCategory]);

  return (
    <div className="min-h-screen bg-[var(--background)] px-6 py-10 text-[var(--foreground)] md:px-12">
      <div className="mx-auto max-w-7xl">
        {/* Header Bar */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-2 text-sm uppercase tracking-[0.25em] text-fuchsia-400">
              {localize("Yoga & Exercise Videos", "योग और एक्सरसाइज वीडियो")}
            </p>
            <h1 className="text-4xl font-black md:text-5xl">
              {localize(
                "Yoga, Stretching & Fitness Videos",
                "योग, स्ट्रेचिंग और फिटनेस वीडियो"
              )}
            </h1>
            <p className="mt-3 max-w-3xl text-[var(--muted)]">
              {localize(
                "Search push-ups, back pain relief, weight loss, stretching, meditation, and fitness workouts.",
                "पुश-अप्स, पीठ दर्द राहत, वजन घटाना, स्ट्रेचिंग, मेडिटेशन और फिटनेस वर्कआउट खोजें।"
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              href="/"
              className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-3 text-sm font-semibold hover:opacity-90 transition"
            >
              {localize("Back Home", "होम पर वापस जाएं")}
            </Link>
          </div>
        </div>

        {/* Search Bar & Button Section */}
        <div className="mb-8 rounded-[32px] border border-white/10 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-md">
          <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-4 flex items-center text-slate-400">
                🔍
              </span>
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder={localize(
                  "Search pushups, back pain, weight loss, abs, stretching...",
                  "पुश-अप्स, पीठ दर्द, वजन घटाना, एब्स, स्ट्रेचिंग खोजें..."
                )}
                className="w-full rounded-full border border-white/15 bg-slate-950/80 py-4 pl-12 pr-10 text-white placeholder-slate-400 focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/20 text-base"
              />
              {inputQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setInputQuery("");
                    setActiveQuery("");
                  }}
                  className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="submit"
              className="rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-500 px-8 py-4 font-bold text-white shadow-lg hover:from-fuchsia-400 hover:to-cyan-400 transition"
            >
              {localize("Search", "खोजें")}
            </button>
          </form>

          {/* Category Filter Pills */}
          <div className="mt-5 flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
            {categoryPills.map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={() => setSelectedCategory(pill.id)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  selectedCategory === pill.id
                    ? "bg-fuchsia-500 text-white shadow-md"
                    : "border border-white/10 bg-slate-800/80 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {localize(pill.labelEn, pill.labelHi)}
              </button>
            ))}

            {(activeQuery || selectedCategory !== "all") && (
              <button
                type="button"
                onClick={clearSearch}
                className="ml-auto rounded-full border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20"
              >
                {localize("Clear Search", "खोज रिसेट करें")}
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Notice */}
        {activeQuery && (
          <div className="mb-6 flex items-center justify-between rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-5 py-3 text-cyan-200">
            <span>
              {localize("Showing results for", "के लिए परिणाम दिखाए जा रहे हैं")}:{" "}
              <strong className="text-white">"{activeQuery}"</strong> ({filteredVideos.length}{" "}
              {localize("videos found", "वीडियो मिले")})
            </span>
            <button
              onClick={clearSearch}
              className="text-xs underline hover:text-white"
            >
              {localize("Clear", "हटाएं")}
            </button>
          </div>
        )}

        {/* Video Grid */}
        {filteredVideos.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {filteredVideos.map((video) => (
              <section
                key={video.id}
                className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-900/90 shadow-2xl transition hover:border-fuchsia-400/40"
              >
                <div className="aspect-video w-full bg-black">
                  <iframe
                    src={video.embed}
                    title={localize(video.titleEn, video.titleHi)}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <div className="p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-fuchsia-400">
                    {localize("Wellness Module", "वेलनेस मॉड्यूल")}
                  </p>
                  <h2 className="mt-3 text-2xl font-bold text-white">
                    {localize(video.titleEn, video.titleHi)}
                  </h2>
                  <p className="mt-3 text-slate-300 text-sm leading-relaxed">
                    {localize(video.descriptionEn, video.descriptionHi)}
                  </p>
                </div>
              </section>
            ))}
          </div>
        ) : (
          /* Empty Search / Direct YouTube Search Button */
          <div className="rounded-[32px] border border-fuchsia-400/30 bg-slate-900/90 p-8 text-center shadow-2xl backdrop-blur-md">
            <div className="mx-auto max-w-md">
              <p className="text-4xl mb-3">🧘‍♂️</p>
              <h2 className="text-2xl font-bold text-white mb-2">
                {localize("No local video matches found", "कोई वीडियो मैच नहीं मिला")}
              </h2>
              <p className="text-sm text-slate-300 mb-6">
                {localize(
                  "Try searching for keywords like pushup, back pain, abs, stretching, or weight loss.",
                  "पुश-अप्स, पीठ दर्द, एब्स, स्ट्रेचिंग या वजन घटाने जैसे शब्दों से खोजें।"
                )}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={clearSearch}
                  className="w-full sm:w-auto rounded-full bg-fuchsia-500 px-6 py-3 font-semibold text-white hover:bg-fuchsia-400 transition"
                >
                  {localize("Show All Videos", "सभी वीडियो दिखाएं")}
                </button>
                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
                    "exercise workout " + activeQuery
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto rounded-full border border-white/20 bg-slate-800 px-6 py-3 font-semibold text-white hover:bg-slate-700 transition"
                >
                  {localize("Search on YouTube ↗", "यूट्यूब पर खोजें ↗")}
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
