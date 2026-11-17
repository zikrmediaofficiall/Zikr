(() => {
  const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
  const ALADHAN_DATE_PATTERN = /^\d{2}-\d{2}-\d{4}$/;

  self.isFreshPrayerTimesCacheEntry = async function (response, requestUrl, now = new Date()) {
    try {
      const url = new URL(requestUrl, self.location.origin);
      const payload = await response.clone().json();
      const responseDate = payload?.data?.date?.gregorian?.date;

      if (typeof responseDate !== "string" || !ALADHAN_DATE_PATTERN.test(responseDate)) {
        return false;
      }

      const requestedDate = url.searchParams.get("date");
      if (requestedDate) {
        const match = ISO_DATE_PATTERN.exec(requestedDate);
        if (!match) return false;
        const expectedDate = match[3] + "-" + match[2] + "-" + match[1];
        return responseDate === expectedDate;
      }

      const timeZone = payload?.data?.meta?.timezone;
      if (typeof timeZone !== "string" || !timeZone.trim()) return false;

      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).formatToParts(now);
      const dateParts = Object.create(null);
      for (const part of parts) {
        if (part.type === "day" || part.type === "month" || part.type === "year") {
          dateParts[part.type] = part.value;
        }
      }

      if (!dateParts.day || !dateParts.month || !dateParts.year) return false;
      const expectedDate = dateParts.day + "-" + dateParts.month + "-" + dateParts.year;
      return responseDate === expectedDate;
    } catch {
      // Missing/malformed provider metadata or an invalid IANA timezone must
      // fail closed rather than returning yesterday's prayer times offline.
      return false;
    }
  };
})();
