/**
 * Runtime configuration.
 * EXPO_PUBLIC_API_URL is baked in at build time; the default keeps development
 * and preview builds working without an .env file.
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://sway-api.getfixyes.workers.dev';
