// StageX AI — Functional Tests for Scripts, Teleprompter, & Invitation Export
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/firebase", () => ({
  db: { type: "mock-firestore" },
  auth: { currentUser: null },
  app: {},
}));

import { useEventStore } from "../store/event-store";
import { THEME_STYLES } from "../components/ai/invitation-export-card";

describe("Part A — Scripts & Teleprompter System", () => {
  beforeEach(() => {
    useEventStore.getState().resetAll();
  });

  it("Preserves complete script content with paragraphs, line breaks, and Gujarati/Hindi Unicode", () => {
    const store = useEventStore.getState();

    const evRes = store.createEvent({
      name: "Ahmedabad Tech & Culture Fest 2026",
      type: "Cultural Event",
      date: "2026-10-15",
      startDate: "2026-10-15",
      endDate: "2026-10-15",
      startTime: "18:00",
      endTime: "22:00",
      venue: "Grand Hall, Ahmedabad",
      description: "Cultural and tech celebration",
      organizer: "Cultural Committee",
    });
    expect(evRes.ok).toBe(true);

    const fullGujaratiScript = `નમસ્કાર અને અમદાવાદ ટેક એન્ડ કલ્ચર ફેસ્ટ ૨૦૨૬ માં આપ સૌનું હાર્દિક સ્વાગત છે!

[Pause for Audience Applause]

આજના આ ભવ્ય મંચ પર અમારી સાથે ઉપસ્થિત છે આદરણીય મુખ્ય અતિથિશ્રી.

[Stage Direction: Invite Chief Guest to podium]

ચાલો આપણે સૌ સાથે મળીને આ કાર્યક્રમની શરૂઆત કરીએ.`;

    const scriptRes = store.addScript({
      eventId: evRes.eventId!,
      title: "Gujarati Opening Address",
      category: "anchor",
      scriptType: "Opening Address",
      content: fullGujaratiScript,
      language: "Gujarati",
    });

    expect(scriptRes.ok).toBe(true);
    expect(scriptRes.scriptId).toBeDefined();

    const saved = useEventStore.getState().scripts.find((s) => s.id === scriptRes.scriptId);
    expect(saved).toBeDefined();
    expect(saved?.content).toBe(fullGujaratiScript);
    expect(saved?.language).toBe("Gujarati");
    expect(saved?.content).toContain("[Pause for Audience Applause]");
    expect(saved?.content).toContain("નમસ્કાર");
  });

  it("Loads exact script by stable script ID without falling back to array index or fake data", () => {
    const store = useEventStore.getState();

    const evRes = store.createEvent({
      name: "Annual Gala",
      type: "Gala Dinner",
      date: "2026-11-20",
      startDate: "2026-11-20",
      endDate: "2026-11-20",
      startTime: "19:00",
      endTime: "23:00",
      venue: "Royal Palace",
      description: "Annual gala",
      organizer: "Gala Org",
    });

    // Add multiple scripts
    const s1 = store.addScript({
      eventId: evRes.eventId!,
      title: "Script 1: Welcome Speech",
      category: "anchor",
      scriptType: "Welcome Speech",
      content: "Welcome ladies and gentlemen to our annual gala dinner.",
      language: "English",
    });

    const s2 = store.addScript({
      eventId: evRes.eventId!,
      title: "Script 2: Hindi Award Presentation",
      category: "award",
      scriptType: "Winner Announcement",
      content: "और अब हम प्रस्तुत करते हैं वर्ष के सर्वश्रेष्ठ पुरस्कार...",
      language: "Hindi",
    });

    const s3 = store.addScript({
      eventId: evRes.eventId!,
      title: "Script 3: Organizer Technical Announcement",
      category: "organizer",
      scriptType: "Technical Issue Announcement",
      content: "Please note the next session starts in 10 minutes.",
      language: "English",
    });

    // Lookup exact script by ID (e.g. Script 2)
    const lookedUp = useEventStore.getState().scripts.find((s) => s.id === s2.scriptId);
    expect(lookedUp).toBeDefined();
    expect(lookedUp?.title).toBe("Script 2: Hindi Award Presentation");
    expect(lookedUp?.language).toBe("Hindi");
    expect(lookedUp?.content).toContain("और अब हम प्रस्तुत करते हैं");

    // Lookup non-existent ID
    const missing = useEventStore.getState().scripts.find((s) => s.id === "non-existent-script-id");
    expect(missing).toBeUndefined();
  });

  it("Preserves edited content when modified by user", () => {
    const store = useEventStore.getState();

    const evRes = store.createEvent({
      name: "Youth Conclave",
      type: "Conference",
      date: "2026-08-10",
      startDate: "2026-08-10",
      endDate: "2026-08-10",
      startTime: "10:00",
      endTime: "16:00",
      venue: "Auditorium",
      description: "Youth summit",
      organizer: "Youth Org",
    });

    const scriptRes = store.addScript({
      eventId: evRes.eventId!,
      title: "Keynote Intro",
      category: "speaker",
      scriptType: "Speaker Introduction",
      content: "Original script content.",
      language: "English",
    });

    const updatedText = "Polished keynote introduction with extra cues.\n\n[Applause]\n\nPlease welcome our guest.";
    store.updateScript(scriptRes.scriptId!, { editedContent: updatedText });

    const updated = useEventStore.getState().scripts.find((s) => s.id === scriptRes.scriptId);
    expect(updated?.editedContent).toBe(updatedText);
    expect(updated?.content).toBe("Original script content.");
  });
});

