type OpenStreetMapAttributionProps = {
  locale?: "ar" | "en";
  className?: string;
};

export function OpenStreetMapAttribution({
  locale = "ar",
  className,
}: OpenStreetMapAttributionProps) {
  return (
    <p className={className}>
      {locale === "en"
        ? "Reverse-geocoding data when using device location: "
        : "مصدر أسماء المواقع عند استخدام تحديد الموقع: "}
      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2"
      >
        © OpenStreetMap contributors
      </a>
    </p>
  );
}
