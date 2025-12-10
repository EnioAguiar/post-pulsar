import { SupabaseClient } from "@supabase/supabase-js";

export interface UserProfile {
  id: string;
  monthly_pulses_remaining: number;
  weekly_transcriptions_remaining: number;
  plan_type: string;
  plan_expires_at?: string; // Optional, as it might not always be present or needed for all checks
  // Add other profile fields if they are consistently needed across the app
  default_linkedin_chars?: number;
  default_twitter_chars?: number;
  default_instagram_chars?: number;
  default_threads_chars?: number;
  default_facebook_chars?: number;
  default_discord_chars?: number;
  default_telegram_chars?: number;
  prefers_twitter_premium?: boolean;
  prefers_telegram_media_limit?: boolean;
}

class UserSession {
  private supabase: SupabaseClient | null = null;
  private profile: UserProfile | null = null;
  private userId: string | null = null;

  public init(supabaseClient: SupabaseClient, userId: string) {
    this.supabase = supabaseClient;
    this.userId = userId;
  }

  public async fetchUserProfile(): Promise<UserProfile | null> {
    if (!this.supabase || !this.userId) {
      console.error("UserSession not initialized.");
      return null;
    }

    if (this.profile) {
      return this.profile; // Return cached profile if available
    }

    const { data, error } = await this.supabase
      .from("profiles")
      .select(
        "id, monthly_pulses_remaining, weekly_transcriptions_remaining, plan_type, plan_expires_at, default_linkedin_chars, default_twitter_chars, default_instagram_chars, default_threads_chars, default_facebook_chars, default_discord_chars, default_telegram_chars, prefers_twitter_premium, prefers_telegram_media_limit",
      )
      .eq("id", this.userId)
      .single<UserProfile>();

    if (error) {
      console.error("Error fetching user profile:", error);
      this.profile = null;
      return null;
    }

    // Clean plan_type from potential extra quotes as per lesson #15
    data.plan_type = (data.plan_type || "free").replace(/'/g, "");
    this.profile = data;
    return this.profile;
  }

  public async refreshUserProfile(): Promise<UserProfile | null> {
    this.profile = null; // Clear cache
    return this.fetchUserProfile();
  }

  public getProfile(): UserProfile | null {
    return this.profile;
  }

  public getPlanType(): string {
    return this.profile?.plan_type || "free";
  }

  public isFree(): boolean {
    return this.getPlanType() === "free";
  }

  public isClassic(): boolean {
    return this.getPlanType() === "classic";
  }

  public isPro(): boolean {
    return this.getPlanType() === "pro";
  }

  public getMonthlyPulsesRemaining(): number {
    return this.profile?.monthly_pulses_remaining || 0;
  }

  public getWeeklyTranscriptionsRemaining(): number {
    return this.profile?.weekly_transcriptions_remaining || 0;
  }

  // Helper for char counts
  public getDefaultCharCount(network: string): number | undefined {
    if (!this.profile) return undefined;
    switch (network) {
      case "linkedin":
        return this.profile.default_linkedin_chars;
      case "twitter":
        return this.profile.default_twitter_chars;
      case "instagram":
        return this.profile.default_instagram_chars;
      case "threads":
        return this.profile.default_threads_chars;
      case "facebook":
        return this.profile.default_facebook_chars;
      case "discord":
        return this.profile.default_discord_chars;
      case "telegram":
        return this.profile.default_telegram_chars;
      default:
        return undefined;
    }
  }

  public prefersTwitterPremium(): boolean {
    return this.profile?.prefers_twitter_premium || false;
  }

  public prefersTelegramMediaLimit(): boolean {
    return this.profile?.prefers_telegram_media_limit || false;
  }
}

export const userSession = new UserSession();
