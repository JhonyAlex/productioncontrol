/**
 * Format a date string from ISO format (2025-04-16T13:49) to custom format (16/04/25 13:49)
 * @param {string} dateString - The ISO format date string
 * @returns {string} - Formatted date string
 */
export function formatDateCustom(dateString) {
  if (!dateString || typeof dateString !== 'string') return '';
  
  const match = dateString.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return dateString;
  
  const [_, year, month, day, hours, minutes] = match;
  return `${day}/${month}/${year.slice(2)} ${hours}:${minutes}`;
}

/**
 * Format a date string from ISO format (2025-04-16T13:49) to short date format (16/04/25)
 * @param {string} dateString - The ISO format date string
 * @returns {string} - Formatted date string
 */
export function formatShortDate(dateString) {
  if (!dateString || typeof dateString !== 'string') return '';
  
  const match = dateString.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return dateString;
  
  const [_, year, month, day] = match;
  return `${day}/${month}/${year.slice(2)}`;
}