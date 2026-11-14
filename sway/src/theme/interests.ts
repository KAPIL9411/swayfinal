export const INTERESTS = [
  'Music',
  'Movies',
  'Coding',
  'Sports',
  'Gaming',
  'Art',
  'Reading',
  'Travel',
  'Food',
  'Fitness',
  'Photography',
  'Anime',
  'Startups',
  'Fashion',
  'Dance',
  'Comedy',
  'Debate',
  'Volunteering',
  'Astronomy',
  'Cooking',
] as const;

export const AVATARS = [
  { key: 'otter', emoji: '🦦', label: 'Otter' },
  { key: 'panda', emoji: '🐼', label: 'Panda' },
  { key: 'fox', emoji: '🦊', label: 'Fox' },
  { key: 'owl', emoji: '🦉', label: 'Owl' },
  { key: 'koala', emoji: '🐨', label: 'Koala' },
  { key: 'tiger', emoji: '🐯', label: 'Tiger' },
  { key: 'lynx', emoji: '🐱', label: 'Lynx' },
  { key: 'gecko', emoji: '🦎', label: 'Gecko' },
  { key: 'falcon', emoji: '🦅', label: 'Falcon' },
  { key: 'llama', emoji: '🦙', label: 'Llama' },
  { key: 'unicorn', emoji: '🦄', label: 'Unicorn' },
  { key: 'butterfly', emoji: '🦋', label: 'Butterfly' },
] as const;

export const CATEGORIES = [
  { key: 'confession', label: 'Confession', emoji: '🤫' },
  { key: 'question', label: 'Question', emoji: '❓' },
  { key: 'opinion', label: 'Opinion', emoji: '💭' },
  { key: 'event', label: 'Event', emoji: '📅' },
  { key: 'meme', label: 'Meme', emoji: '😂' },
  { key: 'lost_found', label: 'Lost & Found', emoji: '🔍' },
] as const;

export const REACTIONS = [
  { key: 'fire', emoji: '🔥' },
  { key: 'heart', emoji: '❤️' },
  { key: 'laugh', emoji: '😂' },
  { key: 'wow', emoji: '😮' },
  { key: 'sad', emoji: '😢' },
] as const;

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Math.max(0, Date.now() - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString();
}
