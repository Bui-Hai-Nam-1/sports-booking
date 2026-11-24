import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { RatingStars } from '../../components/common/RatingStars';
import { useMutation } from '../../hooks/useMutation';
import { createBookingReview } from './api';
import type { Review, ReviewFormData } from '../../types';

export interface ReviewFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  courtName: string;
  onSuccess: (review: Review) => void;
}

export function ReviewFormModal({
  isOpen,
  onClose,
  bookingId,
  courtName,
  onSuccess,
}: ReviewFormModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const { mutate, isPending, error, reset } = useMutation<Review, ReviewFormData>({
    mutationFn: (data) => createBookingReview(bookingId, data),
    onSuccess: (review) => {
      onSuccess(review);
      handleClose();
    },
  });

  function handleClose() {
    setRating(5);
    setComment('');
    setValidationError(null);
    reset();
    onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);

    if (rating < 1 || rating > 5) {
      setValidationError('Vui lòng chọn số sao từ 1 đến 5');
      return;
    }
    if (comment.length > 2000) {
      setValidationError('Nhận xét không được vượt quá 2000 ký tự');
      return;
    }

    mutate({ rating, comment: comment.trim() });
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Đánh giá sân: ${courtName}`}
      footer={
        <div className="modal-actions">
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Hủy bỏ
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={isPending}>
            Gửi đánh giá
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="form-layout">
        {(validationError || error) && (
          <div className="alert alert-danger" role="alert">
            {validationError || error}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Chất lượng sân (Số sao)</label>
          <RatingStars value={rating} onChange={setRating} size="lg" />
        </div>

        <div className="form-group">
          <label htmlFor="review-comment" className="form-label">
            Nhận xét chi tiết (Tùy chọn)
          </label>
          <textarea
            id="review-comment"
            className="form-textarea"
            rows={4}
            maxLength={2000}
            placeholder="Chia sẻ trải nghiệm của bạn về mặt sân, ánh sáng, dịch vụ..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="form-helper">{comment.length} / 2000 ký tự</div>
        </div>
      </form>
    </Modal>
  );
}
