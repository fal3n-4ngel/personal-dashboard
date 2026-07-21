// Maps common subscription name patterns to their logo.dev domain, so the
// subscriptions tab can show a real brand icon without the user picking one.
const SUB_LOGO_MAP: [RegExp, string][] = [
  [/netflix/i, "netflix.com"],
  [/spotify/i, "spotify.com"],
  [/youtube|yt\s*premium/i, "youtube.com"],
  [/amazon\s*prime|prime\s*video/i, "amazon.com"],
  [/hotstar|disney\+?\s*hotstar/i, "hotstar.com"],
  [/disney\+?/i, "disneyplus.com"],
  [/apple\s*tv/i, "tv.apple.com"],
  [/apple\s*music/i, "music.apple.com"],
  [/icloud/i, "icloud.com"],
  [/apple/i, "apple.com"],
  [/hbo\s*max|^max$/i, "max.com"],
  [/hulu/i, "hulu.com"],
  [/paramount\+?/i, "paramountplus.com"],
  [/peacock/i, "peacocktv.com"],
  [/mubi/i, "mubi.com"],
  [/crunchyroll/i, "crunchyroll.com"],
  [/sonyliv|sony\s*liv/i, "sonyliv.com"],
  [/zee5/i, "zee5.com"],
  [/jiocinema|jio\s*cinema/i, "jiocinema.com"],
  [/microsoft\s*365|office\s*365|m365/i, "microsoft.com"],
  [/xbox/i, "xbox.com"],
  [/playstation|ps\s*plus|psn/i, "playstation.com"],
  [/nintendo/i, "nintendo.com"],
  [/adobe/i, "adobe.com"],
  [/figma/i, "figma.com"],
  [/notion/i, "notion.so"],
  [/slack/i, "slack.com"],
  [/zoom/i, "zoom.us"],
  [/dropbox/i, "dropbox.com"],
  [/google\s*one/i, "one.google.com"],
  [/google\s*workspace/i, "workspace.google.com"],
  [/github/i, "github.com"],
  [/linear/i, "linear.app"],
  [/openai|chatgpt/i, "openai.com"],
  [/claude|anthropic/i, "anthropic.com"],
  [/1password/i, "1password.com"],
  [/lastpass/i, "lastpass.com"],
  [/nordvpn/i, "nordvpn.com"],
  [/expressvpn/i, "expressvpn.com"],
  [/canva/i, "canva.com"],
  [/audible/i, "audible.com"],
  [/medium/i, "medium.com"],
  [/substack/i, "substack.com"],
  [/duolingo/i, "duolingo.com"],
  [/linkedin/i, "linkedin.com"],
  [/coursera/i, "coursera.org"],
  [/udemy/i, "udemy.com"],
  [/tidal/i, "tidal.com"],
  [/deezer/i, "deezer.com"],
  [/soundcloud/i, "soundcloud.com"],
  [/twitch/i, "twitch.tv"],
  [/discord/i, "discord.com"],
  [/setapp/i, "setapp.com"],
  [/grammarly/i, "grammarly.com"],
  [/bitwarden/i, "bitwarden.com"],
  [/vercel/i, "vercel.com"],
  [/netlify/i, "netlify.com"],
  [/supabase/i, "supabase.com"],
  [/raycast/i, "raycast.com"],
];

const LOGO_DEV_TOKEN = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN || "pk_abFC_FBeQnCIIvPXLpp7JA";

export function getSubLogoUrl(name: string): string | null {
  for (const [pattern, domain] of SUB_LOGO_MAP) {
    if (pattern.test(name)) {
      return `https://img.logo.dev/${domain}?token=${LOGO_DEV_TOKEN}&size=40&format=png`;
    }
  }
  return null;
}
