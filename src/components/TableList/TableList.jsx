import React from 'react';
import { formatShortDate } from '../../utils/dateUtils';

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
            {row.map((cell, cellIndex) => (
              <td key={cellIndex}>{formatCellContent(cell.value)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default MainTableComponent;