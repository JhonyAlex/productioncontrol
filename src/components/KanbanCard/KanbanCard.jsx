import React from 'react';
import './KanbanCard.css';
import { formatDateCustom } from '../../utils/dateUtils';

const KanbanCard = ({ production }) => {
  const formatDateText = (text) => {
    const dateMatch = text.match(/\((\d{4}-\d{2}-\d{2}T\d{2}:\d{2})\)/);
    if (dateMatch && dateMatch[1]) {
      const formattedDate = formatDateCustom(dateMatch[1]);
      return text.replace(dateMatch[1], formattedDate);
    }
    return formatDateCustom(text);
  };

  const headerContent = `${production.id} (${formatDateCustom(production.date)})`;

  return (
    <div className="kanban-card">
      <div className="title">{production.title}</div>
      <div style={{ fontWeight: 'bold', fontSize: '0.95em', marginBottom: '0.2em' }}>
        {headerContent}
      </div>
      <div className="description">{production.description}</div>
    </div>
  );
};

export default KanbanCard;