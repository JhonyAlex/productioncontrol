import { formatDateShort } from '../utils/dateUtils';

// Action to fetch items
export const fetchItems = () => async (dispatch) => {
  try {
    const response = await fetch('/api/items');
    const data = await response.json();

    // Before dispatching the data to the store, format the dates
    const formattedData = data.map(item => ({
      ...item,
      date: formatDateShort(item.date)
    }));

    dispatch({ type: 'SET_ITEMS', payload: formattedData });
  } catch (error) {
    console.error('Error fetching items:', error);
    dispatch({ type: 'FETCH_ITEMS_ERROR', payload: error });
  }
};