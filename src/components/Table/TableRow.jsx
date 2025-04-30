import React from 'react';
import { formatDateCustom } from '../../utils/dateUtils';

const TableRow = ({ rowData }) => {
  const renderCellContent = (content) => {
    if (typeof content === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(content)) {
      return formatDateCustom(content);
    }
    return content;
  };

  return (
    <tr>
      {rowData.map((cellData, index) => (
        <td key={index}>{renderCellContent(cellData)}</td>
      ))}
    </tr>
  );
};

export default TableRow;