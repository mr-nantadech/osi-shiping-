'use client';

import React from 'react';
import Paper from '@mui/material/Paper';
import clsx from 'clsx';
import type {
  ShippingLabelData,
  ShippingLabelTemplateProps,
} from '@/types/shippingLabel';

export default function ShippingLabelTemplate({
  data,
  className,
}: ShippingLabelTemplateProps) {
  return (
    <Paper
      elevation={0}
      className={clsx('relative bg-white', className)}
      sx={{
        width: '10cm',
        minWidth: '10cm',
        height: '10cm',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        padding: '15px',
      }}
    >
      {data.stampText && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rotate-[-20deg] text-red-600/80 font-black text-[75px]">
            {data.stampText}
          </div>
        </div>
      )}

      <div
        style={{
          border: '1px solid black',
          padding: '10px',
          height: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '5px',
            alignItems: 'stretch',
          }}
        >
          <div
            style={{ width: '50%', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ fontSize: '12px', fontWeight: 600 }}>
              ผู้ส่งสินค้า
            </div>
            <h2 style={{ margin: 0, fontSize: '11px' }}>{data.companyName}</h2>
            <div
              style={{ fontSize: '12px', marginTop: '8px', fontWeight: 600 }}
            >
              ผู้รับสินค้า
            </div>
            <div style={{ fontSize: '12px' }}>{data.customerName}</div>
            {data.addressLines.map((line, idx) => (
              <div key={idx} style={{ fontSize: '11px' }}>
                {line}
              </div>
            ))}
            <div style={{ fontSize: '11px' }}>Tel: {data.tel ?? ''}</div>
            <div style={{ marginTop: '15px', fontSize: '11px' }}>
              Order #{data.orderNo}
            </div>

            {data.qrCode && (
              <div style={{ marginTop: '10px' }}>
                <img
                  src={data.qrCode}
                  alt="QR Code"
                  style={{ width: '50px', height: '50px' }}
                />
              </div>
            )}

            <div style={{ marginTop: '5px', fontSize: '11px' }}>
              {data.sheetNo} / {data.totalSheets}
            </div>
          </div>

          <div style={{ width: '1px', background: '#ccc' }} />

          <div
            style={{
              width: '50%',
              display: 'flex',
              flexDirection: 'column',
              fontSize: '11px',
            }}
          >
            <hr style={{ width: '100%', borderColor: '#000' }} />
            <div>เลขที่บิล</div>
            <div style={{ fontWeight: 600 }}>{data.waybillNo}</div>
            <hr
              style={{ width: '100%', borderColor: '#000', marginTop: '6px' }}
            />
            <div>ขนส่ง</div>
            <div style={{ fontWeight: 600 }}>{data.shippingType}</div>
            <hr
              style={{ width: '100%', borderColor: '#000', marginTop: '6px' }}
            />
            <div>สายส่ง</div>
            <div style={{ fontWeight: 600 }}>{data.route ?? ''}</div>
            <hr
              style={{ width: '100%', borderColor: '#000', marginTop: '6px' }}
            />
            <div>รหัสลูกค้า</div>
            <div style={{ fontWeight: 600 }}>{data.customerCode ?? ''}</div>
            <hr
              style={{ width: '100%', borderColor: '#000', marginTop: '6px' }}
            />
            <div>วันที่พิมพ์</div>
            <div style={{ fontWeight: 600 }}>{data.printedAt}</div>
            <hr
              style={{ width: '100%', borderColor: '#000', marginTop: '6px' }}
            />
            <div>จำนวนทั้งหมด</div>
            <div style={{ fontWeight: 600 }}>{data.totalSheets}</div>
            <hr
              style={{ width: '100%', borderColor: '#000', marginTop: '6px' }}
            />
            <div>ลำดับที่</div>
            <div style={{ fontWeight: 600, marginBottom: '6px' }}>
              {data.sheetNo}
            </div>
          </div>
        </div>
        <hr style={{ width: '100%', borderColor: '#000' }} />
        <div style={{ fontSize: '11px' }}>หมายเหตุ: {data.remark ?? ''}</div>
      </div>
    </Paper>
  );
}
