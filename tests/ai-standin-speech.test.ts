import { describe, it, expect } from "vitest";
import {
  SPEECH_EMOTIONS,
  parseSpeechScript,
  generateFallbackStandinSpeech,
  requestStandinSpeech,
  estimateSpeechDurationSeconds,
  formatSpeechTime,
  categorizeVoices,
} from "../lib/ai-standin-speech";

describe("AI Stand-in Speaker Speech with Feeling Engine", () => {
  it("defines rich emotional configurations with pitch, rate, and stage cues", () => {
    expect(SPEECH_EMOTIONS.length).toBeGreaterThanOrEqual(6);

    const inspiring = SPEECH_EMOTIONS.find((e) => e.id === "inspiring");
    expect(inspiring).toBeDefined();
    expect(inspiring?.defaultPitch).toBeGreaterThan(1.0);
    expect(inspiring?.sampleCue).toContain("[");

    const energetic = SPEECH_EMOTIONS.find((e) => e.id === "energetic");
    expect(energetic).toBeDefined();
    expect(energetic?.defaultRate).toBeGreaterThan(1.0);

    const visionary = SPEECH_EMOTIONS.find((e) => e.id === "visionary_deep");
    expect(visionary).toBeDefined();
    expect(visionary?.defaultPitch).toBeLessThan(1.0); // Deeper resonance
  });

  it("parses emotional stage cues and extracts clean spoken text for TTS", () => {
    const rawScript = `[Deep breath, warm smile]
Welcome everyone to the stage!
[Passionate pause, looking into crowd]
Today we venture into quantum horizons.`;

    const parsed = parseSpeechScript(rawScript);

    // Blocks separation
    expect(parsed.blocks.length).toBe(4);
    expect(parsed.blocks[0].type).toBe("stage_cue");
    expect(parsed.blocks[0].text).toBe("Deep breath, warm smile");
    expect(parsed.blocks[1].type).toBe("spoken");
    expect(parsed.blocks[2].type).toBe("stage_cue");
    expect(parsed.blocks[2].text).toBe("Passionate pause, looking into crowd");

    // Clean text has brackets stripped
    expect(parsed.cleanSpokenText).not.toContain("[");
    expect(parsed.cleanSpokenText).not.toContain("]");
    expect(parsed.cleanSpokenText).toContain("Welcome everyone to the stage!");
    expect(parsed.cleanSpokenText).toContain("Today we venture into quantum horizons.");
  });

  it("generates fallback speeches across all emotions in English with stage cues", () => {
    const emotions = ["inspiring", "energetic", "warm_grateful", "visionary_deep", "dramatic_story"] as const;

    for (const emotion of emotions) {
      const speech = generateFallbackStandinSpeech({
        sessionTitle: "NextGen AI & Humanity",
        sessionType: "Keynote",
        eventName: "StageX Live Summit 2026",
        emotion,
        language: "English",
      });

      expect(speech).toBeDefined();
      expect(speech.length).toBeGreaterThan(100);
      expect(speech).toContain("NextGen AI & Humanity");
      expect(speech).toContain("["); // Must contain emotional stage directions
      expect(speech).toContain("]");
    }
  });

  it("generates authentic emotional speeches in Hindi and Hinglish", () => {
    const hindiSpeech = generateFallbackStandinSpeech({
      sessionTitle: "क्वांटम क्रांति",
      sessionType: "मुख्य व्याख्यान",
      eventName: "स्टेजएक्स समिट",
      emotion: "inspiring",
      language: "Hindi",
    });

    expect(hindiSpeech).toContain("क्वांटम क्रांति");
    expect(hindiSpeech).toContain("[");
    expect(hindiSpeech).toContain("मंच");

    const hinglishSpeech = generateFallbackStandinSpeech({
      sessionTitle: "The Startup Playbook",
      sessionType: "Fireside Talk",
      eventName: "Founders Fest",
      emotion: "energetic",
      language: "Hinglish",
    });

    expect(hinglishSpeech).toContain("The Startup Playbook");
    expect(hinglishSpeech).toContain("[");
    expect(hinglishSpeech).toContain("speaker");
  });

  it("falls back gracefully when API route is offline", async () => {
    // In test environment without active server fetch, requestStandinSpeech returns fallback with ok: true
    const result = await requestStandinSpeech({
      sessionTitle: "Closing Inspiration",
      sessionType: "Closing",
      eventName: "Global Tech Gala",
      emotion: "warm_grateful",
      language: "English",
    });

    expect(result.ok).toBe(true);
    expect(result.script.length).toBeGreaterThan(50);
    expect(result.emotion).toBe("warm_grateful");
    expect(["gemini", "fallback"]).toContain(result.source);
  });

  it("calculates speech timing accurately and formats minutes:seconds", () => {
    // 250 words with 2 pause cues
    const script = `[Deep breath, warm smile]
${Array(125).fill("innovation").join(" ")}
[Passionate pause]
${Array(125).fill("future").join(" ")}`;

    // At 1.0x rate: 250 words / (125/60) = 120s spoken + 2 pauses of 1s = 122s
    const durationSecs = estimateSpeechDurationSeconds(script, 1.0, 1.0);
    expect(durationSecs).toBeGreaterThanOrEqual(120);
    expect(durationSecs).toBeLessThanOrEqual(125);

    // Faster rate (1.2x) reduces speaking duration
    const fasterSecs = estimateSpeechDurationSeconds(script, 1.2, 1.0);
    expect(fasterSecs).toBeLessThan(durationSecs);

    // formatSpeechTime formats mm:ss
    expect(formatSpeechTime(125)).toBe("2:05");
    expect(formatSpeechTime(60)).toBe("1:00");
    expect(formatSpeechTime(45)).toBe("0:45");
  });

  it("categorizes voices and recommends Hindi hi-IN and Indian English en-IN voices correctly", () => {
    const mockVoices = [
      { name: "Google US English", lang: "en-US", voiceURI: "uri-en-us" } as SpeechSynthesisVoice,
      { name: "Google हिन्दी", lang: "hi-IN", voiceURI: "uri-hi-in" } as SpeechSynthesisVoice,
      { name: "Microsoft Swara", lang: "hi-IN", voiceURI: "uri-ms-swara" } as SpeechSynthesisVoice,
      { name: "Microsoft Neerja Online (Natural)", lang: "en-IN", voiceURI: "uri-ms-neerja" } as SpeechSynthesisVoice,
      { name: "Google UK English Female", lang: "en-GB", voiceURI: "uri-en-gb" } as SpeechSynthesisVoice,
    ];

    // When language is Hindi, recommended should prioritize hi-IN
    const hindiResult = categorizeVoices(mockVoices, "Hindi");
    expect(hindiResult.recommended.length).toBe(2);
    expect(hindiResult.recommended[0].lang).toBe("hi-IN");
    expect(hindiResult.bestVoiceURI).toBe("uri-hi-in");

    // When language is Hinglish, recommended should prioritize Indian English en-IN
    const hinglishResult = categorizeVoices(mockVoices, "Hinglish");
    expect(hinglishResult.recommended.length).toBe(1);
    expect(hinglishResult.recommended[0].voiceURI).toBe("uri-ms-neerja");

    // When language is English, recommended should prioritize natural English
    const englishResult = categorizeVoices(mockVoices, "English");
    expect(englishResult.recommended.length).toBeGreaterThan(0);
    expect(englishResult.recommended[0].lang.startsWith("en")).toBe(true);
  });

  it("scales speech length arbitrarily for long durations (5m, 15m, 30m, 60m)", () => {
    const shortSpeech = generateFallbackStandinSpeech({
      sessionTitle: "AI Revolution",
      eventName: "Global Summit",
      language: "English",
      durationMinutes: 2,
    });

    const mediumSpeech = generateFallbackStandinSpeech({
      sessionTitle: "AI Revolution",
      eventName: "Global Summit",
      language: "English",
      durationMinutes: 10,
    });

    const longSpeech = generateFallbackStandinSpeech({
      sessionTitle: "AI Revolution",
      eventName: "Global Summit",
      language: "English",
      durationMinutes: 30,
    });

    // Word counts should scale upwards as duration increases
    const shortWords = shortSpeech.split(/\s+/).length;
    const mediumWords = mediumSpeech.split(/\s+/).length;
    const longWords = longSpeech.split(/\s+/).length;

    expect(mediumWords).toBeGreaterThan(shortWords);
    expect(longWords).toBeGreaterThan(mediumWords);

    // Multi-act structure for long speeches
    expect(mediumSpeech).toContain("Act II");
    expect(mediumSpeech).toContain("Act III");
    expect(longSpeech).toContain("Act IV");
    expect(longSpeech).toContain("Act VI");
    expect(longSpeech).toContain("Act VII");

    // Hindi long speech scaling
    const hindiLong = generateFallbackStandinSpeech({
      sessionTitle: "भविष्य की तकनीक",
      eventName: "स्टेजएक्स",
      language: "Hindi",
      durationMinutes: 30,
    });
    expect(hindiLong).toContain("अंक २");
    expect(hindiLong).toContain("अंक ४");
    expect(hindiLong).toContain("अंक ६");
    expect(hindiLong.split(/\s+/).length).toBeGreaterThan(shortWords);

    // Hinglish long speech scaling
    const hinglishLong = generateFallbackStandinSpeech({
      sessionTitle: "Startup Ecosystem",
      eventName: "Founders Meet",
      language: "Hinglish",
      durationMinutes: 30,
    });
    expect(hinglishLong).toContain("Act II");
    expect(hinglishLong).toContain("Act IV");
    expect(hinglishLong).toContain("Act VI");
    expect(hinglishLong.split(/\s+/).length).toBeGreaterThan(shortWords);
  });

  it("formats hours and minutes accurately for speeches over 60 minutes", () => {
    expect(formatSpeechTime(3600)).toBe("1:00:00");
    expect(formatSpeechTime(3665)).toBe("1:01:05");
    expect(formatSpeechTime(7200)).toBe("2:00:00");
    expect(formatSpeechTime(5430)).toBe("1:30:30");
  });
});

