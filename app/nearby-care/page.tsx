"use client";

import Link from "next/link";
import { useState } from "react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/app/context/LanguageContext";
import { translateUi } from "@/lib/uiI18n";

type Coordinates = {
  latitude: number;
  longitude: number;
};

const getLocationErrorMessage = (
  error: GeolocationPositionError,
  fallbackMessage: string
) => {
  if (error.code === error.PERMISSION_DENIED) {
    return "Location permission is blocked. Allow location for this site from the browser address bar, refresh the page, then click Use My Location again.";
  }

  if (error.code === error.POSITION_UNAVAILABLE) {
    return "Your device could not detect location right now. Turn on Windows Location Services or GPS, then try Use My Location again.";
  }

  if (error.code === error.TIMEOUT) {
    return "Location request timed out. Check GPS or browser location permission, then try Use My Location again.";
  }

  return fallbackMessage;
};

export default function NearbyCarePage() {
  const { language } = useLanguage();
  const isHindi = language === "hi";
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [status, setStatus] = useState("");

  const copy = {
    tag: isHindi ? "नजदीकी देखभाल" : translateUi("Nearby Care", language),
    title: isHindi
      ? "लोकेशन से नजदीकी अस्पताल खोजें"
      : translateUi("Find nearby hospitals from your location", language),
    subtitle: isHindi
      ? "लोकेशन अनुमति दें और तुरंत नजदीकी अस्पताल, क्लिनिक, फार्मेसी, और इमरजेंसी केयर खोजें।"
      : translateUi(
          "Allow location access to quickly find nearby hospitals, clinics, pharmacies, and emergency care.",
          language
        ),
    useLocation: isHindi
      ? "मेरी लोकेशन इस्तेमाल करें"
      : translateUi("Use My Location", language),
    locationReady: isHindi
      ? "लोकेशन मिल गई"
      : translateUi("Location ready", language),
    backHome: isHindi
      ? "होम पर वापस जाएं"
      : translateUi("Back Home", language),
    nearbyHospitals: isHindi
      ? "नजदीकी अस्पताल"
      : translateUi("Nearby Hospitals", language),
    nearbyClinics: isHindi
      ? "नजदीकी क्लिनिक"
      : translateUi("Nearby Clinics", language),
    nearbyPharmacy: isHindi
      ? "नजदीकी फार्मेसी"
      : translateUi("Nearby Pharmacy", language),
    emergencyRoom: isHindi
      ? "इमरजेंसी रूम"
      : translateUi("Emergency Room", language),
    mapsNote: isHindi
      ? "यह फीचर आपके ब्राउज़र की लोकेशन का उपयोग करके मैप्स में खोज खोलता है।"
      : translateUi(
          "This feature uses your browser location to open nearby searches in maps.",
          language
        ),
    allowPrompt: isHindi
      ? "कृपया ब्राउज़र में लोकेशन अनुमति दें।"
      : translateUi("Please allow location access in your browser.", language),
    noSupport: isHindi
      ? "इस ब्राउज़र में लोकेशन सपोर्ट उपलब्ध नहीं है।"
      : translateUi("Location is not supported in this browser.", language),
    failed: isHindi
      ? "लोकेशन नहीं मिल पाई। कृपया GPS या ब्राउज़र अनुमति जांचें।"
      : translateUi(
          "Unable to get your location. Please check GPS or browser permissions.",
          language
        ),
    currentCoords: isHindi
      ? "वर्तमान निर्देशांक"
      : translateUi("Current coordinates", language),
    hint: isHindi
      ? "लोकेशन मिलने के बाद नीचे दिए गए बटन से Google Maps में आसपास की सेवाएं खुलेंगी।"
      : translateUi(
          "After location is found, the buttons below will open nearby services in Google Maps.",
          language
        ),
    openMaps: isHindi
      ? "Google Maps में आसपास की सेवा खोलें।"
      : translateUi("Open this nearby service in Google Maps.", language),
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setStatus(copy.noSupport);
      return;
    }

    setStatus(copy.allowPrompt);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setStatus(copy.locationReady);
      },
      (error) => {
        setStatus(getLocationErrorMessage(error, copy.failed));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  };

  const buildMapsLink = (query: string) => {
    if (!coords) {
      return "#";
    }

    return `https://www.google.com/maps/search/${encodeURIComponent(
      query
    )}/@${coords.latitude},${coords.longitude},15z`;
  };

  const cards = [
    {
      title: copy.nearbyHospitals,
      query: "hospital near me",
      color: "border-cyan-400/20 bg-cyan-500/10",
    },
    {
      title: copy.nearbyClinics,
      query: "clinic near me",
      color: "border-emerald-400/20 bg-emerald-500/10",
    },
    {
      title: copy.nearbyPharmacy,
      query: "pharmacy near me",
      color: "border-amber-400/20 bg-amber-500/10",
    },
    {
      title: copy.emergencyRoom,
      query: "emergency room near me",
      color: "border-rose-400/20 bg-rose-500/10",
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] px-6 py-10 text-[var(--foreground)] md:px-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-2 text-sm uppercase tracking-[0.25em] text-cyan-400">
              {copy.tag}
            </p>
            <h1 className="text-4xl font-black md:text-5xl">{copy.title}</h1>
            <p className="mt-3 max-w-3xl text-[var(--muted)]">{copy.subtitle}</p>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              href="/"
              className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-3 text-sm hover:opacity-90"
            >
              {copy.backHome}
            </Link>
          </div>
        </div>

        <section className="rounded-[30px] border border-[color:var(--border)] bg-[color:var(--surface)] p-8 shadow-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-lg font-semibold">{copy.mapsNote}</p>
              <p className="mt-2 text-[var(--muted)]">{copy.hint}</p>
            </div>

            <button
              onClick={requestLocation}
              className="rounded-full bg-cyan-400 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-300"
            >
              {copy.useLocation}
            </button>
          </div>

          {status && <p className="mt-5 text-sm text-cyan-400">{status}</p>}

          {coords && (
            <div className="mt-5 rounded-2xl border border-[color:var(--border)] bg-black/10 p-4 text-sm">
              <strong>{copy.currentCoords}:</strong> {coords.latitude.toFixed(5)},{" "}
              {coords.longitude.toFixed(5)}
            </div>
          )}
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2">
          {cards.map((card) => (
            <a
              key={card.title}
              href={buildMapsLink(card.query)}
              target="_blank"
              rel="noreferrer"
              className={`rounded-[28px] border p-6 transition hover:scale-[1.01] ${card.color} ${
                coords ? "" : "pointer-events-none opacity-60"
              }`}
            >
              <p className="text-2xl font-bold">{card.title}</p>
              <p className="mt-3 text-sm text-[var(--muted)]">{copy.openMaps}</p>
            </a>
          ))}
        </section>
      </div>
    </div>
  );
}
