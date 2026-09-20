// StageX AI — Stand-in Speaker Speech with Feeling Engine
// When an event session has no speaker assigned or the speaker is delayed/absent,
// AI delivers the speech itself with authentic emotion, expressive cadence, and vocal inflections.

export type SpeechEmotion =
  | "inspiring"
  | "energetic"
  | "warm_grateful"
  | "visionary_deep"
  | "dramatic_story"
  | "hinglish_desi";

export interface EmotionConfig {
  id: SpeechEmotion;
  label: string;
  hindiLabel: string;
  emoji: string;
  tagline: string;
  description: string;
  defaultPitch: number; // 0.5 to 2.0 (1.0 = normal)
  defaultRate: number;  // 0.5 to 2.0 (1.0 = normal)
  pauseMultiplier: number;
  badgeColor: string;
  gradientBg: string;
  sampleCue: string;
}

export const SPEECH_EMOTIONS: EmotionConfig[] = [
  {
    id: "inspiring",
    label: "Inspiring & Passionate",
    hindiLabel: "प्रेरणादायक एवं भावपूर्ण",
    emoji: "✨",
    tagline: "Heartfelt optimism & uplifting vision",
    description: "Rich emotional cadence, thoughtful pauses, and uplifting crescendo that inspires everyone in the hall.",
    defaultPitch: 1.05,
    defaultRate: 0.95,
    pauseMultiplier: 1.2,
    badgeColor: "border-amber-500/40 text-amber-300 bg-amber-500/10",
    gradientBg: "from-amber-600/20 via-orange-600/10 to-transparent",
    sampleCue: "[Deep breath, eyes lighting up with conviction]",
  },
  {
    id: "energetic",
    label: "High Energy & Motivational",
    hindiLabel: "जोशीला और धमाकेदार",
    emoji: "🔥",
    tagline: "Dynamic tempo & electrifying crowd call",
    description: "Punchy, fast-paced motivational delivery that wakes up the audience and charges the stage atmosphere.",
    defaultPitch: 1.15,
    defaultRate: 1.08,
    pauseMultiplier: 0.8,
    badgeColor: "border-rose-500/40 text-rose-300 bg-rose-500/10",
    gradientBg: "from-rose-600/20 via-red-600/10 to-transparent",
    sampleCue: "[Leaning forward with vibrant energy, voice surging]",
  },
  {
    id: "warm_grateful",
    label: "Warm & Heartfelt",
    hindiLabel: "आत्मीय एवं कृतज्ञ",
    emoji: "💖",
    tagline: "Intimate, welcoming & deeply respectful",
    description: "Soft, empathetic tone connecting directly to individual human hearts with immense gratitude.",
    defaultPitch: 0.98,
    defaultRate: 0.92,
    pauseMultiplier: 1.3,
    badgeColor: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
    gradientBg: "from-emerald-600/20 via-teal-600/10 to-transparent",
    sampleCue: "[Warm smile, speaking softly with open hands]",
  },
  {
    id: "visionary_deep",
    label: "Visionary & Thoughtful",
    hindiLabel: "गंभीर और दूरदर्शी",
    emoji: "🌌",
    tagline: "Authoritative depth & intellectual clarity",
    description: "Deep, resonant voice with deliberate, meditative pacing outlining transformative ideas for tomorrow.",
    defaultPitch: 0.88,
    defaultRate: 0.88,
    pauseMultiplier: 1.4,
    badgeColor: "border-indigo-500/40 text-indigo-300 bg-indigo-500/10",
    gradientBg: "from-indigo-600/20 via-purple-600/10 to-transparent",
    sampleCue: "[Thoughtful silence, gazing into the distance]",
  },
  {
    id: "dramatic_story",
    label: "Dramatic Storytelling",
    hindiLabel: "रोमांचक कथावाचक",
    emoji: "🎭",
    tagline: "Suspense, emotional shifts & vivid imagery",
    description: "Masterful narrative shifts from intriguing whispers to resounding, cinematic conclusions.",
    defaultPitch: 1.02,
    defaultRate: 0.94,
    pauseMultiplier: 1.25,
    badgeColor: "border-purple-500/40 text-purple-300 bg-purple-500/10",
    gradientBg: "from-purple-600/20 via-pink-600/10 to-transparent",
    sampleCue: "[Lowering voice to a dramatic whisper, building tension]",
  },
  {
    id: "hinglish_desi",
    label: "Hinglish Desi Swag",
    hindiLabel: "देसी और आत्मीय हिंग्लिश",
    emoji: "🇮🇳",
    tagline: "Natural conversational Hinglish with soul",
    description: "Authentic, relatable Hinglish blending Hindi emotions and English clarity that strikes an instant chord.",
    defaultPitch: 1.02,
    defaultRate: 0.98,
    pauseMultiplier: 1.0,
    badgeColor: "border-cyan-500/40 text-cyan-300 bg-cyan-500/10",
    gradientBg: "from-cyan-600/20 via-blue-600/10 to-transparent",
    sampleCue: "[Muskurate hue, dil se audience ko dekhte hue]",
  },
];