describe("Part B — Invitation Cards & Export System", () => {
  beforeEach(() => {
    useEventStore.getState().resetAll();
  });

  it("Provides complete theme presets with color schemes and canvas styling", () => {
    const themes = Object.keys(THEME_STYLES);
    expect(themes).toContain("modern_dark");
    expect(themes).toContain("executive_gold");
    expect(themes).toContain("luxury_gala");
    expect(themes).toContain("cultural_warm");
    expect(themes).toContain("tech_conference");

    const luxury = THEME_STYLES.luxury_gala;
    expect(luxury.canvasBg).toBe("#0a0705");
    expect(luxury.canvasBorder).toBe("#f59e0b");
    expect(luxury.canvasTitle).toBe("#fffbeb");
  });

  it("Stores multilingual invitation data cleanly in event store", () => {
    const store = useEventStore.getState();

    const evRes = store.createEvent({
      name: "Diwali Mahotsav 2026",
      type: "Festival",
      date: "2026-11-01",
      startDate: "2026-11-01",
      endDate: "2026-11-01",
      startTime: "18:30",
      endTime: "22:30",
      venue: "Sabarmati Riverfront, Ahmedabad",
      description: "Grand Diwali celebration with cultural performances",
      organizer: "Gujarat Cultural Trust",
    });

    const invRes = store.addInvitation({
      eventId: evRes.eventId!,
      title: "દિવાળી મહોત્સવ ૨૦૨૬ — નિમંત્રણ પત્રિકા",
      theme: "cultural_festival",
      data: {
        title: "દિવાળી મહોત્સવ ૨૦૨૬",
        subtitle: "આપ સૌનું સહકુટુંબ સ્નેહભર્યું નિમંત્રણ છે",
        eventType: "Cultural Festival",
        dateText: "૧ નવેમ્બર, ૨૦૨૬",
        timeText: "સાંજે ૬:૩૦ થી ૧૦:૩૦",
        venueText: "સાબરમતી રિવરફ્રન્ટ, અમદાવાદ",
        description: "દીપોત્સવ, રંગારંગ સાંસ્કૃતિક કાર્યક્રમો અને સંગીત સંધ્યા.",
        organizer: "ગુજરાત કલ્ચરલ ટ્રસ્ટ",
        chiefGuest: "શ્રીમાન મુખ્યમંત્રીશ્રી",
        highlightPeople: ["પંડિત અજય ચક્રવર્તી", "સુશ્રી કવિતા કૃષ્ણમૂર્તિ"],
        highlights: ["સંગીત સંધ્યા", "દિવાળી ઉત્સવ", "સ્નેહ મિલન"],
        theme: "cultural_festival",
        language: "Gujarati",
        customNotes: "પ્રવેશ પત્રિકા સાથે લાવવી અનિવાર્ય છે",
      },
    });

    expect(invRes.ok).toBe(true);
    expect(invRes.invitationId).toBeDefined();

    const saved = useEventStore.getState().invitations.find((i) => i.id === invRes.invitationId);
    expect(saved).toBeDefined();
    expect(saved?.data.language).toBe("Gujarati");
    expect(saved?.data.title).toContain("દિવાળી મહોત્સવ");
    expect(saved?.data.chiefGuest).toBe("શ્રીમાન મુખ્યમંત્રીશ્રી");
  });
});
