export function reminderCalendar(reminder: { id: string; dueAt: Date }, now: Date) {
  const stamp = (date: Date) => date.toISOString().replace(/[-:]|\.\d{3}/g, "");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Care4ll//Reminders//EN", "BEGIN:VEVENT",
    "UID:" + reminder.id + "@care4ll.local", "DTSTAMP:" + stamp(now),
    "DTSTART:" + stamp(reminder.dueAt), "SUMMARY:A note from Care4ll",
    "END:VEVENT", "END:VCALENDAR", "",
  ].join("\r\n");
}
