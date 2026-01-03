export interface IPaymentReport {
  customer_code?: string | null;
  customer_class?: string | null;
  customer_name?: string | null;
  province?: string | null;
  ref_invoice_details?: string | null;
  ref_invoice_date?: string | null; // datetime
  salesman_code?: string | null;
  received_record_no?: string | null;
  received_record_date?: string | null; // datetime
  days?: number | null;
  bill_collector: string; // NOT NULL
  team?: string | null;
  net_received?: number | null; // decimal(18,2)
  deduction_description?: string | null;
  payment_method?: string | null;
  posting_date?: string | null; // datetime
  bank_key_name?: string | null;
  bank_branch?: string | null;
  cheque_no?: string | null;
  cheque_posting_date?: string | null; // datetime
  amount?: number | null; // decimal(18,2)
}
