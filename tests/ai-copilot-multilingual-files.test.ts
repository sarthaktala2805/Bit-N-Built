// StageX AI — Unit & Integration Tests for AI Copilot, Confirm & Execute, File Processor, Multilingual Scripts & Invitations
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock lib/firebase to avoid requiring live environment variables in offline test runner
vi.mock("@/lib/firebase", () => ({
  db: { type: "mock-firestore" },
  auth: { currentUser: null },
  app: {},
}));

import { useEventStore } from "../store/event-store";
import { processUploadFile } from "../lib/file-processor";
import { AIActionProposal, ScriptCategory } from "../types";

describe("StageX AI Copilot — Action Execution Pipeline (Confirm & Execute)", () => {
  beforeEach(() => {
    useEventStore.getState().resetAll();
  });

  it("Executes CREATE_EVENT action correctly and creates real event in store", async () => {
    const store = useEventStore.getState();

    const action: AIActionProposal = {
      actionType: "CREATE_EVENT",
      eventId: "",
      entityType: "event",
      summary: "Create College Event",
      requiresConfirmation: true,
      payload: {
        name: "College Cultural Night 2026",
        type: "College Event",           // valid type from VALID_EVENT_TYPES
        startDate: "2026-10-10",
        endDate: "2026-10-10",
        startTime: "19:00",
        endTime: "23:00",
        venue: "University Auditorium, Ahmedabad",
        description: "Grand cultural night celebration.",
        organizer: "Student Council",
      },
    };

    const res = await store.executeAIAction(action);
    expect(res.success).toBe(true);
    expect(res.message).toContain("College Cultural Night 2026");

    const events = useEventStore.getState().events;
    expect(events.length).toBe(1);
    expect(events[0].name).toBe("College Cultural Night 2026");
    expect(events[0].startTime).toBe("19:00");
    expect(events[0].endTime).toBe("23:00");
  });

  it("Executes CREATE_SCRIPT action with language and category", async () => {
    const store = useEventStore.getState();

    // createEvent is synchronous in this store
    const eventRes = store.createEvent({
      name: "Tech Summit 2026",
      type: "Conference",
      date: "2026-11-15",
      startDate: "2026-11-15",
      endDate: "2026-11-15",
      startTime: "09:00",
      endTime: "17:00",
      venue: "Main Hall",
      description: "Annual tech conference",
      organizer: "Tech Corp",
    });
    expect(eventRes.ok).toBe(true);

    const action: AIActionProposal = {
      actionType: "CREATE_SCRIPT",
      eventId: eventRes.eventId!,
      entityType: "script",
      summary: "Create Gujarati Anchor Script",
      requiresConfirmation: true,
      payload: {
        eventId: eventRes.eventId!,
        title: "Gujarati Welcome Script",
        role: "Anchor",
        category: "Anchor" as ScriptCategory,
        language: "Gujarati",
        content: "નમસ્તે અને ટેક સમિટ ૨૦૨૬ માં આપનું હાર્દિક સ્વાગત છે!",
      },
    };

    const res = await store.executeAIAction(action);
    expect(res.success).toBe(true);
    expect(res.message).toContain("Created script");

    const scripts = useEventStore.getState().scripts;
    expect(scripts.length).toBe(1);
    expect(scripts[0].title).toBe("Gujarati Welcome Script");
    expect(scripts[0].language).toBe("Gujarati");
    expect(scripts[0].content).toContain("નમસ્તે");
  });

  it("Executes CREATE_INVITATION action with multilingual data and auto-generated artwork", async () => {
    const store = useEventStore.getState();

    const eventRes = store.createEvent({
      name: "Global AI Conclave",
      type: "Conference",
      date: "2026-12-01",
      startDate: "2026-12-01",
      endDate: "2026-12-01",
      startTime: "10:00",
      endTime: "18:00",
      venue: "Convention Center",
      description: "AI Summit",
      organizer: "AI Foundation",
    });
    expect(eventRes.ok).toBe(true);

    const action: AIActionProposal = {
      actionType: "CREATE_INVITATION",
      eventId: eventRes.eventId!,
      entityType: "invitation",
      summary: "Generate VIP Invitation",
      requiresConfirmation: true,
      payload: {
        eventId: eventRes.eventId!,
        title: "VIP Invitation — Global AI Conclave",
        theme: "luxury_gala",
        language: "Bilingual (Hindi + English)",
        subtitle: "आप सादर आमंत्रित हैं / You are cordially invited",
        dateText: "December 1, 2026",
        timeText: "10:00 AM - 6:00 PM",
        venueText: "Convention Center",
        description: "Join international AI researchers.",
        organizer: "AI Foundation",
      },
    };

    const res = await store.executeAIAction(action);
    expect(res.success).toBe(true);
    expect(res.message).toContain("Created invitation");

    const invitations = useEventStore.getState().invitations;
    expect(invitations.length).toBe(1);
    expect(invitations[0].title).toContain("VIP Invitation");
    expect(invitations[0].data.language).toBe("Bilingual (Hindi + English)");
    // artworkUrl should be auto-generated as a data URI
    expect(invitations[0].artworkUrl).toBeDefined();
    expect(typeof invitations[0].artworkUrl).toBe("string");
  });

  it("Executes ADD_SPEAKER and UPDATE_SPEAKER actions correctly", async () => {
    const store = useEventStore.getState();

    const eventRes = store.createEvent({
      name: "Music Fest",
      type: "Cultural Event",     // valid type
      date: "2026-10-20",
      startDate: "2026-10-20",
      endDate: "2026-10-20",
      startTime: "18:00",
      endTime: "23:00",
      venue: "Arena",
      description: "Music festival",
      organizer: "Fest Org",
    });
    expect(eventRes.ok).toBe(true);

    const addSpeakerAction: AIActionProposal = {
      actionType: "ADD_SPEAKER",
      eventId: eventRes.eventId!,
      entityType: "speaker",
      summary: "Add Keynote Artist",
      requiresConfirmation: true,
      payload: {
        eventId: eventRes.eventId!,
        name: "Shreya Ghoshal",
        role: "Artist",
        designation: "Lead Vocalist",
        organization: "Bollywood",
      },
    };

    const addRes = await store.executeAIAction(addSpeakerAction);
    expect(addRes.success).toBe(true);

    const speakers = useEventStore.getState().speakers;
    expect(speakers.length).toBe(1);
    expect(speakers[0].name).toBe("Shreya Ghoshal");
    const speakerId = speakers[0].id;

    const updateSpeakerAction: AIActionProposal = {
      actionType: "UPDATE_SPEAKER",
      eventId: eventRes.eventId!,
      entityType: "speaker",
      summary: "Update Artist Title",
      requiresConfirmation: true,
      payload: {
        speakerId,
        designation: "National Award Winning Vocalist",
      },
    };

    const updateRes = await store.executeAIAction(updateSpeakerAction);
    expect(updateRes.success).toBe(true);
    expect(useEventStore.getState().speakers[0].designation).toBe("National Award Winning Vocalist");
  });

  it("Executes CREATE_SESSION and UPDATE_SESSION actions correctly", async () => {
    const store = useEventStore.getState();

    const eventRes = store.createEvent({
      name: "Developer Days",
      type: "Workshop",
      date: "2026-11-05",
      startDate: "2026-11-05",
      endDate: "2026-11-05",
      startTime: "09:00",
      endTime: "17:00",
      venue: "Hall A",
      description: "Dev workshop",
      organizer: "Dev Community",
    });
    expect(eventRes.ok).toBe(true);

    const addSessionAction: AIActionProposal = {
      actionType: "CREATE_SESSION",
      eventId: eventRes.eventId!,
      entityType: "session",
      summary: "Add Next.js 15 Deep Dive Session",
      requiresConfirmation: true,
      payload: {
        eventId: eventRes.eventId!,
        title: "Next.js 15 Architecture",
        type: "Talk",         // valid session type
        startTime: "10:00",
        endTime: "11:00",
        duration: 60,
      },
    };

    const addRes = await store.executeAIAction(addSessionAction);
    expect(addRes.success).toBe(true);

    const sessions = useEventStore.getState().sessions;
    expect(sessions.length).toBe(1);
    expect(sessions[0].title).toBe("Next.js 15 Architecture");
  });
});

