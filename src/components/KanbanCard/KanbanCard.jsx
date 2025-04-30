import React from 'react';
import './KanbanCard.css';
import { formatDateCustom } from '../../utils/dateUtils';

const KanbanCard = ({ production }) => {
  return (
    <div className="kanban-card">
      <div className="title">{production.title}</div>
      <div className="date small-text">{formatDateCustom(production.date)}</div>
      <div className="description">{production.description}</div>
    </div>
  );
};

export default KanbanCard;