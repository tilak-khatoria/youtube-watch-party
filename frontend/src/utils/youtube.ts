/**
 * Extracts an 11-character YouTube video ID from various URL formats
 * (standard watch, youtu.be, embed, shorts, or raw ID)
 */
export function extractYouTubeVideoId(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();

  // If directly an 11-character ID (standard YouTube ID length)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Regex supporting:
  // - https://www.youtube.com/watch?v=VIDEO_ID
  // - https://m.youtube.com/watch?v=VIDEO_ID
  // - https://youtu.be/VIDEO_ID
  // - https://www.youtube.com/embed/VIDEO_ID
  // - https://www.youtube.com/v/VIDEO_ID
  // - https://www.youtube.com/shorts/VIDEO_ID
  const patterns = [
    /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.|m\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1] && match[1].length === 11) {
      return match[1];
    }
    if (match && match[2] && match[2].length === 11) {
      return match[2];
    }
  }

  return null;
}

/**
 * Normalizes room code prefixes cleanly so both '13m4x1' and 'party-13m4x1'
 * resolve to the exact same canonical room ID ('party-13m4x1').
 */
export function normalizeRoomId(input: string | undefined | null): string {
  if (!input || typeof input !== 'string') return '';
  const trimmed = input.trim().toLowerCase();
  // Strip any leading path if a full URL was pasted
  const code = trimmed.includes('/') ? trimmed.split('/').pop() || trimmed : trimmed;
  // Strip query parameters or hash
  const cleanCode = code.split('?')[0]?.split('#')[0] || code;
  // If starts with 'party-', strip it to find the base ID, then always format as 'party-[baseId]'
  const baseId = cleanCode.startsWith('party-') ? cleanCode.slice(6) : cleanCode;
  return `party-${baseId}`;
}
