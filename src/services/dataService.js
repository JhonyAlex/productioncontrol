import { formatDateNoTime } from '../utils/dateUtils';

/**
 * Process data to format all date fields
 * @param {Object|Array} data - Data to process
 * @returns {Object|Array} Processed data with formatted dates
 */
export function processDataDates(data) {
  if (Array.isArray(data)) {
    return data.map(item => processDataDates(item));
  }
  
  if (data && typeof data === 'object') {
    const processed = {};
    for (const key in data) {
      if (typeof data[key] === 'string' && data[key].match(/^\d{4}-\d{2}-\d{2}T/)) {
        processed[key] = formatDateNoTime(data[key]);
      } else if (data[key] && typeof data[key] === 'object') {
        processed[key] = processDataDates(data[key]);
      } else {
        processed[key] = data[key];
      }
    }
    return processed;
  }
  
  return data;
}

/**
 * Fetch data from the given endpoint and process date fields
 * @param {string} endpoint - API endpoint to fetch data from
 * @returns {Promise<Object|Array>} Processed data with formatted dates
 */
export async function fetchData(endpoint) {
  const response = await fetch(endpoint);
  const data = await response.json();
  
  // Process all dates before returning
  return processDataDates(data);
}