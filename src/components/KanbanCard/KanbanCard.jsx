import React from 'react';
import './KanbanCard.css';
import { formatDateCustom, formatShortDate, formatDateNoTime, soloFecha } from '../../utils/dateUtils';

const KanbanCard = ({ production }) => {
  const formatDateText = (text) => {
    const dateMatch = text.match(/\((\d{4}-\d{2}-\d{2}T\d{2}:\d{2})\)/);
    if (dateMatch && dateMatch[1]) {
      const formattedDate = formatDateCustom(dateMatch[1]);
      return text.replace(dateMatch[1], formattedDate);
    }
    return formatDateCustom(text);
  };

  const formatHeaderText = (text) => {
    const regex = /(\d+) \((\d{4}-\d{2}-\d{2}T\d{2}:\d{2})\)/;
    const match = text.match(regex);
    
    if (match) {
      const id = match[1];
      const date = formatDateCustom(match[2]);
      return `${id} (${date})`;
    }
    return text;
  };

  const formatCardTitle = (text) => {
    if (!text || typeof text !== 'string') return text;
    
    // Match pattern like "2500911 (2025-04-30T10:32)"
    return text.replace(/(\d+) \((\d{4}-\d{2}-\d{2})T\d{2}:\d{2}\)/, (match, id, date) => {
      return `${id} (${formatDateNoTime(date)})`;
    });
  };

  const mostrarIdYFecha = (texto) => {
    const match = texto.match(/^(\d+)\s+\((\d{4}-\d{2}-\d{2}T\d{2}:\d{2})\)$/);
    if (match) {
      return `${match[1]} (${soloFecha(match[2])})`;
    }
    return texto;
  };

  const headerContent = `${production.id} (${production.date})`;

  return (
    <div className="kanban-card">
      <div className="title">{production.title}</div>
      <div style={{ fontWeight: 'bold', fontSize: '0.95em', marginBottom: '0.2em' }}>
        {mostrarIdYFecha(`${production.id} (${production.date})`)}
      </div>
      <div className="description">{production.description}</div>
    </div>
  );
};

export default KanbanCard;