export interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Đang tải dữ liệu...' }: LoadingStateProps) {
  return (
    <div className="state-container loading-state" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}
