import { formatDateShort } from '../utils/dateUtils';

// Find the function that processes the data before passing it to components
export function processData(data) {
  // Format dates in the data
  return data.map(item => ({
    ...item,
    date: formatDateShort(item.date)
  }));
}