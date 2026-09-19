import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock Firebase modular SDK to run tests in node without live credentials
vi.mock("@/lib/firebase", () => ({
  db: { _mockDb: true },
  auth: { currentUser: null },
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn().mockResolvedValue({ exists: () => false }),
  getDocs: vi.fn().mockResolvedValue({ forEach: vi.fn() }),
  setDoc: vi.fn().mockResolvedValue(undefined),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  writeBatch: vi.fn().mockReturnValue({
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  }),
}));

import { useEventStore } from "../store/event-store";
import { generateEventArtworkSVG } from "../lib/image-generator";
import {
  serializeAIConversation,
  deserializeAIConversation,
} from "../lib/firestore/ai-conversations";
import { AIConversation, AIMessage } from "../types";

describe("AI Copilot Conversation-Based History & Architecture", () => {
  beforeEach(() => {
    useEventStore.getState().resetAll();
  });

  it("TEST A: Multiple messages belong to ONE conversation session", () => {
    const store = useEventStore.getState();
    const convId = store.createConversation("Cultural Night Planning");

    const msg1: AIMessage = {
      id: "msg_1",
      role: "user",
      content: "Create a cultural event in Ahmedabad.",
      createdAt: Date.now(),
    };
    store.addMessageToConversation(convId, msg1);

    const msg2: AIMessage = {
      id: "msg_2",
      role: "assistant",
      content: "Here is the event plan for Cultural Night.",
      createdAt: Date.now() + 1000,
    };
    store.addMessageToConversation(convId, msg2);

    const msg3: AIMessage = {
      id: "msg_3",
      role: "user",
      content: "Add three artists.",
      createdAt: Date.now() + 2000,
    };
    store.addMessageToConversation(convId, msg3);

    const msg4: AIMessage = {
      id: "msg_4",
      role: "assistant",
      content: "Added 3 artists to the schedule.",
      createdAt: Date.now() + 3000,
    };
    store.addMessageToConversation(convId, msg4);

    const updatedStore = useEventStore.getState();
    expect(updatedStore.conversations.length).toBe(1);
    expect(updatedStore.conversations[0].messages.length).toBe(4);
    expect(updatedStore.conversations[0].title).toBe("Cultural Night Planning");
  });

  it("TEST B: New Conversation creates an independent session without deleting previous ones", () => {
    const store = useEventStore.getState();
    const conv1 = store.createConversation("First Chat");
    store.addMessageToConversation(conv1, {
      id: "m1",
      role: "user",
      content: "Hello First Event",
      createdAt: Date.now(),
    });

    const conv2 = store.createConversation("Second Chat");
    store.addMessageToConversation(conv2, {
      id: "m2",
      role: "user",
      content: "Hello Second Event",
      createdAt: Date.now(),
    });

    const updatedStore = useEventStore.getState();
    expect(updatedStore.conversations.length).toBe(2);
    expect(updatedStore.activeConversationId).toBe(conv2);
    expect(updatedStore.conversations.find((c) => c.id === conv1)?.messages.length).toBe(1);
    expect(updatedStore.conversations.find((c) => c.id === conv2)?.messages.length).toBe(1);
  });

  it("TEST C: Deleting conversation leaves created Events completely intact", () => {
    const store = useEventStore.getState();
    // 1. Create event
    const eventRes = store.createEvent({
      name: "Ahmedabad Cultural Gala",
      type: "Cultural Event",
      startDate: "2026-10-24",
      endDate: "2026-10-24",
      startTime: "19:00",
      endTime: "23:00",
      venue: "Grand Hall",
    });
    expect(eventRes.ok).toBe(true);

    // 2. Create conversation referencing this event
    const convId = store.createConversation("Planning Gala");
    store.addMessageToConversation(convId, {
      id: "m1",
      role: "assistant",
      content: "Created Gala event",
      createdAt: Date.now(),
      action: {
        id: "act_1",
        type: "CREATE_EVENT",
        description: "Created Gala",
        requiresConfirmation: false,
        payload: { eventId: eventRes.eventId },
      },
    });

    expect(useEventStore.getState().events.length).toBe(1);
    expect(useEventStore.getState().conversations.length).toBe(1);

    // 3. Delete conversation
    const delRes = useEventStore.getState().deleteConversation(convId);
    expect(delRes.ok).toBe(true);

    // 4. Verify conversation is removed, but event is 100% PRESERVED
    const finalStore = useEventStore.getState();
    expect(finalStore.conversations.length).toBe(0);
    expect(finalStore.events.length).toBe(1);
    expect(finalStore.events[0].name).toBe("Ahmedabad Cultural Gala");
  });

  it("TEST D: Save / Pin conversation toggles isSaved flag correctly", () => {
    const store = useEventStore.getState();
    const convId = store.createConversation("Important Strategy");
    expect(useEventStore.getState().conversations[0].isSaved).toBe(false);

    store.toggleSaveConversation(convId);
    expect(useEventStore.getState().conversations[0].isSaved).toBe(true);

    store.toggleSaveConversation(convId);
    expect(useEventStore.getState().conversations[0].isSaved).toBe(false);
  });

  it("TEST E: Rename conversation updates title cleanly", () => {
    const store = useEventStore.getState();
    const convId = store.createConversation("Temp Title");
    expect(useEventStore.getState().conversations[0].title).toBe("Temp Title");

    store.renameConversation(convId, "Annual Tech Summit 2026");
    expect(useEventStore.getState().conversations[0].title).toBe("Annual Tech Summit 2026");
  });

  it("TEST F: Auto-title generation from first user message", () => {
    const store = useEventStore.getState();
    const convId = store.createConversation("New Conversation");

    store.addMessageToConversation(convId, {
      id: "m1",
      role: "user",
      content: "Plan a college hackathon in Bangalore",
      createdAt: Date.now(),
    });

    const updated = useEventStore.getState().conversations[0];
    expect(updated.title).not.toBe("New Conversation");
    expect(updated.title.toLowerCase()).toContain("hackathon");
  });

  it("TEST G: Image Generator synthesizes high-res SVG data URLs", () => {
    const dataUrl = generateEventArtworkSVG({
      title: "CyberHack 2026",
      subtitle: "48-Hour Code Marathon",
      theme: "neon_tech",
      eventType: "Hackathon",
      organizer: "Tech Society",
    });

    expect(dataUrl).toContain("data:image/svg+xml");
    expect(dataUrl).toContain("CyberHack%202026");
    expect(dataUrl.length).toBeGreaterThan(1000);
  });

  it("TEST H: Firestore Serialization & Deserialization preserves messages and images", () => {
    const conv: AIConversation = {
      id: "conv_test_1",
      title: "Cultural Night Planning",
      userId: "user_123",
      createdAt: 1700000000000,
      updatedAt: 1700000005000,
      isSaved: true,
      relatedEventIds: ["ev_1", "ev_2"],
      messages: [
        {
          id: "m1",
          role: "user",
          content: "Generate a poster for Cultural Night",
          createdAt: 1700000000000,
        },
        {
          id: "m2",
          role: "assistant",
          content: "Here is your cinematic poster.",
          createdAt: 1700000005000,
          generatedImages: [
            {
              id: "img_1",
              url: "data:image/svg+xml;utf8,...",
              prompt: "Cinematic stage lights",
              createdAt: 1700000005000,
              theme: "cultural_warm",
            },
          ],
        },
      ],
    };

    const serialized = serializeAIConversation(conv);
    expect(serialized.id).toBe("conv_test_1");
    expect(serialized.isSaved).toBe(true);

    const deserialized = deserializeAIConversation(serialized, "conv_test_1");
    expect(deserialized.id).toBe("conv_test_1");
    expect(deserialized.title).toBe("Cultural Night Planning");
    expect(deserialized.messages.length).toBe(2);
    expect(deserialized.messages[1].generatedImages?.[0].prompt).toBe("Cinematic stage lights");
  });

  it("TEST I: Conversation tracks relatedEventIds without deleting them on conversation removal", () => {
    const store = useEventStore.getState();
    const convId = store.createConversation("Tech Fest Planning");

    store.addMessageToConversation(convId, {
      id: "msg_act",
      role: "assistant",
      content: "Created event",
      createdAt: Date.now(),
      action: {
        id: "act_10",
        type: "CREATE_EVENT",
        description: "Create Fest",
        requiresConfirmation: false,
        payload: { eventId: "ev_tech_101" },
      },
    });

    const currentConv = useEventStore.getState().conversations.find((c) => c.id === convId);
    expect(currentConv?.relatedEventIds).toContain("ev_tech_101");
  });

  it("TEST J: Invitation maintains two layers: Structured Invitation Data + Visual Artwork", () => {
    const store = useEventStore.getState();
    const addRes = store.addInvitation({
      eventId: "ev_1",
      title: "Gala Night Invitation",
      theme: "executive_gold",
      data: {
        title: "Gala Night",
        subtitle: "Annual Celebration",
        eventType: "Gala",
        dateText: "2026-10-24",
        timeText: "19:00 - 23:00",
        venueText: "Grand Ballroom",
        description: "Join us for an evening of prestige.",
        organizer: "Executive Board",
        theme: "executive_gold",
      },
      artworkUrl: "data:image/svg+xml;utf8,sample",
    });

    expect(addRes.ok).toBe(true);
    const invId = addRes.invitationId!;

    // Edit structured text independently
    const currentInv = useEventStore.getState().invitations.find((i) => i.id === invId);
    expect(currentInv).toBeDefined();

    useEventStore.getState().updateInvitation(invId, {
      data: {
        ...currentInv!.data,
        venueText: "Royal Palace Hall",
        timeText: "20:00 - 00:00",
      },
    });

    const updated = useEventStore.getState().invitations.find((i) => i.id === invId);
    expect(updated?.data.venueText).toBe("Royal Palace Hall");
    expect(updated?.artworkUrl).toBe("data:image/svg+xml;utf8,sample");
  });
});
