import React from 'react';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  title = 'Không có dữ liệu',
  description = 'Hiện chưa có mục nào để hiển thị trong danh sách này.',
  action,
}: EmptyStateProps) {
  return (
    <div className="state-container empty-state">
      <div className="empty-icon" aria-hidden="true">📭</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}
