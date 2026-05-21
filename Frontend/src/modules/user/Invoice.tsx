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

  if (order?.status === 'Pending') {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-6">
          <span className="text-4xl">⏳</span>
        </div>
        <h1 className="text-2xl font-bold mb-2 text-gray-900">Payment Pending</h1>
        <p className="text-gray-600 mb-8 max-w-md">Invoices are generated only after successful payment. Please complete your payment to view the invoice.</p>
        <div className="flex gap-4">
          <Link to={`/orders/${id}`}>
            <Button className="bg-orange-600 hover:bg-orange-700">Go to Order</Button>
          </Link>
          <Link to="/orders">
            <Button variant="outline">Back to List</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Company Details (Refined for Mandi Bazaar)
  const company = {
    name: "MANDI BAZAAR",
    registeredName: "MANDI BAZAAR",
    gstin: "08DGVPP0057C1Z7",
    fssai: "22225088001352",
    pan: "DGVPP0057C",
    address: "Krishna Vila, 75 D, E Block, Pratap Nagar, Udaipur, Rajasthan 313001",
    phone: "91 8959522509",
    state: "Rajasthan",
    stateCode: "08"
  };

  // Tax Calculations
  const isInterState = order.address?.state && order.address.state.toLowerCase() !== company.state.toLowerCase();

  const items = order.items?.map((item: any) => {
    const unitPrice = item.unitPrice || item.product?.price || item.price || 0;
    const quantity = item.quantity || item.qty || 0;
    const amount = unitPrice * quantity;
    let gstRate = 0;
    if (typeof item.gstPercentage === 'number') {
      gstRate = item.gstPercentage;
    } else if (typeof item.taxPercent === 'number') {
      gstRate = item.taxPercent;
    } else if (item.gstPercentage !== undefined && item.gstPercentage !== null) {
      gstRate = Number(item.gstPercentage) || 0;
    } else if (item.taxPercent !== undefined && item.taxPercent !== null) {
      gstRate = Number(item.taxPercent) || 0;
    } else if (item.product?.gstPercentage !== undefined && item.product?.gstPercentage !== null) {
      gstRate = Number(item.product.gstPercentage) || 0;
    }
    const taxableValue = amount / (1 + gstRate / 100);
    const gstAmount = amount - taxableValue;
    const weight = item.variation
      ? (item.variation.startsWith('wv_') ? item.variation.replace('wv_', '') : item.variation)
      : (item.product?.pack || item.product?.unit || '-');

    return {
      ...item,
      taxableValue,
      gstRate,
      gstAmount,
      amount,
      weight,
      quantity,
      unitPrice
    };
  }) || [];

  const totalTaxableValue = items.reduce((sum: number, item: any) => sum + item.taxableValue, 0);
  const totalGst = items.reduce((sum: number, item: any) => sum + item.gstAmount, 0);

  const cgst = isInterState ? 0 : totalGst / 2;
  const sgst = isInterState ? 0 : totalGst / 2;
  const igst = isInterState ? totalGst : 0;

  const platformFee = order.fees?.platformFee ?? order.platformFee ?? 0;
  const deliveryFee = order.fees?.deliveryFee ?? order.shipping ?? 0;
  const discount = order.discount || order.couponDiscount || 0;

  const grandTotal = order.grandTotal || order.totalAmount || (totalTaxableValue + totalGst + deliveryFee + platformFee - discount);

  const getSequenceFromOrder = (value?: string): number => {
    if (!value) return 1;
    const digits = value.replace(/\D/g, '');
    if (!digits) return 1;
    const lastThree = digits.slice(-3);
    const parsed = parseInt(lastThree, 10);
    return Number.isNaN(parsed) ? 1 : parsed;
  };

  const orderSequence = getSequenceFromOrder(order.orderNumber || order.id);
  const orderIdDisplay = `UDP-${String(orderSequence).padStart(3, '0')}`;
  const invoiceNumberDisplay = `MB-${String(orderSequence).padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col items-center py-4 sm:py-8 px-2 sm:px-4 print:bg-white print:p-0 overflow-x-hidden">
      {/* Top Action Bar */}
      <div className="w-full max-w-[210mm] flex justify-between items-center mb-6 print:hidden">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium">
          <ArrowLeftIcon className="w-5 h-5" />
          <span>Back to Order</span>
        </button>
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={handlePrint}
            className="flex items-center gap-2 border-gray-300 bg-white">
            <PrinterIcon className="w-4 h-4" />
            <span>Print Invoice</span>
          </Button>
          <Button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white shadow-sm">
            <DownloadIcon className="w-4 h-4" />
            <span>Download PDF</span>
          </Button>
        </div>
      </div>

      {/* The Invoice Container (Blinkit Style) */}
      <div
        ref={invoiceRef}
        id="tax-invoice-container"
        className="w-full max-w-[210mm] bg-white border border-gray-300 p-4 sm:p-8 print:border-0 print:p-0 font-sans text-[10px] sm:text-[12px] text-black shadow-sm relative z-10">

        {/* Header Section */}
        <div className="flex justify-between items-start mb-6">
          <div className="w-32 sm:w-48">
            <img src="/assets/logo/logo.png" alt="Mandi Bazaar" className="w-full object-contain" />
          </div>
          <div className="text-right">
            <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-2">Tax Invoice</h1>
            <div className="flex justify-end gap-2 items-start">
              <div className="text-right">
                <p className="font-bold text-gray-500 uppercase text-[8px] sm:text-[10px] mb-1">Invoice Number</p>
                <p className="font-bold text-sm sm:text-base">{invoiceNumberDisplay}</p>
              </div>
              {/* Placeholder for QR Code */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 border border-gray-200 bg-gray-50 flex items-center justify-center p-1">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${order.id}`} alt="QR Code" className="w-full h-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Seller and Buyer Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border border-gray-400 mb-6">
          {/* Sold By / Seller */}
          <div className="border-b sm:border-b-0 sm:border-r border-gray-400 p-3">
            <p className="font-bold text-gray-700 mb-2 border-b border-gray-200 pb-1 uppercase tracking-wider text-[9px] sm:text-[11px]">Sold By / Seller</p>
            <p className="font-bold text-sm mb-1">{company.registeredName}</p>
            <p className="text-gray-600 leading-relaxed mb-2">
              {company.address}
            </p>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[9px] sm:text-[10px]">
              <p className="font-bold text-gray-500">GSTIN</p>
              <p className="font-bold">: {company.gstin}</p>
              <p className="font-bold text-gray-500">FSSAI License Number</p>
              <p className="font-bold">: {company.fssai}</p>
              <p className="font-bold text-gray-500">PAN</p>
              <p className="font-bold">: {company.pan}</p>
            </div>
          </div>

          {/* Invoice To / Order Details */}
          <div className="flex flex-col">
            <div className="p-3 border-b border-gray-400 flex-1">
              <p className="font-bold text-gray-700 mb-2 border-b border-gray-200 pb-1 uppercase tracking-wider text-[9px] sm:text-[11px]">Invoice To</p>
              <p className="font-bold text-sm mb-1">{order.address?.name || order.customerName || order.customer?.name || 'Customer'}</p>
              <p className="text-gray-600 leading-relaxed">
                {order.address?.address || order.address?.street || order.deliveryAddress?.address || 'N/A'}, {order.address?.city || order.deliveryAddress?.city || ''}
              </p>
              {/* Pin code and State removed as per user request */}
            </div>
            <div className="p-3 bg-gray-50 grid grid-cols-2 gap-y-1">
              <p className="font-bold text-gray-500 uppercase text-[8px] sm:text-[9px]">Order Id</p>
              <p className="font-bold">: {orderIdDisplay}</p>
              <p className="font-bold text-gray-500 uppercase text-[8px] sm:text-[9px]">Invoice Date</p>
              <p className="font-bold">: {order.createdAt || order.orderDate ? new Date(order.createdAt || order.orderDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-') : '-'}</p>
              <p className="font-bold text-gray-500 uppercase text-[8px] sm:text-[9px]">Place of Supply</p>
              <p className="font-bold">: {order.address?.state || order.deliveryAddress?.state || company.state}</p>
            </div>
          </div>
        </div>

        {/* Items Table - Added Weight Column and Mobile Scrolling */}
        <div className="border border-gray-400 mb-4 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300">
          <table className="w-full text-[8px] sm:text-[10px] border-collapse min-w-[700px] sm:min-w-0">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-400 font-bold text-gray-700">
                <th className="border-r border-gray-400 p-1 w-6">Sr. no</th>
                <th className="border-r border-gray-400 p-1 w-16 text-center">UPC</th>
                <th className="border-r border-gray-400 p-1 text-left">Item Description</th>
                <th className="border-r border-gray-400 p-1 w-12 text-center">Weight</th>
                <th className="border-r border-gray-400 p-1 w-12 text-center">MRP</th>
                <th className="border-r border-gray-400 p-1 w-10 text-center">Qty.</th>
                <th className="border-r border-gray-400 p-1 w-16 text-center">Taxable Value</th>
                <th className="border-r border-gray-400 p-1 w-10 text-center">CGST (%)</th>
                <th className="border-r border-gray-400 p-1 w-12 text-center">CGST (INR)</th>
                <th className="border-r border-gray-400 p-1 w-10 text-center">SGST (%)</th>
                <th className="border-r border-gray-400 p-1 w-12 text-center">SGST (INR)</th>
                <th className="border-r border-gray-400 p-1 w-12 text-center">Cess (%)</th>
                <th className="p-1 w-16 text-center">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any, index: number) => (
                <tr key={index} className="border-b border-gray-200 last:border-b-0">
                  <td className="border-r border-gray-400 p-1 text-center">{index + 1}</td>
                  <td className="border-r border-gray-400 p-1 text-center">{item.product?.id?.slice(-6) || '123456'}</td>
                  <td className="border-r border-gray-400 p-1 text-left">
                    <p className="font-bold">
                      {item.product?.name ||
                        item.product?.productName ||
                        (typeof item.product === 'string' ? item.product : 'Item Name')}
                    </p>
                    <p className="text-[7px] sm:text-[8px] text-gray-500">(HSN-{item.hsnCode || '00000000'})</p>
                  </td>
                  <td className="border-r border-gray-400 p-1 text-center font-bold text-green-700">{item.weight || '-'}</td>
                  <td className="border-r border-gray-400 p-1 text-center">{(item.unitPrice || 0).toFixed(2)}</td>
                  <td className="border-r border-gray-400 p-1 text-center">{item.quantity}</td>
                  <td className="border-r border-gray-400 p-1 text-center">{(item.taxableValue || 0).toFixed(2)}</td>
                  <td className="border-r border-gray-400 p-1 text-center">{item.gstRate / 2}%</td>
                  <td className="border-r border-gray-400 p-1 text-center">{(item.gstAmount / 2 || 0).toFixed(2)}</td>
                  <td className="border-r border-gray-400 p-1 text-center">{item.gstRate / 2}%</td>
                  <td className="border-r border-gray-400 p-1 text-center">{(item.gstAmount / 2 || 0).toFixed(2)}</td>
                  <td className="border-r border-gray-400 p-1 text-center">0.00</td>
                  <td className="p-1 text-center font-bold">{(item.amount || 0).toFixed(2)}</td>
                </tr>
              ))}
              {/* Dummy rows */}
              {items.length < 5 && Array.from({ length: 5 - items.length }).map((_, i) => (
                <tr key={`empty-${i}`} className="h-8 border-b border-gray-200">
                  <td className="border-r border-gray-400"></td>
                  <td className="border-r border-gray-400"></td>
                  <td className="border-r border-gray-400"></td>
                  <td className="border-r border-gray-400"></td>
                  <td className="border-r border-gray-400"></td>
                  <td className="border-r border-gray-400"></td>
                  <td className="border-r border-gray-400"></td>
                  <td className="border-r border-gray-400"></td>
                  <td className="border-r border-gray-400"></td>
                  <td className="border-r border-gray-400"></td>
                  <td className="border-r border-gray-400"></td>
                  <td className="border-r border-gray-400"></td>
                  <td></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 border-t border-gray-400 font-bold">
                <td className="border-r border-gray-400 p-1 text-left" colSpan={5}>Items Subtotal</td>
                <td className="border-r border-gray-400 p-1 text-center">{items.reduce((s: number, i: any) => s + (i.quantity || 0), 0)}</td>
                <td className="border-r border-gray-400 p-1 text-center">{totalTaxableValue.toFixed(2)}</td>
                <td className="border-r border-gray-400"></td>
                <td className="border-r border-gray-400 p-1 text-center">{cgst.toFixed(2)}</td>
                <td className="border-r border-gray-400"></td>
                <td className="border-r border-gray-400 p-1 text-center">{sgst.toFixed(2)}</td>
                <td className="border-r border-gray-400"></td>
                <td className="p-1 text-center">{(totalTaxableValue + totalGst).toFixed(2)}</td>
              </tr>
              <tr className="border-t border-gray-400 font-bold">
                <td className="border-r border-gray-400 p-1 text-left" colSpan={12}>Handling Charges</td>
                <td className="p-1 text-center">{platformFee.toFixed(2)}</td>
              </tr>
              <tr className="border-t border-gray-400 font-bold">
                <td className="border-r border-gray-400 p-1 text-left" colSpan={12}>Delivery Charges</td>
                <td className="p-1 text-center">{deliveryFee.toFixed(2)}</td>
              </tr>
              {discount > 0 && (
                <tr className="border-t border-gray-400 font-bold text-red-600 bg-red-50">
                  <td className="border-r border-gray-400 p-1 text-left" colSpan={12}>Discount</td>
                  <td className="p-1 text-center">-{discount.toFixed(2)}</td>
                </tr>
              )}
              <tr className="bg-gray-100 border-t border-gray-400 font-bold">
                <td className="border-r border-gray-400 p-1 text-left" colSpan={12}>Grand Total</td>
                <td className="p-1 text-center font-extrabold text-green-700">₹{grandTotal.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="border border-gray-400 p-2 mb-4 bg-gray-50">
          <p className="font-bold mb-1"><span className="text-gray-500 uppercase text-[8px] sm:text-[9px]">Amount in Words:</span> {numberToWords(grandTotal)}</p>
        </div>

        {/* Bottom Seller / Signature Section */}
        <div className="grid grid-cols-1 sm:grid-cols-[1.5fr_1fr] border border-gray-400 mb-6">
          <div className="p-3 border-b sm:border-b-0 sm:border-r border-gray-400">
            <p className="font-bold text-sm mb-2">{company.registeredName}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[8px] sm:text-[10px]">
              <p><span className="font-bold text-gray-500 uppercase">GSTIN</span> : {company.gstin}</p>
              <p><span className="font-bold text-gray-500 uppercase">FSSAI License Number</span> : {company.fssai}</p>
              <p><span className="font-bold text-gray-500 uppercase">PAN</span> : {company.pan}</p>
            </div>
          </div>
          <div className="p-3 flex flex-col items-center justify-between min-h-[100px]">
            <div className="flex-1 flex items-center justify-center">
              {/* Signature Image from User */}
              <img
                src="/assets/signatures/sonupatidar.png"
                alt="Authorised Signatory"
                className="max-h-16 object-contain mix-blend-multiply"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="text-xs italic text-gray-400 signature-placeholder">Sonu Patidar</div>
            </div>
            <p className="font-bold border-t border-gray-300 w-full text-center pt-1 mt-2 text-[9px] sm:text-[11px]">Authorised Signatory</p>
          </div>
        </div>

        <div className="mb-4 text-[8px] sm:text-[10px] font-bold">
          <p>Whether the tax is payable on reverse charge - No</p>
        </div>

        {/* Terms & Conditions */}
        <div className="border border-gray-300 p-3 text-[7px] sm:text-[9px] text-gray-600 leading-tight">
          <p className="font-bold text-gray-800 mb-2 uppercase">Terms & Conditions:</p>
          <ol className="list-decimal ml-4 space-y-1">
            <li>If you have any issues or queries in respect of your order, please contact customer chat support through Mandi Bazaar platform or drop an email at support@mandibazaar.com</li>
            <li>In case you need to get more information about the seller's FSSAI status, please visit https://foscos.fssai.gov.in/ and use the FBO search option with FSSAI License / Registration number.</li>
            <li>Please note that we never ask for bank account details such as CVV, account number, UPI Pin, etc. across our support channels. For your safety please do not share these details with anyone over any medium.</li>
            <li>MRP displayed on the platform is as printed on the product package. Actual MRP and amount payable may be a function of offers/ discounts and/ or the revised GST rates made effective by Govt. from 22 Sep 2025 onwards.</li>
          </ol>
        </div>

      </div>

      {/* Global CSS to hide everything except invoice during print */}
      <style>{`
        @media print {
          /* Hide everything first */
          body * {
            visibility: hidden !important;
          }
          /* Only show the invoice container and its children */
          #tax-invoice-container, #tax-invoice-container * {
            visibility: visible !important;
          }
          /* Position invoice at the top left */
          #tax-invoice-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: none !important;
            border: 0 !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          @page {
            margin: 0.5cm;
            size: A4;
          }
        }

        /* Mobile Slider Style for Table */
        @media (max-width: 640px) {
          .scrollbar-thin::-webkit-scrollbar {
            height: 4px;
          }
          .scrollbar-thin::-webkit-scrollbar-thumb {
            background-color: #e2e8f0;
            border-radius: 10px;
          }
        }

        .signature-placeholder {
          display: none;
        }
        @media print {
          .signature-placeholder {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}

