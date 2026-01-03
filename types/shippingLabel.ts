export type ShippingLabelData = {
  companyName: string;
  customerName: string;
  addressLines: string[];
  tel?: string;
  orderNo: string;
  waybillNo: string;
  shippingType: string;
  route?: string;
  customerCode?: string;
  printedAt: string;
  totalSheets: number;
  sheetNo: number;
  stampText?: string;
  qrCode?: string;
  remark?: string;
};

export type ShippingLabelTemplateProps = {
  data: ShippingLabelData;
  className?: string;
};
