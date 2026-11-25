export interface RatingStarsProps {
  value: number;
  onChange?: (val: number) => void;
  readOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function RatingStars({
  value,
  onChange,
  readOnly = false,
  size = 'md',
}: RatingStarsProps) {
  const stars = [1, 2, 3, 4, 5];

  return (
    <div
      className={`rating-stars stars-${size} ${readOnly ? 'read-only' : 'interactive'}`}
      role={readOnly ? 'img' : 'radiogroup'}
      aria-label={`Đánh giá: ${value} trên 5 sao`}
    >
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => onChange && onChange(star)}
          className={`star-btn ${star <= value ? 'filled' : 'empty'}`}
          aria-label={`${star} sao`}
        >
          ★
        </button>
      ))}
      <span className="rating-value-label">{value > 0 ? `${value}/5` : 'Chưa chọn'}</span>
    </div>
  );
}