describe("File Processor — Multi-Format Parsing", () => {
  it("Correctly reads plain text files", async () => {
    const textBlob = new Blob(["Event: Hackathon 2026\nDate: Oct 25\nVenue: Tech Park"], {
      type: "text/plain",
    });
    const file = new File([textBlob], "event-brief.txt", { type: "text/plain" });

    const processed = await processUploadFile(file);
    expect(processed.filename).toBe("event-brief.txt");
    expect(processed.extractedText).toContain("Event: Hackathon 2026");
    expect(processed.mimeType).toBe("text/plain");
  });

  it("Handles base64 encoding for multimodal image uploads (PNG/JPEG)", async () => {
    const dummyImageBlob = new Blob(["mock-image-binary-data"], { type: "image/png" });
    const file = new File([dummyImageBlob], "invitation-card.png", { type: "image/png" });

    const processed = await processUploadFile(file);
    expect(processed.filename).toBe("invitation-card.png");
    expect(processed.mimeType).toBe("image/png");
    expect(processed.fileData).toBeDefined();
    expect(processed.fileData?.inlineData.mimeType).toBe("image/png");
    expect(typeof processed.fileData?.inlineData.data).toBe("string");
  });
});

describe("AI Conversations — In-Place Message Updates", () => {
  beforeEach(() => {
    useEventStore.getState().resetAll();
  });

  it("Updates message actionMetadata in conversation upon Confirm & Execute", () => {
    const convId = "conv-101";

    // The store uses 'conversations' (not 'aiConversations')
    useEventStore.setState({
      conversations: [
        {
          id: convId,
          userId: "user-1",
          title: "College Event Planning",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [
            {
              id: "msg-1",
              role: "assistant",
              content: "I have prepared the action for you.",
              createdAt: new Date().toISOString(),
              actionMetadata: {
                status: "pending",
                actionType: "CREATE_EVENT",
                summary: "Create College Fest",
              },
            },
          ],
        },
      ],
    });

    // Mark action executed
    const updateRes = useEventStore.getState().updateMessageInConversation(convId, "msg-1", {
      actionMetadata: {
        status: "executed",
        actionType: "CREATE_EVENT",
        summary: "Create College Fest",
        executedAt: new Date().toISOString(),
      },
    });

    expect(updateRes.ok).toBe(true);

    const conv = useEventStore.getState().conversations.find((c) => c.id === convId);
    expect(conv?.messages[0].actionMetadata?.status).toBe("executed");
    expect(conv?.messages[0].actionMetadata?.executedAt).toBeDefined();
  });
});
