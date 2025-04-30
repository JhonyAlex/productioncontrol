import React from 'react';
import { formatDateCustom } from '../../utils/dateUtils';

const isDateFormat = (text) => {
  return typeof text === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text);
};

const Table = ({ columns, data }) => {
  return (
    <table>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key}>{column.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {columns.map((column) => (
              <td key={column.key}>
                {isDateFormat(row[column.key]) ? formatDateCustom(row[column.key]) : row[column.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default Table;