export interface ScriptBlock {
  type: "spoken" | "stage_cue";
  text: string;
}

/**
 * Parses script text to separate spoken words from emotional stage cues inside square brackets [like this].
 * This allows the UI to render stage directions cleanly and prevents TTS from reading "[Pause]" aloud.
 */
export function parseSpeechScript(rawText: string): {
  blocks: ScriptBlock[];
  cleanSpokenText: string;
  spokenSegments: string[];
} {
  const blocks: ScriptBlock[] = [];
  const regex = /\[(.*?)\]/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(rawText)) !== null) {
    if (match.index > lastIndex) {
      const spokenPart = rawText.substring(lastIndex, match.index);
      if (spokenPart.trim()) {
        blocks.push({ type: "spoken", text: spokenPart });
      }
    }
    blocks.push({ type: "stage_cue", text: match[1].trim() });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < rawText.length) {
    const trailing = rawText.substring(lastIndex);
    if (trailing.trim()) {
      blocks.push({ type: "spoken", text: trailing });
    }
  }

  const cleanSpokenText = rawText
    .replace(/\[(.*?)\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const spokenSegments = blocks
    .filter((b) => b.type === "spoken")
    .map((b) => b.text.trim())
    .filter(Boolean);

  return { blocks, cleanSpokenText, spokenSegments };
}

/**
 * Calculates estimated speech delivery duration in seconds based on word count,
 * current speaking rate, and pause duration between stage cues and paragraphs.
 */
export function estimateSpeechDurationSeconds(
  text: string,
  rate: number = 1.0,
  pauseDurationSeconds: number = 1.0
): number {
  if (!text || !text.trim()) return 0;
  const { blocks } = parseSpeechScript(text);

  let totalWords = 0;
  let pauseCount = 0;

  for (const b of blocks) {
    if (b.type === "spoken") {
      const words = b.text.trim().split(/\s+/).filter(Boolean).length;
      totalWords += words;
    } else if (b.type === "stage_cue") {
      pauseCount++;
    }
  }

  // Base speaking rate for live stage address: ~125 words per minute
  const safeRate = Math.max(0.5, rate);
  const wordsPerSecond = (125 / 60) * safeRate;
  const spokenTimeSeconds = totalWords > 0 ? totalWords / wordsPerSecond : 0;
  const pauseTimeSeconds = pauseCount * Math.max(0.2, pauseDurationSeconds);

  return Math.round(spokenTimeSeconds + pauseTimeSeconds);
}

/**
 * Formats duration seconds into mm:ss
 */
export function formatSpeechTime(totalSeconds: number): string {
  if (totalSeconds >= 3600) {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Categorizes and recommends browser voices according to target language (Hindi, Hinglish, English)
 */
export function categorizeVoices(
  voices: SpeechSynthesisVoice[],
  language: "English" | "Hindi" | "Hinglish"
): {
  recommended: SpeechSynthesisVoice[];
  hindiVoices: SpeechSynthesisVoice[];
  indianEnglishVoices: SpeechSynthesisVoice[];
  allVoices: SpeechSynthesisVoice[];
  bestVoiceURI: string;
} {
  const hindiVoices = voices.filter(
    (v) =>
      v.lang.toLowerCase().startsWith("hi") ||
      v.name.toLowerCase().includes("hindi") ||
      v.name.includes("हिन्दी") ||
      v.name.toLowerCase().includes("swara") ||
      v.name.toLowerCase().includes("madhur")
  );

  const indianEnglishVoices = voices.filter(
    (v) =>
      v.lang.toLowerCase().includes("en-in") ||
      v.name.toLowerCase().includes("india") ||
      v.name.toLowerCase().includes("neerja") ||
      v.name.toLowerCase().includes("prabhat")
  );

  let recommended: SpeechSynthesisVoice[] = [];
  if (language === "Hindi") {
    recommended = hindiVoices.length > 0 ? hindiVoices : (indianEnglishVoices.length > 0 ? indianEnglishVoices : voices);
  } else if (language === "Hinglish") {
    // For Hinglish, Indian English voices pronounce Hindi colloquialisms naturally
    recommended = indianEnglishVoices.length > 0 ? indianEnglishVoices : (hindiVoices.length > 0 ? hindiVoices : voices);
  } else {
    // English
    recommended = voices.filter(
      (v) =>
        v.lang.toLowerCase().startsWith("en") &&
        (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Online"))
    );
    if (recommended.length === 0) {
      recommended = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
    }
  }

  const bestVoiceURI = recommended[0]?.voiceURI || voices[0]?.voiceURI || "";

  return {
    recommended,
    hindiVoices,
    indianEnglishVoices,
    allVoices: voices,
    bestVoiceURI,
  };
}

export interface StandinSpeechParams {
  sessionTitle: string;
  sessionType?: string;
  eventName?: string;
  organizer?: string;
  emotion?: SpeechEmotion;
  language?: "English" | "Hindi" | "Hinglish";
  durationMinutes?: number;
  customPrompt?: string;
  venue?: string;
}

/**
 * Fallback Speech Generator with feeling when offline or if API is unreachable.
 * Creates an emotionally staged, heartfelt address tailored to the session, emotion, custom prompt, and duration.
 */
export function generateFallbackStandinSpeech(params: StandinSpeechParams): string {
  const {
    sessionTitle,
    sessionType = "Keynote Address",
    eventName = "StageX Live Stage",
    emotion = "inspiring",
    language = "English",
    customPrompt,
    durationMinutes = 2,
  } = params;

  // Custom prompt snippet insertion if user specified custom instructions
  const customHindiSnippet = customPrompt
    ? `\n\n[गहरी आत्मीयता से दर्शकों को देखते हुए]\nविशेष रूप से, आज के इस मंच का जो सबसे बड़ा संदेश है: "${customPrompt}"। यही वह बात है जो हम सभी के दिलों में एक नई उमंग और विश्वास भरती है!`
    : "";

  const customHinglishSnippet = customPrompt
    ? `\n\n[Passionate pause, connecting with everyone]\nAur dosto, sabse important baat jo aaj hum sabko dil se yaad rakhni hai: "${customPrompt}"! Yahi spirit humein aage le jaayegi!`
    : "";

  const customEnglishSnippet = customPrompt
    ? `\n\n[Stepping closer to the audience with heartfelt conviction]\nAnd most importantly, let us reflect on our defining purpose today: "${customPrompt}". This is the true north that guides our journey forward.`
    : "";

  let baseSpeech = "";

  if (language === "Hindi") {
    switch (emotion) {
      case "energetic":
        baseSpeech = `[गहरी सांस लेते हुए, मंच के केंद्र में आकर पूरे जोश से]
नमस्ते और आदाब आप सभी को! आज इस शानदार मंच, "${eventName}" पर, जहाँ हर तरफ एक अद्भुत ऊर्जा और विश्वास दिखाई दे रहा है!

[मुस्कुराते हुए, दोनों हाथ आगे बढ़ाकर]
हालाँकि हमारे मुख्य वक्ता किसी अपरिहार्य कारण से यहाँ उपस्थित नहीं हो सके, लेकिन सोच, संकल्प और जज़्बा कभी नहीं रुकते! आज का हमारा यह सत्र—"${sessionTitle}"—सिर्फ एक विषय नहीं, बल्कि हमारे आने वाले कल की सबसे बड़ी प्रेरणा है!

[आवाज़ में गहरा जोश भरते हुए, एक-एक शब्द पर ज़ोर]
क्या हम सब तैयार हैं इस बदलाव का हिस्सा बनने के लिए? हाँ या ना? जब हम किसी नए रास्ते पर कदम बढ़ाते हैं, तो चुनौतियाँ तो आएँगी, लेकिन जो डटकर खड़े रहते हैं, वही इतिहास रचते हैं!

[गंभीर ठहराव, दर्शकों की आँखों में देखते हुए]
अगले कुछ पलों में, अपने अंदर के उस विश्वास को जगाइए। सीखिए, सवाल पूछिए, और इस खूबसूरत पल को यादगार बनाइए।`;
        break;

      case "warm_grateful":
        baseSpeech = `[हल्की सी आत्मीय मुस्कान, हाथ जोड़कर नमन करते हुए]
आप सभी का दिल की असीम गहराइयों से हार्दिक स्वागत। आज "${eventName}" के इस खूबसूरत अवसर पर आप सबका यहाँ होना, हमारे लिए किसी उत्सव से कम नहीं है।

[आवाज़ में गहरा अपनापन और कोमल भाव]
हमारे वक्ता आज किसी व्यक्तिगत आकस्मिकता के कारण समय पर नहीं पहुँच सके, परंतु उनका संदेश और असीम शुभकामनाएँ इस पूरे सभागार में गूँज रही हैं। आज का यह सत्र—"${sessionTitle}"—सीधे दिल से दिल को जोड़ने का प्रयास है।

[धीमा, भावुक ठहराव, सबकी ओर देखते हुए]
जीवन में ज्ञान से भी अधिक महत्वपूर्ण होता है एक-दूसरे का संबल बनना, और मिलकर बड़े सपनों को सींचना। आइए, इस खूबसूरत पल को खुली सोच, सीखने की लगन और कृतज्ञता के साथ आगे बढ़ाएँ।`;
        break;

      case "visionary_deep":
        baseSpeech = `[मंच पर एकाग्रता से खड़े होकर, सभागार में शांति स्थापित होने का विराम]
इस सभागार को ध्यान से देखिए। मानव इतिहास का हर बड़ा बदलाव, एक ऐसे ही कमरे में शुरू हुआ था जहाँ कुछ लोगों ने असंभव को संभव मानने का साहस किया।

[गहरी सांस, आवाज़ में गंभीरता और स्पष्टता]
स्वागत है आप सभी का "${eventName}" में। आज का विषय है—"${sessionTitle}"। हमारे सम्मानीय वक्ता आज यहाँ नहीं हैं, परंतु यह विचार किसी एक व्यक्ति का मोहताज नहीं है। यह विचार हम सबका साझा भविष्य है।

[विचारशील मौन, दूर तक देखते हुए]
हम भविष्य का निर्माण केवल प्रतीक्षा करके नहीं करते; हम भविष्य का निर्माण तब करते हैं जब हम आज दृढ़ता और ईमानदारी से कदम उठाते हैं।`;
        break;

      default: // inspiring
        baseSpeech = `[मंच पर दृढ़ता से खड़े होकर, गहरी सांस और आत्मविश्वासी दृष्टि]
देवियों और सज्जनों, आज "${eventName}" के इस ऐतिहासिक अवसर पर आप सभी का स्वागत करते हुए मुझे अपार गर्व और आनंद की अनुभूति हो रही है।

[भावपूर्ण ठहराव, चेहरे पर उम्मीद की चमक]
आज का यह महत्वपूर्ण सत्र है—"${sessionTitle}" (${sessionType})। जब कोई सपना बड़ा होता है, तो राह में अप्रत्याशित मोड़ भी आते हैं। हमारे मुख्य वक्ता आज हमारे बीच नहीं हैं, परंतु उनका संकल्प और यह विषय हमारे सामने एक खुली किताब की तरह है।

[आवाज़ में गहरा संकल्प और प्रेरणा]
याद रखिए, महान बदलाव तब नहीं होते जब सब कुछ योजना के अनुसार चलता है; महान बदलाव तब जन्म लेते हैं जब हम हर परिस्थिति में आगे बढ़ने का अटूट हौसला रखते हैं!`;
        break;
    }
  } else if (language === "Hinglish") {
    switch (emotion) {
      case "energetic":
        baseSpeech = `[Center stage par aate hue, beaming energetic smile]
Hello everyone! Kya zabardast energy aur josh hai aaj yahan "${eventName}" mein!

[Audience ki taraf dekhte hue, passionate pause]
Dekhiye, hamare scheduled speaker kisi emergency delay ki wajah se physically yahan nahi pahunch paye. But guess what? The show MUST go on, aur humara yeh session—"${sessionTitle}"—ekdum full power ke sath start hoga!

[Voice rising with pure motivation, leaning forward]
Jab hum growth aur innovation ki baat karte hain na dosto, toh sabse pehli cheez hoti hai adaptability. Raste mein obstacles aayenge, lekin champions wahi hote hain jo rukne ke bajaye aur tez daudte hain!

[Power pause, punching the air lightly with confidence]
Toh chaliye, apne dil aur dimag dono open karke ready ho jaiye. Let's make this session absolutely unforgettable.`;
        break;

      case "warm_grateful":
        baseSpeech = `[Warm and welcoming smile, dil pe haath rakhte hue]
A very warm welcome to each and every one of you. Aaj "${eventName}" mein aap sabka aana humare liye sach mein bahut special hai.

[Gentle, empathetic tone]
Hamare speaker kisi unavoidable personal urgency ki wajah se jud nahi sake, but unka passion aur message poori tarah se hamare sath hai. Aaj ka jo humara topic hai—"${sessionTitle}"—yeh humare safar ka sabse khoobsurat hissa hai.

[Thoughtful pause, looking affectionately at the crowd]
Kabhi-kabhi unexpected moments hi sabse zyaada yaad reh jaate hain. Let us enjoy this moment together, connect with each other, aur is event ko dil se celebrate karein.`;
        break;

      default: // inspiring
        baseSpeech = `[Deep breath, confident and inspiring eye contact with the entire hall]
A warm greeting to everyone present here at "${eventName}".

[Passionate pause, gentle smile]
Today's session is "${sessionTitle}" (${sessionType}). Life aur live events dono ka ek rule hota hai: jab journey mein unexpected turns aate hain, tabhi true leadership dekhne ko milti hai.

[Speaking with heart and conviction]
Hamare guest speaker physical form mein yahan nahi hain, but "${sessionTitle}" ka vision is room ke har ek insaan ke dil mein hai. Har ek bada idea tab reality banta hai jab hum courageous ban kar step forward lete hain.`;
        break;
    }
  } else {
    // English
    switch (emotion) {
      case "energetic":
        baseSpeech = `[Bounding onto stage center with electrifying energy and a warm, magnetic grin]
Good day, everyone! Feel the pulse in this room today at "${eventName}"!

[Pausing for dramatic impact, leaning toward the crowd]
Now, our scheduled speaker met an unavoidable travel delay, but let me tell you something vital: the spirit, the ambition, and the fire of this stage wait for NO ONE!

[Voice rising with intense motivation and conviction]
Our session right now is "${sessionTitle}". This is not just a title on a screen—this is a battle cry for innovation, resilience, and bold action! When obstacles appear, average minds pause, but trailblazers like you accelerate!`;
        break;

      case "warm_grateful":
        baseSpeech = `[Walking slowly to the spotlight, hand over heart, beaming with genuine warmth]
Welcome, dear friends. What a true privilege it is to stand before such a compassionate and vibrant gathering here at "${eventName}".

[Soft, empathetic breath, smiling gently]
Our guest speaker was unexpectedly held back today, yet their heart and warmest wishes are reverberating in this hall. Today's presentation—"${sessionTitle}"—is built on one timeless principle: human connection.

[Gentle pause, eyes meeting the front row with tenderness]
In a world that moves relentlessly fast, what truly endures is the gratitude we hold for each other, the stories we share, and the encouragement we offer. Let us dedicate this session to curiosity, mutual respect, and genuine belonging.`;
        break;

      case "visionary_deep":
        baseSpeech = `[Standing in still contemplation, letting the room settle into focused silence]
Look around this room. Every monumental shift in human history began with a room of minds daring to ponder the unknown.

[Deep breath, voice resonating with gravitas and clarity]
Welcome to "${eventName}". We gather now for "${sessionTitle}"—a crucial inflection point for our industry. While our distinguished speaker could not be on stage today, the foundational questions that define this session are more urgent than ever.

[Deliberate, thoughtful pause]
We do not build the future by waiting for certainty. We shape the future by stepping into the void with clarity, rigor, and unapologetic imagination.`;
        break;

      default: // inspiring
        baseSpeech = `[Standing tall at stage center, taking a slow, grounding breath with a confident smile]
Ladies and gentlemen, esteemed guests, and fellow dreamers. Welcome to "${eventName}".

[Passionate pause, voice warm and resonant]
Today, our agenda brings us to a defining milestone: "${sessionTitle}". Our honored speaker has been unexpectedly delayed, but the power of this topic belongs to all of us right here, right now.

[Leaning forward with deep emotional inflection]
True inspiration is not about who delivers the words; it is about how deeply those words ignite the courage inside each one of you. The challenges of tomorrow will not be solved by bystander cynicism—they will be mastered by bold, heartfelt conviction!`;
        break;
    }
  }

  // Multi-Act Scaler for Long Speeches (supports arbitrary duration: 5m, 10m, 15m, 30m, 60m+)
  const extendedActs: string[] = [];

  if (durationMinutes >= 4) {
    if (language === "Hindi") {
      extendedActs.push(`\n\n[मंच पर धीमे कदमों से आगे बढ़ते हुए, गहराई से समझाते हुए]
अंक २: धरातल की चुनौतियाँ और हमारे प्रयास
जब हम "${sessionTitle}" की गहराई में उतरते हैं, तो हमें यह समझना होगा कि कोई भी बड़ी उपलब्धि रातोंरात नहीं मिलती। हर क्रांति के पीछे अनगिनत रातों की कड़ी मेहनत, असफलताएँ और फिर से उठ खड़े होने का जज़्बा छिपा होता है। जब परिस्थितियाँ कठिन होती हैं, तभी असली नेतृत्व की पहचान होती है।`);

      extendedActs.push(`\n\n[गहरी सांस, आवाज़ में आत्मीयता]
अंक ३: विचार से कार्य की ओर
विचार केवल कागजों पर या स्क्रीन पर अच्छे लगते हैं, लेकिन जब तक उन्हें व्यवहार में न उतारा जाए, उनका कोई मूल्य नहीं होता। आज "${eventName}" में हमारा यह संकल्प होना चाहिए कि हम सिर्फ सुनने और सराहना करने तक सीमित न रहें, बल्कि यहाँ से मिली सीख को अपने रोज़मर्रा के जीवन और काम में उतारें।`);
    } else if (language === "Hinglish") {
      extendedActs.push(`\n\n[Walking across the stage, hands open, speaking conversationally]
Act II: Real Ground Reality & Breakthrough Mindset
Jab hum "${sessionTitle}" ke baare mein sochte hain, toh sabse pehle dhyan aata hai challenges par. Reality yeh hai dosto, ki koi bhi successful revolution comfort zone mein baith kar create nahi hoti. Failures aayenge, doubts honge, lekin jab conviction strong ho, toh har hurdle ek stepping stone ban jaata hai.`);

      extendedActs.push(`\n\n[Pausing with reflective intensity]
Act III: Taking Action Beyond Words
Idea kitna bhi brilliant ho, until we execute it with consistency, it means nothing. Aaj "${eventName}" ke is stage se hum sabko ek practical promise karni hai: we won't just clap and leave, we will implement this mindset in our everyday projects.`);
    } else {
      extendedActs.push(`\n\n[Pacing thoughtfully across the stage, engaging the wings]
Act II: The Reality of Friction and the Price of Progress
When we dissect "${sessionTitle}", we confront an inescapable truth: true innovation is fundamentally disruptive and uncomfortable. The comfortable path is paved with consensus, but breakthrough milestones are forged in the crucible of uncertainty and resolute resilience.`);

      extendedActs.push(`\n\n[Lowering voice with intentional gravitas]
Act III: From Abstract Vision to Measurable Impact
A visionary philosophy without rigorous execution is merely a hallucination. Today at "${eventName}", our standard must not be passive agreement. Our standard must be decisive, measurable action that transforms how we create, collaborate, and lead.`);
    }
  }

  if (durationMinutes >= 12) {
    if (language === "Hindi") {
      extendedActs.push(`\n\n[मुस्कुराते हुए, दर्शकों से सीधा संवाद स्थापित करते हुए]
अंक ४: वास्तविक कहानियाँ और प्रेरणा के क्षण
इतिहास गवाह है कि जब साधारण लोगों ने असाधारण विश्वास दिखाया, तो दुनिया की दिशा बदल गई। हमारे चारों ओर ऐसे कई उदाहरण हैं जहाँ सीमित संसाधनों के बावजूद लोगों ने अकल्पनीय सफलता हासिल की। "${sessionTitle}" हमें यही सिखाता है कि बाधाएँ हमारे रास्ते का अंत नहीं, बल्कि नई शुरुआत का संकेत हैं।`);

      extendedActs.push(`\n\n[आवाज़ में गहरा भावनात्मक उत्थान]
अंक ५: हमारी सामूहिक शक्ति
अकेले हम शायद तेज़ दौड़ सकते हैं, लेकिन दूर तक जाने के लिए हमें एक-दूसरे का हाथ थामना पड़ता है। आज इस सभागार में बैठा हर व्यक्ति किसी न किसी बदलाव का सूत्रधार है। जब हम अपनी क्षमताओं को साझा करते हैं, तो कोई भी लक्ष्य असंभव नहीं रह जाता।`);
    } else if (language === "Hinglish") {
      extendedActs.push(`\n\n[Pointing gently to the audience with admiration]
Act IV: Human Stories & Relatable Triumphs
Aap history utha kar dekh lijiye—har transformative journey mein sabse powerful element human spirit hi raha hai. Jab common people unshakeable belief ke sath kaam karte hain, toh outcomes extraordinary hote hain. "${sessionTitle}" is all about unlocking that inner potential.`);

      extendedActs.push(`\n\n[Building momentum with authentic cadence]
Act V: The Power of Community & Shared Destiny
Individually we are good, but together we are unstoppable. Is room mein baithe har developer, creator, aur leader ke paas ek unique superpower hai. When we collaborate without ego, we don't just solve problems—we redefine the future!`);
    } else {
      extendedActs.push(`\n\n[Gesturing warmly across the audience with compelling rhythm]
Act IV: Human Chronicles of Defiance and Triumph
Look through the annals of every great endeavor: the deciding variable has never been raw computational power or unlimited capital. It has always been the relentless audacity of human beings who refused to accept obsolete paradigms. That is the beating heart of "${sessionTitle}".`);

      extendedActs.push(`\n\n[Expanding posture, voice crescendoing with inspiring resonance]
Act V: Collective Destiny and Ecosystem Mastery
Brilliance in isolation has a strict ceiling. Exponential growth happens when diverse minds align around an audacious purpose. Every individual seated here today holds a critical piece of the architectural puzzle.`);
    }
  }

  if (durationMinutes >= 25) {
    if (language === "Hindi") {
      extendedActs.push(`\n\n[गंभीर, विचारशील मौन के बाद, एक-एक शब्द पर ज़ोर]
अंक ६: भविष्य का विज़न और आने वाली पीढ़ी की ज़िम्मेदारी
आने वाला कल हमारे आज के फैसलों पर निर्भर करता है। जब हम भविष्य की ओर देखते हैं, तो सवाल यह नहीं है कि तकनीक या दुनिया कहाँ जाएगी; सवाल यह है कि हम दुनिया को किस दिशा में ले जाना चाहते हैं। मूल्य, नैतिकता और करुणा ही हमारी प्रगति की असली कसौटी हैं।`);

      extendedActs.push(`\n\n[दोनों हाथ फैलाकर, प्रेरणादायक मुस्कान]
अंक ७: परिवर्तन का आह्वान
इसलिए आज, इस मंच से, एक नए संकल्प के साथ आगे बढ़िए। अपने सपनों को सिर्फ अपनी डायरी तक सीमित मत रखिए; उन्हें हकीकत में बदलने के लिए मैदान में उतरिए।`);
    } else if (language === "Hinglish") {
      extendedActs.push(`\n\n[Thoughtful pause, deep and visionary tone]
Act VI: The Next Horizon & Long-Term Legacy
Agla decade kaisa hoga, yeh koi astrology predict nahi karegi—yeh humare aaj ke actions decide karenge. As we scale "${sessionTitle}", technology ke sath empathy aur human values ko balance karna hamari sabse badi responsibility hai.`);

      extendedActs.push(`\n\n[Standing tall, confident smile]
Act VII: The Ultimate Call to Bold Action
Don't wait for the perfect moment. Take the messy, imperfect first step today. Har monumental milestone isi courageous first step se shuru hota hai.`);
    } else {
      extendedActs.push(`\n\n[Pausing deliberately, allowing the room to reflect in pin-drop quiet]
Act VI: The Long Horizon — Ethics, Legacy, and Stewardship
The defining question of our generation is not whether we have the capability to build faster, smarter systems. The defining question is: what values will govern those systems when they scale? Stewardship is our sacred obligation.`);

      extendedActs.push(`\n\n[Commanding stage presence, resonant and authoritative]
Act VII: The Manifesto for the Bold
History does not memorialize timid observers who waited for absolute certainty. History remembers the pioneers who stepped into the unknown, took full accountability, and bent reality toward progress.`);
    }
  }

  // Combine Base + Custom Snippet + Extended Acts + Final Ovation
  const customSnippet = language === "Hindi" ? customHindiSnippet : language === "Hinglish" ? customHinglishSnippet : customEnglishSnippet;

  let finale = "";
  if (language === "Hindi") {
    finale = `\n\n[हाथ जोड़कर, कृतज्ञता और गर्व भरी आवाज़ में]
आइए, इस सत्र को एक नई दृष्टि दें और अपने भविष्य को एक नई उड़ान! "${sessionTitle}" की इस यात्रा में शामिल होने के लिए आप सभी का हृदय से बहुत-बहुत धन्यवाद! जय हिंद!`;
  } else if (language === "Hinglish") {
    finale = `\n\n[Voice swelling with emotional crescendo, smiling warmly]
Let this session be a reminder that nothing can stop a community driven by passion. "${sessionTitle}" is just the beginning. Thank you so much, and let's conquer the future together!`;
  } else {
    finale = `\n\n[Voice rising with an uplifting, heartfelt crescendo, looking proudly at the hall]
Let us celebrate this moment, embrace the lessons of "${sessionTitle}", and step forward as leaders of tomorrow. Thank you so much, and enjoy this incredible journey!`;
  }

  return baseSpeech + customSnippet + extendedActs.join("") + finale;
}

/**
 * Call server AI route for standin_speech with automatic fallback
 */
export async function requestStandinSpeech(params: StandinSpeechParams): Promise<{
  ok: boolean;
  script: string;
  emotion: SpeechEmotion;
  source: "gemini" | "fallback";
}> {
  const chosenEmotion = params.emotion || "inspiring";
  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestType: "standin_speech",
        emotion: chosenEmotion,
        language: params.language || "English",
        durationMinutes: params.durationMinutes || 2,
        customPrompt: params.customPrompt,
        prompt: params.customPrompt
          ? `Stand-in keynote speech for session "${params.sessionTitle}" (${params.sessionType || "Keynote"}) covering topics: "${params.customPrompt}" with deep emotional feeling (${chosenEmotion}) in ${params.language || "English"}.`
          : `Stand-in keynote speech for session "${params.sessionTitle}" (${params.sessionType || "Keynote"}) with deep emotional feeling (${chosenEmotion}) in ${params.language || "English"}.`,
        context: {
          sessionTitle: params.sessionTitle,
          sessionType: params.sessionType || "Keynote",
          emotion: chosenEmotion,
          durationMinutes: params.durationMinutes || 2,
          customPrompt: params.customPrompt,
          event: {
            name: params.eventName || "Live Stage Summit",
            organizer: params.organizer || "Stage Operations",
            venue: params.venue || "Main Auditorium",
          },
        },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.text && typeof data.text === "string" && data.text.trim().length > 30) {
        return {
          ok: true,
          script: data.text.trim(),
          emotion: chosenEmotion,
          source: "gemini",
        };
      }
    }
  } catch (err) {
    console.warn("[StandinSpeech] Server fetch failed, employing rich local fallback:", err);
  }

  // Graceful fallback with rich emotion
  const fallback = generateFallbackStandinSpeech(params);
  return {
    ok: true,
    script: fallback,
    emotion: chosenEmotion,
    source: "fallback",
  };
}
