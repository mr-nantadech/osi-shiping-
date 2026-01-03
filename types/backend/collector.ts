import type { ID } from './common';

export interface ICollector {
  id: ID;
  billing_document?: string | null;
  billing_date?: string | null;
  ship_to?: string | null;
  ship_to_description?: string | null;
  transport_by?: string | null;
  sales_district?: string | null;
  sales_district_description?: string | null;
  sales_employee_code?: string | null;
  sales_employee_name?: string | null;
  collector_code?: string | null;
  collector_name?: string | null;
  request_bill_status?: string | null;
  return_bill_status?: string | null;
  update_by?: string | null;
  update_at?: string | null;
}
