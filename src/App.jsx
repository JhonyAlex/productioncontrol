import React, { useEffect, useState } from 'react';
import { processDataDates } from './services/dataService';
import { fetchData } from './services/apiService';

const App = () => {
  const [appData, setAppData] = useState([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      const data = await fetchData();

      // If data isn't already processed in fetchData
      const processedData = processDataDates(data);

      // Set state or dispatch action with processedData
      setAppData(processedData);
    };

    fetchInitialData();
  }, []);

  return (
    <div>
      {/* Render your app data */}
      {appData.map((item, index) => (
        <div key={index}>{item}</div>
      ))}
    </div>
  );
};

export default App;