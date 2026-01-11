import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api';

async function fetcher(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    credentials: 'include',
    ...options,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Dashboard
export function useEmployeePerformance() {
  return useQuery(['employee-performance'], () => fetcher('/analytics/employee-performance'));
}
export function useCompanySales() {
  return useQuery(['company-sales'], () => fetcher('/analytics/company-sales'));
}
export function useRecentVouchers() {
  return useQuery(['recent-vouchers'], () => fetcher('/vouchers?limit=10'));
}

// Upload
export function useUploadMutation() {
  const queryClient = useQueryClient();
  return useMutation(
    (formData) => fetcher('/uploads', { method: 'POST', body: formData }),
    {
      onSuccess: () => queryClient.invalidateQueries(['uploads']),
    }
  );
}
export function useUploadStatus(uploadId) {
  return useQuery(['upload-status', uploadId], () => fetcher(`/uploads/${uploadId}/status`), {
    enabled: !!uploadId,
    refetchInterval: 2000,
  });
}

// Employees
export function useEmployees() {
  return useQuery(['employees'], () => fetcher('/employees'));
}
export function useEmployee(id) {
  return useQuery(['employee', id], () => fetcher(`/employees/${id}`), { enabled: !!id });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation(
    (data) => fetcher('/employees', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data) 
    }),
    {
      onSuccess: () => queryClient.invalidateQueries(['employees']),
    }
  );
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation(
    ({ id, data }) => fetcher(`/employees/${id}`, { 
      method: 'PUT', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data) 
    }),
    {
      onSuccess: () => queryClient.invalidateQueries(['employees']),
    }
  );
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  return useMutation(
    (id) => fetcher(`/employees/${id}`, { method: 'DELETE' }),
    {
      onSuccess: () => queryClient.invalidateQueries(['employees']),
    }
  );
}

export function useMergeEmployee() {
  const queryClient = useQueryClient();
  return useMutation(
    ({ id, data }) => fetcher(`/employees/${id}/merge`, { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),
    {
      onSuccess: () => queryClient.invalidateQueries(['employees']),
    }
  );
}

// Vouchers
export function useVouchers(params = {}) {
  const queryString = Object.keys(params).length > 0 
    ? '?' + new URLSearchParams(params).toString() 
    : '';
  return useQuery(['vouchers', params], () => fetcher(`/vouchers${queryString}`));
}
export function useVoucher(id) {
  return useQuery(['voucher', id], () => fetcher(`/vouchers/${id}`), { enabled: !!id });
}
export function useVoucherItems(id) {
  return useQuery(['voucher-items', id], () => fetcher(`/vouchers/${id}/items`), { enabled: !!id });
}

// Credit Notes
export function useCreditNotes(params = {}) {
  const queryString = Object.keys(params).length > 0 
    ? '?' + new URLSearchParams(params).toString() 
    : '';
  return useQuery(['creditnotes', params], () => fetcher(`/creditnotes${queryString}`));
}
export function useCreditNote(id) {
  return useQuery(['creditnote', id], () => fetcher(`/creditnotes/${id}`), { enabled: !!id });
}

// Analytics
export function useAnalyticsEmployeePerformance() {
  return useQuery(['analytics-employee-performance'], () => fetcher('/analytics/employee-performance'));
}
export function useAnalyticsCompanySales() {
  return useQuery(['analytics-company-sales'], () => fetcher('/analytics/company-sales'));
}

// Admin
export function useUploads() {
  return useQuery(['uploads'], () => fetcher('/uploads'));
}

// Designations
export function useDesignations() {
  return useQuery(['designations'], () => fetcher('/designations'));
}

export function useDesignation(id) {
  return useQuery(['designation', id], () => fetcher(`/designations/${id}`), { enabled: !!id });
}

export function useDesignationHierarchy() {
  return useQuery(['designation-hierarchy'], () => fetcher('/designations/hierarchy'));
}

export function useCreateDesignation() {
  const queryClient = useQueryClient();
  return useMutation(
    (data) => fetcher('/designations', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data) 
    }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['designations']);
        queryClient.invalidateQueries(['designation-hierarchy']);
      },
    }
  );
}

export function useUpdateDesignation() {
  const queryClient = useQueryClient();
  return useMutation(
    ({ id, data }) => fetcher(`/designations/${id}`, { 
      method: 'PUT', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data) 
    }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['designations']);
        queryClient.invalidateQueries(['designation-hierarchy']);
      },
    }
  );
}

export function useDeleteDesignation() {
  const queryClient = useQueryClient();
  return useMutation(
    (id) => fetcher(`/designations/${id}`, { method: 'DELETE' }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['designations']);
        queryClient.invalidateQueries(['designation-hierarchy']);
      },
    }
  );
}
