export interface IIncome {
  id: number;
  billing_type?: string | null;
  billing_document?: string | null;
  customer_code?: string | null;
  customer_group?: string | null;
  customer_name?: string | null;
  city?: string | null;
  invoice_doc_no?: string | null;
  invoice_date?: Date | null;
  salesman_code?: string | null;
  incoming_doc_no?: string | null;
  incoming_date?: Date | null;
  days?: number | null;
  sales_employee_code?: string | null;
  sales_employee_name?: string | null;
  team_sales?: string | null;
  amount?: number | null;
  manual_keyin?: string | null;
  payment_method?: string | null;
  posting_date?: Date | null;
  bank_key_name?: string | null;
  bank_branch?: string | null;
  cheque_no?: string | null;
  cheque_posting_date?: Date | null;
  cheque_amount?: number | null;
}