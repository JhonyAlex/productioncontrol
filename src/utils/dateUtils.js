/**
 * Format a date string from ISO format (2025-04-16T13:49) to custom format (16/04/25 13:49)
 * @param {string} dateString - The ISO format date string
 * @returns {string} - Formatted date string
 */
export function formatDateCustom(dateString) {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(2); // Get last 2 digits
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
}