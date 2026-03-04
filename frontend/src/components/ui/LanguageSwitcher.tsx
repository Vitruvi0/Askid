"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { locales, type Locale } from "@/i18n/config";

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();

  const switchLocale = (newLocale: Locale) => {
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`;
    router.refresh();
  };

  return (
    <div className="flex items-center gap-1">
      {locales.map((l) => (
        <button
          key={l}
          onClick={() => switchLocale(l)}
          className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
            locale === l
              ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400"
              : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          }`}
          aria-label={l === "it" ? "Italiano" : "English"}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
