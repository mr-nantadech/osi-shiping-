import type { ID } from './common';

export interface IMasCollector {
  id: ID;
  sales_employee_code: string; // Required field
  sales_employee_name?: string | null; // Optional field
  collector_code?: string | null; // Optional field
  collector_name?: string | null; // Optional field
}
