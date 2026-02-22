/** uid -- Unique ID generation and timestamp helpers */

export function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
export const nowISO = () => new Date().toISOString();
