// Sharing helpers: build the public URL and one-tap social share intents.
// Keeping share friction near zero is the main lever on the viral coefficient.

export function shareUrl(roadmapId: string): string {
  return `${window.location.origin}/?r=${encodeURIComponent(roadmapId)}`;
}

export interface SocialTarget {
  name: string;
  href: (url: string, text: string) => string;
}

export const SOCIALS: SocialTarget[] = [
  {
    name: "WhatsApp",
    href: (url, text) => `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
  },
  {
    name: "X",
    href: (url, text) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  },
  {
    name: "LinkedIn",
    href: (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    name: "Reddit",
    href: (url, text) =>
      `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`,
  },
];

export function shareText(title: string): string {
  return `I'm learning ${title} with a free AI roadmap on OpenPath. Make your own for any topic:`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Use the native share sheet on mobile when available (huge for share rate). */
export async function nativeShare(url: string, title: string, text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && (navigator as any).share) {
    try {
      await (navigator as any).share({ title, text, url });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
