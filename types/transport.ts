export type TransportRow = {
  transportNo: string;
  transportDate: string;
  billingDocument: string;
  billingDate: string;
  shipTo: string;
  shipToDescription: string;
  deliveryQty: number;
  salesUnit: string;
  salesDistrict: string;
  salesDistrictDescription: string;
  transportBy: string;
  transportByFullname?: string;
  box: number;
  receivedDate: string | null;
  trackingNo: string;
  signedDate: string | null;
  signedBy: string | null;
  status: string;
};

export type BillingRow = TransportRow & { id: string | number };
