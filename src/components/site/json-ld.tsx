import type { SettingsDTO } from "@/lib/data/public";
import { pickLocale } from "@/lib/utils/format";

export function HotelJsonLd({ settings, locale }: { settings: SettingsDTO; locale: string }) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const data = {
    "@context": "https://schema.org",
    "@type": "Hotel",
    name: pickLocale(settings, "name", locale),
    description: pickLocale(settings, "tagline", locale),
    url: siteUrl,
    telephone: settings.phone,
    email: settings.email,
    checkinTime: settings.checkInTime,
    checkoutTime: settings.checkOutTime,
    petsAllowed: false,
    address: {
      "@type": "PostalAddress",
      streetAddress: pickLocale(settings, "address", locale),
      addressLocality: settings.city,
      addressCountry: "JO",
      postOfficeBoxNumber: settings.postalBox ?? undefined,
    },
    geo: { "@type": "GeoCoordinates", latitude: settings.latitude, longitude: settings.longitude },
    amenityFeature: [
      { "@type": "LocationFeatureSpecification", name: "Rooftop swimming pool", value: true },
      { "@type": "LocationFeatureSpecification", name: "Turkish bath", value: true },
      { "@type": "LocationFeatureSpecification", name: "Sauna", value: true },
      { "@type": "LocationFeatureSpecification", name: "Restaurant", value: true },
      { "@type": "LocationFeatureSpecification", name: "Free Wi-Fi", value: true },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
