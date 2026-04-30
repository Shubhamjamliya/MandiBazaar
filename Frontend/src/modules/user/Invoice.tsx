import { useParams, useNavigate, Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import Button from "../../components/ui/button";
import { useOrders } from "../../hooks/useOrders";

const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

const PrinterIcon = ({ className }: { className?: string }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

const DownloadIcon = ({ className }: { className?: string }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

// Helper to convert number to words (Indian System)
const numberToWords = (n: number): string => {
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convert = (num: number): string => {
    if (num < 20) return units[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + units[num % 10] : '');
    if (num < 1000) return units[Math.floor(num / 100)] + ' Hundred' + (num % 100 !== 0 ? ' and ' + convert(num % 100) : '');
    if (num < 100000) return convert(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 !== 0 ? ' ' + convert(num % 1000) : '');
    if (num < 10000000) return convert(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 !== 0 ? ' ' + convert(num % 100000) : '');
    return convert(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 !== 0 ? ' ' + convert(num % 10000000) : '');
  };

  if (n === 0) return 'Zero';
  const integerPart = Math.floor(n);
  const decimalPart = Math.round((n - integerPart) * 100);
  
  let str = convert(integerPart) + ' Rupees';
  if (decimalPart > 0) {
    str += ' and ' + convert(decimalPart) + ' Paise';
  }
  return str + ' Only';
};

export default function Invoice() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getOrderById, fetchOrderById } = useOrders();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadOrder = async () => {
      if (!id) return;

      const existingOrder = getOrderById(id);
      if (existingOrder) {
        setOrder(existingOrder);
        setLoading(false);
        return;
      }

      setLoading(true);
      const fetchedOrder = await fetchOrderById(id);
      if (fetchedOrder) {
        setOrder(fetchedOrder);
      }
      setLoading(false);
    };

    loadOrder();
  }, [id, getOrderById, fetchOrderById]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <p className="text-sm text-neutral-500">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex flex-col items-center justify-center">
        <h1 className="text-xl font-bold mb-4">Invoice Not Found</h1>
        <Link to="/orders">
          <Button>Back to Orders</Button>
        </Link>
      </div>
    );
  }

  // Company Details (from image)
  const company = {
    name: "MANDI BAZAAR",
    gstin: "08DGVPP0057C1Z7",
    address: "Krishna Vila, 75 D, E Block, Pratap Nagar, Udaipur, Rajasthan 313001",
    phone: "91 8959522509",
    state: "RAJASTHAN",
    stateCode: "08"
  };

  // Bank Details (from image)
  const bank = {
    name: "HDFC BANK, UDAIPUR",
    accountNo: "50200105409135",
    ifsc: "HDFC0001273",
    micr: "313240003"
  };

  // Tax Calculations
  const isInterState = order.address?.state && order.address.state.toUpperCase() !== company.state.toUpperCase();
  
  // Estimate GST if not explicitly provided (usually 5% for groceries, or from item details)
  const items = order.items?.map((item: any) => {
    const unitPrice = item.unitPrice || item.product?.price || 0;
    const quantity = item.quantity || 0;
    const amount = unitPrice * quantity;
    const gstRate = item.gstPercentage || 0;
    const gstAmount = (amount * gstRate) / 100;
    
    return {
      ...item,
      amount,
      gstRate,
      gstAmount
    };
  }) || [];

  const totalBeforeTax = items.reduce((sum: number, item: any) => sum + item.amount, 0);
  const totalGst = items.reduce((sum: number, item: any) => sum + item.gstAmount, 0);
  
  const cgst = isInterState ? 0 : totalGst / 2;
  const sgst = isInterState ? 0 : totalGst / 2;
  const igst = isInterState ? totalGst : 0;
  
  const grandTotal = totalBeforeTax + totalGst + (order.fees?.deliveryFee || 0) + (order.fees?.platformFee || 0);

  const splitAmount = (amt: number) => {
    const rs = Math.floor(amt);
    const p = Math.round((amt - rs) * 100);
    return { rs, p: p.toString().padStart(2, '0') };
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col items-center py-4 sm:py-8 px-2 sm:px-4 print:bg-white print:p-0">
      {/* Top Action Bar (Hidden when printing) */}
      <div className="w-full max-w-full sm:max-w-[210mm] flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 print:hidden">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium self-start sm:self-center">
          <ArrowLeftIcon className="w-5 h-5" />
          <span>Back to Order</span>
        </button>
        <div className="flex gap-2 sm:gap-4 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={handlePrint}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 border-gray-300 bg-white text-sm sm:text-base px-2 sm:px-4 py-2">
            <PrinterIcon className="w-4 h-4" />
            Print
          </Button>
          <Button
            onClick={handlePrint}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white shadow-sm text-sm sm:text-base px-2 sm:px-4 py-2">
            <DownloadIcon className="w-4 h-4" />
            Download
          </Button>
        </div>
      </div>

      {/* The Invoice Container */}
      <div 
        ref={invoiceRef}
        className="w-full max-w-full sm:max-w-[210mm] bg-white shadow-lg sm:shadow-2xl p-3 sm:p-[15mm] print:shadow-none print:p-0 font-serif text-black overflow-hidden"
        style={{ minHeight: 'auto' }}>
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-black pb-4 mb-1 gap-4 sm:gap-0">
          <div className="flex-1 w-full sm:w-auto">
            <p className="text-[10px] sm:text-sm font-bold">GSTIN : {company.gstin}</p>
            <div className="mt-2 sm:mt-4 text-[10px] sm:text-[11px] leading-tight">
              <p className="font-bold text-xs sm:text-sm">Mandi Bazaar</p>
              <p>{company.address}</p>
              <p>Phone : {company.phone}</p>
            </div>
          </div>
          
          <div className="text-center flex-1 w-full sm:w-auto">
            <p className="text-xs sm:text-sm font-bold tracking-widest mb-1 underline">TAX INVOICE</p>
            <div className="flex flex-row sm:flex-col items-center justify-center gap-2 sm:gap-0">
              <img src="/assets/logo/logo.png" alt="Mandi Bazaar Logo" className="w-8 h-8 sm:w-12 sm:h-12 object-contain" />
              <p className="text-[8px] sm:text-[10px] font-bold">TM</p>
            </div>
          </div>

          <div className="text-left sm:text-right flex-1 w-full sm:w-auto flex flex-col items-start sm:items-end">
            <h1 className="text-xl sm:text-3xl font-bold tracking-tighter" style={{ fontFamily: 'serif' }}>MANDI BAZAAR</h1>
          </div>
        </div>

        {/* Invoice Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 border border-black text-[10px] sm:text-[11px]">
          <div className="border-b sm:border-b-0 sm:border-r border-black p-1 space-y-1">
            <p className="flex justify-between sm:justify-start"><span className="w-20 sm:w-24 inline-block">Invoice No</span> <span className="sm:hidden">:</span> <span className="text-red-600 font-bold text-sm ml-0 sm:ml-2">{order.id?.split('-').pop()?.toUpperCase() || '01'}</span></p>
            <p className="flex justify-between sm:justify-start"><span className="w-20 sm:w-24 inline-block">Reverse Charge</span> <span className="sm:hidden">:</span> <span className="ml-0 sm:ml-2">No</span></p>
          </div>
          <div className="p-1 space-y-1">
            <p className="flex justify-between sm:justify-start"><span className="w-20 sm:w-24 inline-block">Invoice Date</span> <span className="sm:hidden">:</span> <span className="ml-0 sm:ml-2 font-bold">{order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-GB') : '-'}</span></p>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <p className="flex justify-between sm:justify-start w-full sm:w-auto"><span className="w-20 sm:w-24 inline-block">State</span> <span className="sm:hidden">:</span> <span className="ml-0 sm:ml-2">{company.state}</span></p>
              <p className="flex justify-between sm:justify-start w-full sm:w-auto mt-1 sm:mt-0"><span className="w-20 sm:w-20 inline-block">State Code</span> <span className="sm:hidden">:</span> <span className="ml-0 sm:ml-1">{company.stateCode}</span></p>
            </div>
          </div>
        </div>

        {/* Copy Type (Checkbox area) */}
        <div className="flex flex-row justify-end gap-2 sm:gap-4 text-[8px] sm:text-[9px] font-bold mt-1 mb-1">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 sm:w-3 sm:h-3 border border-black flex items-center justify-center text-[8px]">✓</div>
            <span>Original for Recipient</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 sm:w-3 sm:h-3 border border-black"></div>
            <span>Duplicate for Supplier</span>
          </div>
        </div>

        {/* Receiver Details */}
        <div className="border border-black bg-gray-50 p-1 text-[10px] sm:text-[11px] font-bold mb-1">
          Details of Receiver | Billed to :
        </div>
        <div className="border border-black p-1 sm:p-2 text-[10px] sm:text-[11px] space-y-1 mb-1 min-h-auto sm:min-h-[80px]">
          <p><span className="w-20 sm:w-24 inline-block">Name</span> : <span className="font-bold">{order.address?.name || '-'}</span></p>
          <div className="flex flex-col sm:flex-row justify-between gap-1 sm:gap-0">
            <p className="flex-1"><span className="w-20 sm:w-24 inline-block font-serif">Address</span> : <span className="font-sans text-[9px] sm:text-[11px]">{order.address?.address || order.address?.street || '-'}, {order.address?.city || '-'}</span></p>
            <p className="w-full sm:w-48"><span className="w-20 sm:w-8 inline-block">Mob.</span> : <span>{order.address?.phone || '-'}</span></p>
          </div>
          <div className="flex flex-wrap gap-x-4 sm:gap-x-8 gap-y-1 sm:gap-y-0">
            <p><span className="w-20 sm:w-24 inline-block">GSTIN</span> : <span>{order.gstin || '-'}</span></p>
            <p><span className="w-20 sm:w-12 inline-block">State</span> : <span>{order.address?.state || company.state}</span></p>
            <p><span className="w-20 sm:w-16 inline-block">State Code</span> : <span>{isInterState ? '' : company.stateCode}</span></p>
            <p><span className="w-20 sm:w-24 inline-block">Place of Supply</span> : <span>{order.address?.city || '-'}</span></p>
          </div>
        </div>

        {/* Items Table Container with Horizontal Scroll on Mobile */}
        <div className="border border-black mb-1 overflow-x-auto scrollbar-hide">
          <table className="w-full text-[10px] sm:text-[11px] border-collapse min-w-[500px] sm:min-w-0">
            <thead>
              <tr className="border-b border-black font-bold bg-neutral-50">
                <th className="border-r border-black p-1 w-8 text-center">Sr. No.</th>
                <th className="border-r border-black p-2 sm:p-4 text-center">Name of Product / Service</th>
                <th className="border-r border-black p-1 w-16 text-center">HSN / SAC</th>
                <th className="border-r border-black p-1 w-10 text-center">Qty.</th>
                <th className="border-r border-black p-1 w-16 text-center">Rate</th>
                <th className="p-1 w-20 sm:w-24 text-center" colSpan={2}>
                  <div className="border-b border-black pb-1 mb-1">Amount</div>
                  <div className="flex justify-around px-1 sm:px-2">
                    <span>Rs</span>
                    <span>P</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="min-h-[200px] sm:min-h-[400px]">
              {items.map((item: any, index: number) => {
                const { rs, p } = splitAmount(item.amount);
                return (
                  <tr key={index} className="border-b border-black/10 last:border-0 h-8 sm:h-10">
                    <td className="border-r border-black p-1 text-center">{index + 1}</td>
                    <td className="border-r border-black p-2 font-medium">{item.productName || item.product?.name || 'Product'}</td>
                    <td className="border-r border-black p-1 text-center">{item.hsnCode || '-'}</td>
                    <td className="border-r border-black p-1 text-center">{item.quantity}</td>
                    <td className="border-r border-black p-1 text-right">{item.unitPrice?.toFixed(0)}</td>
                    <td className="border-r border-black p-1 text-right w-10 sm:w-12">{rs}</td>
                    <td className="p-1 text-center w-8 sm:w-10">{p}</td>
                  </tr>
                );
              })}
              {/* Spacer rows */}
              {Array.from({ length: Math.max(0, 5 - items.length) }).map((_, i) => (
                <tr key={`spacer-${i}`} className="h-8 sm:h-10 border-b border-black/5 last:border-0">
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td></td>
                </tr>
              ))}
              {/* Cash/Credit Stamp area */}
              <tr className="h-12 sm:h-20">
                <td className="border-r border-black"></td>
                <td className="border-r border-black p-2 sm:p-4 align-bottom">
                  <span className="bg-black text-white px-2 py-0.5 rounded text-[8px] sm:text-[10px] font-bold italic">CASH/CREDIT</span>
                </td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer Summary Section */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] border border-black text-[10px] sm:text-[11px]">
          <div className="flex flex-col border-b sm:border-b-0 sm:border-r border-black">
            <div className="p-2 border-b border-black min-h-[40px]">
              <p className="font-bold uppercase text-[9px] sm:text-[11px]">Total Invoice Amount in words :</p>
              <p className="mt-1 italic text-[9px] sm:text-[11px]">{numberToWords(grandTotal)}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[1.2fr_1fr] flex-1">
              <div className="p-2 border-b sm:border-b-0 sm:border-r border-black leading-relaxed">
                <p className="font-bold underline mb-1">Bank Name : {bank.name}</p>
                <p><span className="w-20 inline-block font-bold">Account No.</span> : <span>{bank.accountNo}</span></p>
                <p><span className="w-20 inline-block font-bold">IFS Code</span> : <span>{bank.ifsc}</span></p>
                <p><span className="w-20 inline-block font-bold">MICR</span> : <span>{bank.micr}</span></p>
              </div>
              <div className="flex flex-col justify-end items-center p-2 text-center italic min-h-[60px] sm:min-h-0">
                <p className="text-[8px] sm:text-[9px] mb-2 sm:mb-8">(Customer Sign & Common Seal)</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col">
            <table className="w-full border-collapse">
              <tbody>
                <tr className="border-b border-black h-7">
                  <td className="p-1 font-bold text-right pr-2">Total</td>
                  <td className="border-l border-black p-1 text-right w-12 sm:w-16">{splitAmount(totalBeforeTax).rs}</td>
                  <td className="border-l border-black p-1 text-center w-6 sm:w-8">{splitAmount(totalBeforeTax).p}</td>
                </tr>
                <tr className="border-b border-black h-7">
                  <td className="p-1 text-right pr-2">Add : CGST @</td>
                  <td className="border-l border-black p-1 text-right">{splitAmount(cgst).rs}</td>
                  <td className="border-l border-black p-1 text-center">{splitAmount(cgst).p}</td>
                </tr>
                <tr className="border-b border-black h-7">
                  <td className="p-1 text-right pr-2">Add : SGST @</td>
                  <td className="border-l border-black p-1 text-right">{splitAmount(sgst).rs}</td>
                  <td className="border-l border-black p-1 text-center">{splitAmount(sgst).p}</td>
                </tr>
                <tr className="border-b border-black h-7">
                  <td className="p-1 text-right pr-2">Add : IGST @</td>
                  <td className="border-l border-black p-1 text-right">{splitAmount(igst).rs}</td>
                  <td className="border-l border-black p-1 text-center">{splitAmount(igst).p}</td>
                </tr>
                <tr className="border-b border-black h-7 bg-gray-100">
                  <td className="p-1 font-bold text-right pr-2">Grand Total</td>
                  <td className="border-l border-black p-1 text-right font-bold">{splitAmount(grandTotal).rs}</td>
                  <td className="border-l border-black p-1 text-center font-bold">{splitAmount(grandTotal).p}</td>
                </tr>
                <tr className="h-7">
                  <td className="p-1 text-right text-[8px] sm:text-[9px] pr-2 leading-tight">GST on Reverse Charge</td>
                  <td className="border-l border-black p-1 text-right">0</td>
                  <td className="border-l border-black p-1 text-center">00</td>
                </tr>
              </tbody>
            </table>
            <div className="flex-1 border-t border-black p-2 flex flex-col justify-between items-center text-center">
              <p className="text-[7px] sm:text-[8px] leading-tight mt-1">Certified that the particulars given above are true and correct</p>
              <p className="font-bold text-[9px] sm:text-[10px] mt-1">for MANDI BAZAAR</p>
              <div className="h-6 sm:h-10"></div>
              <p className="text-[8px] sm:text-[9px] font-bold underline">Authorised Signatory</p>
            </div>
          </div>
        </div>

        {/* Footer text */}
        <div className="mt-2 text-[8px] sm:text-[9px] font-medium leading-tight">
          <p>Subject to Udaipur Jurisdiction</p>
          <p>E. & OE.</p>
        </div>

      </div>

      {/* Print Specific CSS */}
      <style>{`
        @media print {
          @page {
            margin: 0;
            size: A4;
          }
          body {
            background-color: white !important;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-hidden {
            display: none !important;
          }
          .min-h-screen {
            min-height: 0 !important;
          }
          /* Ensure fixed width for print container */
          .max-w-full {
            max-width: 210mm !important;
          }
          .p-3 {
            padding: 15mm !important;
          }
          /* Ensure grid columns for print */
          .grid-cols-1 {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          .sm\\:grid-cols-2 {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          /* Ensure table doesn't scroll in print */
          .overflow-x-auto {
            overflow: visible !important;
          }
          table {
            min-width: 0 !important;
          }
          /* Ensure sharp borders */
          table, th, td, div {
            border-color: black !important;
          }
        }
      `}</style>
    </div>
  );
}

