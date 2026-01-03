import { IReturnList } from '@/types/backend/common';
import { IPaymentReport } from '@/types/backend/payment';
import type { AxiosResponse } from 'axios';
import { httpAuth } from './http';

const data = <T>(p: Promise<AxiosResponse<T>>) => p.then((r) => r.data);

export interface PaymentReportFilterParams {
  customer_code_start?: string;
  customer_code_end?: string;
  posting_date_start?: string;
  posting_date_end?: string;
  document_number_start?: string;
  document_number_end?: string;
  bill_collector_start?: string;
  bill_collector_end?: string;
  team_start?: string;
  team_end?: string;
}

export const paymentReportApi = {
  getPaymentReportByFilter: (params: PaymentReportFilterParams = {}) =>
    data(
      httpAuth.get<IReturnList<IPaymentReport>>(
        '/api/ViewPaymentReport/Description/Search/ViewPaymentReport',
        { params },
      ),
    ),
};
