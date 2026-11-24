import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { useMutation } from '../../hooks/useMutation';
import { createBookingComplaint } from './api';
import type { Complaint, ComplaintFormData } from '../../types';

export interface ComplaintFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  courtName: string;
  onSuccess: (complaint: Complaint) => void;
}

export function ComplaintFormModal({
  isOpen,
  onClose,
  bookingId,
  courtName,
  onSuccess,
}: ComplaintFormModalProps) {
  const [subject, setSubject] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const { mutate, isPending, error, reset } = useMutation<Complaint, ComplaintFormData>({
    mutationFn: (data) => createBookingComplaint(bookingId, data),
    onSuccess: (complaint) => {
      onSuccess(complaint);
      handleClose();
    },
  });

  function handleClose() {
    setSubject('');
    setDescription('');
    setValidationError(null);
    reset();
    onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);

    const trimmedSubject = subject.trim();
    const trimmedDesc = description.trim();

    if (trimmedSubject.length < 3) {
      setValidationError('Tiêu đề khiếu nại phải có ít nhất 3 ký tự');
      return;
    }
    if (trimmedDesc.length < 10) {
      setValidationError('Nội dung chi tiết phải có ít nhất 10 ký tự');
      return;
    }

    mutate({ subject: trimmedSubject, description: trimmedDesc });
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Khiếu nại đơn đặt: ${courtName}`}
      footer={
        <div className="modal-actions">
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Hủy
          </Button>
          <Button variant="danger" onClick={handleSubmit} loading={isPending}>
            Gửi khiếu nại
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
          <label htmlFor="complaint-subject" className="form-label">
            Tiêu đề khiếu nại <span className="text-danger">*</span>
          </label>
          <input
            id="complaint-subject"
            type="text"
            className="form-input"
            maxLength={150}
            placeholder="Ví dụ: Sân bị ngập nước, thái độ nhân viên..."
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="complaint-desc" className="form-label">
            Mô tả chi tiết sự việc <span className="text-danger">*</span>
          </label>
          <textarea
            id="complaint-desc"
            className="form-textarea"
            rows={5}
            maxLength={3000}
            placeholder="Mô tả cụ thể thời gian, vấn đề gặp phải và đề xuất mong muốn..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
          <div className="form-helper">{description.length} / 3000 ký tự (tối thiểu 10 ký tự)</div>
        </div>
      </form>
    </Modal>
  );
}
