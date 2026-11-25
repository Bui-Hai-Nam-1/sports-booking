import { api } from '../../lib/api';
import type { Complaint, ComplaintFormData, ComplaintStatus, PaginatedResponse } from '../../types';

export interface ComplaintQueryParams {
  page?: number;
  pageSize?: number;
  status?: ComplaintStatus;
}

export async function createBookingComplaint(
  bookingId: string,
  data: ComplaintFormData,
): Promise<Complaint> {
  const res = await api.post('/complaints', {
    bookingId,
    subject: data.subject,
    description: data.description,
  });
  return res.data;
}

export async function fetchMyComplaints(
  params: ComplaintQueryParams,
): Promise<PaginatedResponse<Complaint>> {
  const res = await api.get('/complaints/me', { params });
  return res.data;
}

export async function fetchComplaintDetail(id: string): Promise<Complaint> {
  const res = await api.get(`/complaints/${id}`);
  return res.data;
}

export async function fetchAdminComplaints(
  params: ComplaintQueryParams,
): Promise<PaginatedResponse<Complaint>> {
  const res = await api.get('/admin/complaints', { params });
  return res.data;
}

export async function updateComplaintStatus(
  id: string,
  data: { status: ComplaintStatus; resolution?: string },
): Promise<Complaint> {
  const res = await api.patch(`/admin/complaints/${id}/status`, data);
  return res.data;
}
