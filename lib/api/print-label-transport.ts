import type { AxiosResponse } from 'axios';
import { http } from './http';
import type {
  ID,
  IReturnList,
  IReturnMessage,
  IReturnObject,
} from '@/types/backend/common';
import type { IPrintLabelTransport } from '@/types/backend/print-label-transport';

const data = <T>(p: Promise<AxiosResponse<T>>) => p.then((r) => r.data);

export const printLabelTransportApi = {
  searchByShippingDate: (start?: string, end?: string) =>
    data(
      http.get<IReturnList<IPrintLabelTransport>>(
        '/api/PrintLabelTransport/Description/Search/ShippingDate',
        { params: { start, end } },
      ),
    ),
  searchByShippingDateNoTruck: (start?: string, end?: string) =>
    data(
      http.get<IReturnList<IPrintLabelTransport>>(
        '/api/PrintLabelTransport/Description/Search/ShippingDateNoTruck',
        { params: { start, end } },
      ),
    ),
  searchReportStatusShipping: (
    start?: string,
    end?: string,
    tran_no_start?: string,
    tran_no_end?: string,
  ) =>
    data(
      http.get<IReturnList<IPrintLabelTransport>>(
        '/api/PrintLabelTransport/Description/Search/ReportStatusShipping',
        { params: { start, end, tran_no_start, tran_no_end } },
      ),
    ),
  getAll: () =>
    data(http.get<IReturnList<IPrintLabelTransport>>('/api/printlabeltransport')),
  getById: (id: ID) =>
    data(
      http.get<IReturnObject<IPrintLabelTransport>>(
        `/api/printlabeltransport/${id}`,
      ),
    ),
  getByBillDoc: (Billing_Doc: string) =>
    data(
      http.get<IReturnObject<IPrintLabelTransport>>(
        'api/PrintLabelTransport/Description/Search/BillingDoc',
        { params: { Billing_Doc } },
      ),
    ),
  create: (payload: IPrintLabelTransport) =>
    data(
      http.post<IReturnObject<IPrintLabelTransport>>(
        '/api/printlabeltransport',
        payload,
      ),
    ),
  update: (payload: IPrintLabelTransport) =>
    data(
      http.put<IReturnObject<IPrintLabelTransport>>(
        '/api/printlabeltransport',
        payload,
      ),
    ),
  remove: (id: ID) =>
    data(http.delete<IReturnMessage>(`/api/printlabeltransport/${id}`)),
};
