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

/**
 * Remove time portion from ISO date string and format to DD/MM/YY
 * @param {string} dateString - ISO format date string like "2025-04-16T13:49"
 * @returns {string} - Short date format "16/04/25"
 */
export function formatDateShort(dateString) {
  if (!dateString) return '';
  
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return dateString;
  
  const [_, year, month, day] = match;
  return `${day}/${month}/${year.substring(2)}`;
}

/**
 * Format date removing time portion - converts "YYYY-MM-DDThh:mm" to "DD/MM/YY"
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date without time
 */
export function formatDateNoTime(dateString) {
  if (!dateString || typeof dateString !== 'string') return '';
  
  // Extract date part only (ignore time)
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return dateString;
  
  const [_, year, month, day] = match;
  return `${day}/${month}/${year.substring(2)}`;
}

/**
 * Format any content, checking if it's a date string
 * @param {any} content - Content to format
 * @returns {any} Formatted content if date, original otherwise
 */
export function formatAnyContent(content) {
  if (typeof content === 'string' && content.match(/^\d{4}-\d{2}-\d{2}T/)) {
    return formatDateNoTime(content);
  }
  return content;
}

/**
 * Format date to DD/MM/YY, supporting both "YYYY-MM-DDThh:mm" and "YYYY-MM-DD"
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
export function soloFecha(dateString) {
  if (!dateString) return '';
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return dateString;
  const [_, y, m, d] = match;
  return `${d}/${m}/${y.slice(2)}`;
}