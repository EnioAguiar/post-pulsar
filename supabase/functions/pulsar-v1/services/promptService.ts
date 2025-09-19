export interface PromptContext {
  contentLanguage: string;
  hashtagLanguage: string;
  title: string;
  cleanedText: string;
}

const networkProfiles: Record<
  string,
  { name: string; tone: string; hashtags: string }
> = {
  linkedin: {
    name: "LinkedIn",
    tone: "Professional and engaging. Start with a strong hook, develop in 2-4 short paragraphs, and end with a question.",
    hashtags: "3 to 5 relevant hashtags",
  },
  twitter: {
    name: "Twitter/X",
    tone: "Direct, short, and impactful. Start with a curiosity-generating hook.",
    hashtags: "2 to 3 relevant hashtags",
  },
  instagram: {
    name: "Instagram",
    tone: "Visual and appealing. The caption should complement an image. Use short paragraphs and line breaks.",
    hashtags: "5 to 10 relevant and popular hashtags",
  },
  threads: {
    name: "Threads",
    tone: "Conversational and informative, more casual than LinkedIn. Use short paragraphs and ask an open-ended question.",
    hashtags: "1 to 3 hashtags",
  },
  facebook: {
    name: "Facebook",
    tone: "Friendly and informative. Can be slightly longer and more detailed than Instagram. Use well-spaced paragraphs and end with a call to action or question.",
    hashtags: "2 to 4 relevant hashtags",
  },
  telegram: {
    name: "Telegram",
    tone: "Clear and direct. Can be a bit longer and more detailed. Use Markdown for formatting if needed.",
    hashtags: "no hashtags",
  },
  discord: {
    name: "Discord",
    tone: "Informal and engaging, suitable for a community announcement. Use Markdown for formatting.",
    hashtags: "no hashtags",
  },
};

export function createPrompt(
  network: string,
  charCount: number,
  context: PromptContext,
  customPrompt?: string,
): string {
  const profile = networkProfiles[network];
  if (!profile) {
    throw new Error(`Invalid network profile requested: ${network}`);
  }

  const { contentLanguage, hashtagLanguage, title, cleanedText } = context;

  const styleGuideline = customPrompt
    ? `**USER INSTRUCTION (MOST IMPORTANT):**\n---\n${customPrompt}\n---`
    : `**CONTENT GUIDELINES:**\n- **Tone of Voice:** ${profile.tone}`;

  const hashtagInstruction =
    profile.hashtags === "no hashtags"
      ? "DO NOT add any hashtags."
      : `After the post body, on a new line, you MUST add ${profile.hashtags}. The hashtags MUST be in **${hashtagLanguage}**.`;

  const prompt = `
    You are an expert social media copywriter. Your task is to adapt the provided article for a ${profile.name} post.

    **MANDATORY RULE: The final output (post + hashtags) MUST NOT exceed ${charCount} characters. This is a hard limit. Prioritize this rule over content completeness.**

    **TASK BREAKDOWN:**
    1.  **WRITE POST BODY:** Write the main body of the post in **${contentLanguage}**.
    2.  **HANDLE HASHTAGS:** ${hashtagInstruction}
    3.  **VERIFY LENGTH:** Ensure the total character count of your entire response is less than ${charCount}.

    **RESPONSE FORMATTING RULES:**
    - Your response must contain ONLY the generated post text (and hashtags if required).
    - Do not include introductions like "Here is the post:".
    - If hashtags are required, there must be a blank line between the post body and the hashtags.

    ${styleGuideline}

    **Original Article to use as a base:**
    ---
    Title: ${title}
    Content:
    ${cleanedText}
    ---

    Now, generate the post for ${profile.name} following all rules precisely.
  `;

  return prompt;
}
