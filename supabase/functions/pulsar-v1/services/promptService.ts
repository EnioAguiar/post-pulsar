import type { PromptProfile } from "./prompts/types.ts";

export type PromptContext = {
  contentLanguage: string;
  hashtagLanguage: string;
  title: string;
  cleanedText: string;
};

export type Network =
  | "linkedin"
  | "twitter"
  | "instagram"
  | "threads"
  | "facebook"
  | "telegram"
  | "discord";

async function getNetworkProfile(network: Network): Promise<PromptProfile> {
  try {
    const profileModule = await import(`./prompts/${network}.ts`);
    // The profile object is named e.g., 'linkedinProfile', 'twitterProfile'
    const profileKey = `${network}Profile`;
    if (profileModule && profileModule[profileKey]) {
      return profileModule[profileKey];
    }
  } catch (e) {
    console.error(`Error importing profile for ${network}:`, e.message);
  }
  // Fallback profile
  return {
    name: network,
    tone: "Create a compelling and engaging post based on the article's content.",
    hashtags: "a few relevant hashtags",
  };
}

export async function createPrompt(
  network: Network,
  charLimit: number,
  context: PromptContext,
  customPromptText?: string,
): Promise<string> {
  const { contentLanguage, hashtagLanguage, title, cleanedText } = context;

  const profile = await getNetworkProfile(network);

  const baseInstruction = `You are an expert social media manager. Your task is to create a post for ${profile.name} based on the provided article.`;

  const languageInstruction = `The post must be written in ${contentLanguage}. The hashtags must be in ${hashtagLanguage}.`;

  const charLimitInstruction =
    `The post must be under ${charLimit} characters. Do not exceed this limit under any circumstances.`;

  // Override logic: Use custom prompt if it exists, otherwise use the profile's default tone.
  const coreTaskInstruction = customPromptText
    ? `Follow this specific instruction: "${customPromptText}"`
    : profile.tone;

  const hashtagInstruction = `Include ${profile.hashtags}.`;

  const finalPrompt = `
${baseInstruction}

**Constraint Checklist:**
1. **Network:** ${profile.name}
2. **Character Limit:** ${charLimitInstruction}
3. **Language:** ${languageInstruction}
4. **Tone and Style:** ${coreTaskInstruction}
5. **Hashtags:** ${hashtagInstruction}

**Source Article:**
- **Title:** ${title}
- **Content:** ${cleanedText.substring(0, 20000)}

**Your Task:**
Read the source article and generate the post according to the constraint checklist.
The final output must be ONLY the post text, without any extra explanations, titles, or character counts.
`;

  return finalPrompt.trim();
}
