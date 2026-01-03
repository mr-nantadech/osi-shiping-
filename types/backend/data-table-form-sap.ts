import type { ID } from './common';

export interface IDataTableFormSap {
  id: ID;
  billing_type?: string | null;
  billing_document?: string | null;
  billing_date?: string | null;
  sales_order?: string | null;
  sales_organization?: string | null;
  distribution_channel?: string | null;
  sold_to_code?: string | null;
  sold_to_name?: string | null;
  ship_to_code?: string | null;
  ship_to_name?: string | null;
  ship_to_address?: string | null;
  tambon?: string | null;
  district?: string | null;
  postal_code?: string | null;
  city?: string | null;
  telephone?: string | null;
  sales_district?: string | null;
  sales_district_description?: string | null;
  sales_employee_code?: string | null;
  sales_employee_name?: string | null;
  sales_employee_team?: string | null;
  sales_employee_team_code?: string | null;
  item_no?: string | null;
  material_code?: string | null;
  material_description?: string | null;
  material_group?: string | null;
  plant?: string | null;
  storage_location?: string | null;
  batch?: string | null;
  delivery_qty?: number | null;
  sales_unit?: string | null;
  manufacture_date?: string | null;
  sled_or_bbd?: string | null;
  update_by?: string | null;
  update_at?: string | null;
}

export interface IDataTableFormSapJoined extends IDataTableFormSap {
  transport_by?: string | null;
  transport_by_fullname?: string | null;
  box?: number | null;
}
