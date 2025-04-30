import React from 'react';
import { formatShortDate, soloFecha } from '../../utils/dateUtils';

const MainTableComponent = ({ data }) => {
  const formatCellContent = (content) => {
    if (typeof content === 'string' && content.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)) {
      return formatShortDate(content);
    }
    return content;
  };

  return (
    <table>
      <thead>
        <tr>
          {data.headers.map((header, index) => (
            <th key={index}>{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.rows.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {data.headers.map((col, cellIndex) => (
              <td key={cellIndex}>
                {col.key === 'fecha' ? soloFecha(row[col.key]) : row[col.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default MainTableComponent;