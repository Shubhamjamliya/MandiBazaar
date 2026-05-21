import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getOrderById, updateOrderStatus, resendOrderNotification, OrderDetail } from '../../../services/api/orderService';
import jsPDF from 'jspdf';

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

const COMPANY_DETAILS = {
  name: "MANDI BAZAAR",
  registeredName: "MANDI BAZAAR",
  gstin: "08DGVPP0057C1Z7",
  fssai: "10020064002537",
  pan: "DGVPP0057C",
  address: "Krishna Vila, 75 D, E Block, Pratap Nagar, Udaipur, Rajasthan 313001",
  phone: "91 8959522509",
  state: "Rajasthan",
  stateCode: "08"
};

const BANK_DETAILS = {
  name: "HDFC BANK, UDAIPUR",
  accountNo: "50200105409135",
  ifsc: "HDFC0001273",
  micr: "313240003"
};

export default function SellerOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [orderStatus, setOrderStatus] = useState<string>('Out For Delivery');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);

  const handleResendNotification = async () => {
    if (!id) return;

    console.log('📱 Resend Notification - Order ID:', id);
    console.log('📱 Current Path:', window.location.pathname);
    console.log('📱 Full URL:', window.location.href);

    setNotificationLoading(true);
    try {
      const response = await resendOrderNotification(id);
      if (response.success) {
        alert('Notification sent successfully to delivery partners');
      } else {
        alert(response.message || 'Failed to send notification');
      }
    } catch (err: any) {
      console.error('❌ Resend Notification Error:', {
        status: err.response?.status,
        message: err.response?.data?.message,
        url: err.config?.url,
        method: err.config?.method,
        headers: err.config?.headers,
      });
      alert(err.response?.data?.message || 'Failed to send notification');
    } finally {
      setNotificationLoading(false);
    }
  };

  const fetchOrderDetail = async (silent = false) => {
    if (!id) return;

    if (!silent) {
      setLoading(true);
      setError('');
    }

    try {
      const response = await getOrderById(id);
      if (response.success && response.data) {
        setOrderDetail(response.data);
        setOrderStatus(response.data.status);
      } else if (!silent) {
        setError(response.message || 'Failed to fetch order details');
      }
    } catch (err: any) {
      if (!silent) {
        setError(err.response?.data?.message || err.message || 'Failed to fetch order details');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  // Fetch order detail from API
  useEffect(() => {
    fetchOrderDetail();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const intervalId = window.setInterval(() => {
      fetchOrderDetail(true);
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [id]);

  // Handle status update
  const handleStatusUpdate = async (newStatus: string) => {
    if (!orderDetail) return;

    try {
      const response = await updateOrderStatus(orderDetail.id, { status: newStatus as any });
      if (response.success) {
        setOrderStatus(newStatus);
        setOrderDetail({ ...orderDetail, status: newStatus as any });
      } else {
        alert('Failed to update order status');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update order status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-neutral-500">Loading order details...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-bold text-neutral-900 mb-4">Error</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/seller/orders')}
            className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  if (!orderDetail) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-bold text-neutral-900 mb-4">Order Not Found</h2>
          <button
            onClick={() => navigate('/seller/orders')}
            className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    const day = date.getDate();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    let suffix = 'th';
    if (day === 1 || day === 21 || day === 31) suffix = 'st';
    else if (day === 2 || day === 22) suffix = 'nd';
    else if (day === 3 || day === 23) suffix = 'rd';
    return `${day}${suffix} ${month}, ${year}`;
  };

  const handleExportPDF = () => {
    // Note: Manual PDF generation with jsPDF is updated to match the layout better
    // but window.print() is the recommended way for pixel-perfect Tax Invoice matching.
    if (!orderDetail) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = margin;

    // Header
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`GSTIN : ${COMPANY_DETAILS.gstin}`, margin, yPos);
    doc.text('TAX INVOICE', pageWidth / 2, yPos, { align: 'center' });
    doc.setFontSize(14);
    doc.text('MANDI BAZAAR', pageWidth - margin, yPos, { align: 'right' });
    yPos += 10;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(COMPANY_DETAILS.address, margin, yPos);
    yPos += 5;
    doc.text(`Phone : ${COMPANY_DETAILS.phone}`, margin, yPos);
    yPos += 10;

    // Border and Info Grid
    doc.setDrawColor(0);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 20);
    doc.line(pageWidth / 2, yPos, pageWidth / 2, yPos + 20);

    doc.setFontSize(9);
    const getSequenceFromOrder = (value?: string): number => {
      if (!value) return 1;
      const digits = value.replace(/\D/g, '');
      if (!digits) return 1;
      const lastThree = digits.slice(-3);
      const parsed = parseInt(lastThree, 10);
      return Number.isNaN(parsed) ? 1 : parsed;
    };
    const orderSequence = getSequenceFromOrder(orderDetail.invoiceNumber || orderDetail.id);
    const orderIdDisplay = `UDP-${String(orderSequence).padStart(3, '0')}`;
    const invoiceNumberDisplay = `MB-${String(orderSequence).padStart(2, '0')}`;

    doc.text(`Invoice No: ${invoiceNumberDisplay}`, margin + 5, yPos + 7);
    doc.text('Reverse Charge: No', margin + 5, yPos + 15);

    doc.text(`Invoice Date: ${formatDate(orderDetail.orderDate)}`, pageWidth / 2 + 5, yPos + 7);
    doc.text(`State: ${COMPANY_DETAILS.state} (${COMPANY_DETAILS.stateCode})`, pageWidth / 2 + 5, yPos + 15);
    yPos += 25;

    // Receiver Details
    doc.setFont('helvetica', 'bold');
    doc.text('Details of Receiver | Billed to :', margin, yPos);
    yPos += 5;
    doc.rect(margin, yPos, pageWidth - 2 * margin, 25);
    doc.setFont('helvetica', 'normal');
    const addr = (orderDetail.deliveryAddress || (orderDetail as any).address || {}) as any;
    const name = addr.name || orderDetail.customerName || 'N/A';
    const phone = addr.phone || orderDetail.customerPhone || 'N/A';
    const addressStr = `${addr.address || addr.street || '-'}, ${addr.city || '-'}`;

    doc.text(`Name : ${name}`, margin + 5, yPos + 7);
    doc.text(`Address : ${addressStr}`, margin + 5, yPos + 14);
    doc.text(`Mob : ${phone}`, margin + 5, yPos + 21);
    yPos += 30;

    // Table
    doc.setFont('helvetica', 'bold');
    doc.rect(margin, yPos, pageWidth - 2 * margin, 80); // Fixed height for table area
    doc.line(margin, yPos + 10, pageWidth - margin, yPos + 10);

    const cols = [10, 80, 20, 20, 20, 30]; // Sr, Name, HSN, Qty, Rate, Amount
    let xPos = margin;
    const headers = ['Sr', 'Product Name', 'HSN', 'Qty', 'Rate', 'Amount'];
    headers.forEach((h, i) => {
      doc.text(h, xPos + 2, yPos + 7);
      xPos += cols[i];
    });

    yPos += 15;
    doc.setFont('helvetica', 'normal');
    orderDetail.items.forEach((item, i) => {
      xPos = margin;
      doc.text((i + 1).toString(), xPos + 2, yPos);
      xPos += cols[0];
      doc.text(item.product.substring(0, 45), xPos + 2, yPos);
      xPos += cols[1];
      doc.text(item.hsnCode || '-', xPos + 2, yPos);
      xPos += cols[2];
      doc.text(item.qty.toString(), xPos + 2, yPos);
      xPos += cols[3];
      doc.text(item.price.toFixed(0), xPos + 2, yPos);
      xPos += cols[4];
      doc.text(item.subtotal.toFixed(2), xPos + 2, yPos);
      yPos += 7;
    });

    // Summary logic
    const totalSubtotal = orderDetail.items.reduce((sum, item) => sum + item.subtotal, 0);
    const totalTax = orderDetail.items.reduce((sum, item) => sum + item.tax, 0);
    const grandTotal = totalSubtotal + totalTax;

    // Footer summary
    yPos = 135 + 80;
    doc.rect(margin, yPos, pageWidth - 2 * margin, 40);
    doc.text(`Total Amount in words: ${numberToWords(grandTotal)}`, margin + 5, yPos + 7);

    doc.line(pageWidth - margin - 60, yPos, pageWidth - margin - 60, yPos + 40);
    const pdfPlatformFee = (orderDetail as any)?.platformFee ?? (orderDetail as any)?.fees?.platformFee ?? 0;
    const pdfDeliveryFee = (orderDetail as any)?.shipping ?? (orderDetail as any)?.deliveryFee ?? (orderDetail as any)?.fees?.deliveryFee ?? 0;

    doc.text(`Subtotal: ${totalSubtotal.toFixed(2)}`, pageWidth - margin - 5, yPos + 7, { align: 'right' });
    doc.text(`Tax: ${totalTax.toFixed(2)}`, pageWidth - margin - 5, yPos + 15, { align: 'right' });
    doc.text(`Handling Charges: ${Number(pdfPlatformFee).toFixed(2)}`, pageWidth - margin - 5, yPos + 23, { align: 'right' });
    doc.text(`Delivery Charges: ${Number(pdfDeliveryFee).toFixed(2)}`, pageWidth - margin - 5, yPos + 31, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(`Grand Total: ${grandTotal.toFixed(2)}`, pageWidth - margin - 5, yPos + 25, { align: 'right' });

    doc.save(`Invoice_${orderDetail.invoiceNumber}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Accepted':
        return 'bg-blue-100 text-blue-800 border border-blue-400';
      case 'On the way':
        return 'bg-purple-100 text-purple-800 border border-purple-400';
      case 'Delivered':
        return 'bg-green-100 text-green-800 border border-green-400';
      case 'Cancelled':
        return 'bg-red-100 text-red-800 border border-red-400';
      case 'Out For Delivery':
        return 'bg-blue-600 text-white border border-blue-700';
      case 'Received':
        return 'bg-blue-50 text-blue-600 border border-blue-200';
      case 'Payment Pending':
        return 'bg-orange-50 text-orange-600 border border-orange-200';
      default:
        return 'bg-gray-50 text-gray-600 border border-gray-200';
    }
  };

  const formatUnit = (unit: string, qty: number) => {
    if (!unit || unit === 'N/A') return 'N/A';

    // improved regex to handle decimals and various spacing
    const match = unit.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)$/);
    if (match) {
      const val = parseFloat(match[1]);
      const u = match[2];
      // check if val is a valid number
      if (!isNaN(val)) {
        const total = val * qty;
        // Format to remove trailing zeros if integer (e.g. 1.0 -> 1)
        return `${parseFloat(total.toFixed(2))}${u}`;
      }
    }
    return `${unit} x ${qty}`;
  };

  // Tax Calculations for Invoice Preview
  const isInterState = orderDetail.deliveryAddress?.state &&
    orderDetail.deliveryAddress.state.toLowerCase() !== COMPANY_DETAILS.state.toLowerCase();

  const invoiceItems = orderDetail.items?.map((item: any) => {
    const unitPrice = item.price || 0;
    const quantity = item.qty || 0;
    const amount = item.subtotal || (unitPrice * quantity);
    let gstRate = 0;
    if (typeof item.taxPercent === 'number') {
      gstRate = item.taxPercent;
    } else if (typeof item.gstPercentage === 'number') {
      gstRate = item.gstPercentage;
    } else if (item.taxPercent !== undefined && item.taxPercent !== null) {
      gstRate = Number(item.taxPercent) || 0;
    } else if (item.gstPercentage !== undefined && item.gstPercentage !== null) {
      gstRate = Number(item.gstPercentage) || 0;
    } else if (item.product?.gstPercentage !== undefined && item.product?.gstPercentage !== null) {
      gstRate = Number(item.product.gstPercentage) || 0;
    }
    const taxableValue = amount / (1 + gstRate / 100);
    const gstAmount = amount - taxableValue;
    const weight = item.unit || '-';

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

  const totalTaxableValue = invoiceItems.reduce((sum: number, item: any) => sum + item.taxableValue, 0);
  const totalGst = invoiceItems.reduce((sum: number, item: any) => sum + item.gstAmount, 0);

  const cgst = isInterState ? 0 : totalGst / 2;
  const sgst = isInterState ? 0 : totalGst / 2;
  const igst = isInterState ? totalGst : 0;

  const platformFee = (orderDetail as any)?.platformFee ?? (orderDetail as any)?.fees?.platformFee ?? 0;
  const deliveryFee = (orderDetail as any)?.shipping ?? (orderDetail as any)?.deliveryFee ?? (orderDetail as any)?.fees?.deliveryFee ?? 0;

  const invoiceGrandTotal = orderDetail.grandTotal || (totalTaxableValue + totalGst + deliveryFee + platformFee);

  const getSequenceFromOrder = (value?: string): number => {
    if (!value) return 1;
    const digits = value.replace(/\D/g, '');
    if (!digits) return 1;
    const lastThree = digits.slice(-3);
    const parsed = parseInt(lastThree, 10);
    return Number.isNaN(parsed) ? 1 : parsed;
  };

  const orderSequence = getSequenceFromOrder(orderDetail.invoiceNumber || orderDetail.id);
  const orderIdDisplay = `UDP-${String(orderSequence).padStart(3, '0')}`;
  const invoiceNumberDisplay = `MB-${String(orderSequence).padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-neutral-50 pb-8">
      {/* Order Action Section */}
      <div className="bg-white mb-6 rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
        <div className="bg-teal-600 text-white px-4 sm:px-6 py-3">
          <h2 className="text-base sm:text-lg font-semibold">Order Action Section</h2>
        </div>
        <div className="bg-neutral-50 px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex-1 w-full sm:w-auto">
              {orderStatus === 'Received' ? (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleStatusUpdate('Accepted')}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors font-medium shadow-sm"
                  >
                    Accept Order
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors font-medium shadow-sm"
                  >
                    Reject Order
                  </button>
                </div>
              ) : (
                <select
                  value={orderStatus}
                  onChange={(e) => handleStatusUpdate(e.target.value)}
                  className="w-full sm:w-64 px-4 py-2 border border-neutral-300 rounded-lg text-sm text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  disabled={orderStatus === 'Rejected' || orderStatus === 'Cancelled' || orderStatus === 'Delivered'}
                >
                  <option value="Accepted">Accepted</option>
                  <option value="On the way">On the way</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                  {orderStatus === 'Rejected' && <option value="Rejected">Rejected</option>}
                </select>
              )}
            </div>
            <button
              onClick={handleResendNotification}
              disabled={notificationLoading || orderStatus !== 'Accepted' || !!orderDetail.deliveryBoyName}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium print:hidden ${notificationLoading || orderStatus !== 'Accepted' || !!orderDetail.deliveryBoyName
                ? 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
                : 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm'
                }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              {notificationLoading ? 'Sending...' : 'Resend Notification'}
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium print:hidden"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              Export Invoice PDF
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium print:hidden"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Print Invoice
            </button>
          </div>

          {orderDetail.specialRequests?.trim() && (
            <div className="mt-4 bg-white border border-orange-200 rounded-lg p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-700 mb-1">Customer Special Request</p>
              <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">{orderDetail.specialRequests}</p>
            </div>
          )}
        </div>
      </div>

      {/* Reusable Tax Invoice Section (Blinkit Style) */}
      <div className="bg-white rounded-lg shadow-lg border border-neutral-200 overflow-hidden print:shadow-none print:border-0 print:p-0">
        <div className="bg-teal-600 text-white px-4 sm:px-6 py-3 print:hidden">
          <h2 className="text-base sm:text-lg font-semibold">Tax Invoice Preview</h2>
        </div>

        {/* The Actual Invoice (Redesigned Layout) */}
        <div
          id="tax-invoice-container"
          className="w-full max-w-[210mm] mx-auto bg-white border border-gray-300 p-4 sm:p-8 print:border-0 print:p-0 font-sans text-[10px] sm:text-[12px] text-black relative z-10">

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
                <div className="w-16 h-16 sm:w-20 sm:h-20 border border-gray-200 bg-gray-50 flex items-center justify-center p-1">
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${orderDetail.id}`} alt="QR Code" className="w-full h-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Seller and Buyer Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border border-gray-400 mb-6">
            {/* Sold By / Seller */}
            <div className="border-b sm:border-b-0 sm:border-r border-gray-400 p-3">
              <p className="font-bold text-gray-700 mb-2 border-b border-gray-200 pb-1 uppercase tracking-wider text-[9px] sm:text-[11px]">Sold By / Seller</p>
              <p className="font-bold text-sm mb-1">{COMPANY_DETAILS.registeredName}</p>
              <p className="text-gray-600 leading-relaxed mb-2">
                {COMPANY_DETAILS.address}
              </p>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[9px] sm:text-[10px]">
                <p className="font-bold text-gray-500">GSTIN</p>
                <p className="font-bold">: {COMPANY_DETAILS.gstin}</p>
                <p className="font-bold text-gray-500">FSSAI License Number</p>
                <p className="font-bold">: {COMPANY_DETAILS.fssai}</p>
                <p className="font-bold text-gray-500">PAN</p>
                <p className="font-bold">: {COMPANY_DETAILS.pan}</p>
              </div>
            </div>

            {/* Invoice To / Order Details */}
            <div className="flex flex-col">
              <div className="p-3 border-b border-gray-400 flex-1">
                <p className="font-bold text-gray-700 mb-2 border-b border-gray-200 pb-1 uppercase tracking-wider text-[9px] sm:text-[11px]">Invoice To</p>
                <p className="font-bold text-sm mb-1">{orderDetail.customerName}</p>
                <p className="text-gray-600 leading-relaxed">
                  {orderDetail.deliveryAddress?.address || 'N/A'}, {orderDetail.deliveryAddress?.city || ''}
                </p>
              </div>
              <div className="p-3 bg-gray-50 grid grid-cols-2 gap-y-1">
                <p className="font-bold text-gray-500 uppercase text-[8px] sm:text-[9px]">Order Id</p>
                <p className="font-bold">: {orderIdDisplay}</p>
                <p className="font-bold text-gray-500 uppercase text-[8px] sm:text-[9px]">Invoice Date</p>
                <p className="font-bold">: {formatDate(orderDetail.orderDate)}</p>
                <p className="font-bold text-gray-500 uppercase text-[8px] sm:text-[9px]">Place of Supply</p>
                <p className="font-bold">: {orderDetail.deliveryAddress?.state || COMPANY_DETAILS.state}</p>
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
                  <th className="border-r border-black/10 p-1 w-10 text-center">CGST (%)</th>
                  <th className="border-r border-gray-400 p-1 w-12 text-center">CGST (INR)</th>
                  <th className="border-r border-black/10 p-1 w-10 text-center">SGST (%)</th>
                  <th className="border-r border-gray-400 p-1 w-12 text-center">SGST (INR)</th>
                  <th className="border-r border-gray-400 p-1 w-10 text-center">Cess (%)</th>
                  <th className="p-1 w-16 text-center">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoiceItems.map((item: any, index: number) => (
                  <tr key={index} className="border-b border-gray-200 last:border-b-0">
                    <td className="border-r border-gray-400 p-1 text-center">{index + 1}</td>
                    <td className="border-r border-gray-400 p-1 text-center">{item.hsnCode || '-'}</td>
                    <td className="border-r border-gray-400 p-1 text-left">
                      <p className="font-bold">{item.product}</p>
                      {item.hsnCode && <p className="text-[7px] sm:text-[8px] text-gray-500">(HSN-{item.hsnCode})</p>}
                    </td>
                    <td className="border-r border-gray-400 p-1 text-center font-bold text-green-700">{item.weight || '-'}</td>
                    <td className="border-r border-gray-400 p-1 text-center">{(item.unitPrice || 0).toFixed(2)}</td>
                    <td className="border-r border-gray-400 p-1 text-center">{item.quantity}</td>
                    <td className="border-r border-gray-400 p-1 text-center">{(item.taxableValue || 0).toFixed(2)}</td>
                    <td className="border-r border-black/10 p-1 text-center">{item.gstRate / 2}%</td>
                    <td className="border-r border-gray-400 p-1 text-center">{(item.gstAmount / 2 || 0).toFixed(2)}</td>
                    <td className="border-r border-black/10 p-1 text-center">{item.gstRate / 2}%</td>
                    <td className="border-r border-gray-400 p-1 text-center">{(item.gstAmount / 2 || 0).toFixed(2)}</td>
                    <td className="border-r border-gray-400 p-1 text-center">0.00</td>
                    <td className="p-1 text-center font-bold">{(item.amount || 0).toFixed(2)}</td>
                  </tr>
                ))}
                {invoiceItems.length < 5 && Array.from({ length: 5 - invoiceItems.length }).map((_, i) => (
                  <tr key={`empty-${i}`} className="h-8 border-b border-gray-200">
                    <td className="border-r border-gray-400"></td>
                    <td className="border-r border-gray-400"></td>
                    <td className="border-r border-gray-400"></td>
                    <td className="border-r border-gray-400"></td>
                    <td className="border-r border-gray-400"></td>
                    <td className="border-r border-gray-400"></td>
                    <td className="border-r border-gray-400"></td>
                    <td className="border-r border-black/10"></td>
                    <td className="border-r border-gray-400"></td>
                    <td className="border-r border-black/10"></td>
                    <td className="border-r border-gray-400"></td>
                    <td className="border-r border-gray-400"></td>
                    <td></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 border-t border-gray-400 font-bold">
                  <td className="border-r border-gray-400 p-1 text-left" colSpan={5}>Total</td>
                  <td className="border-r border-gray-400 p-1 text-center">{invoiceItems.reduce((s: number, i: any) => s + (i.quantity || 0), 0)}</td>
                  <td className="border-r border-gray-400 p-1 text-center">{totalTaxableValue.toFixed(2)}</td>
                  <td className="border-r border-black/10"></td>
                  <td className="border-r border-gray-400 p-1 text-center">{cgst.toFixed(2)}</td>
                  <td className="border-r border-black/10"></td>
                  <td className="border-r border-gray-400 p-1 text-center">{sgst.toFixed(2)}</td>
                  <td className="border-r border-gray-400"></td>
                  <td className="p-1 text-center">{invoiceGrandTotal.toFixed(2)}</td>
                </tr>
                <tr className="border-t border-gray-400 font-bold">
                  <td className="border-r border-gray-400 p-1 text-left" colSpan={12}>Handling Charges</td>
                  <td className="p-1 text-center">{Number(platformFee).toFixed(2)}</td>
                </tr>
                <tr className="border-t border-gray-400 font-bold">
                  <td className="border-r border-gray-400 p-1 text-left" colSpan={12}>Delivery Charges</td>
                  <td className="p-1 text-center">{Number(deliveryFee).toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="border border-gray-400 p-2 mb-4 bg-gray-50">
            <p className="font-bold mb-1"><span className="text-gray-500 uppercase text-[8px] sm:text-[9px]">Amount in Words:</span> {numberToWords(invoiceGrandTotal)}</p>
          </div>

          {/* Bottom Seller / Signature Section */}
          <div className="grid grid-cols-1 sm:grid-cols-[1.5fr_1fr] border border-gray-400 mb-6">
            <div className="p-3 border-b sm:border-b-0 sm:border-r border-gray-400">
              <p className="font-bold text-sm mb-2">{COMPANY_DETAILS.registeredName}</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[8px] sm:text-[10px]">
                <p><span className="font-bold text-gray-500 uppercase">GSTIN</span> : {COMPANY_DETAILS.gstin}</p>
                <p><span className="font-bold text-gray-500 uppercase">FSSAI License Number</span> : {COMPANY_DETAILS.fssai}</p>
                <p><span className="font-bold text-gray-500 uppercase">PAN</span> : {COMPANY_DETAILS.pan}</p>
              </div>
            </div>
            <div className="p-3 flex flex-col items-center justify-between min-h-[100px]">
              <div className="flex-1 flex items-center justify-center">
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
      </div>

      {/* Footer */}
      <footer className="mt-6 px-4 sm:px-6 text-center py-4 bg-neutral-100 rounded-lg">
        <p className="text-xs sm:text-sm text-neutral-600">
          Copyright 2025. Developed By{' '}
          <span className="font-semibold text-teal-600">Mandi Bazaar - Delivery at your doorstep App</span>
        </p>
      </footer>

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-lg">
            <div className="border-b border-neutral-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-neutral-900">Reject Order</h3>
            </div>
            <div className="px-4 py-4 space-y-3">
              <p className="text-sm text-neutral-700">
                Are you sure you want to reject this order? This cannot be undone.
              </p>
              {orderDetail.specialRequests?.trim() && (
                <div className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-orange-700 mb-1">
                    Customer Special Request
                  </p>
                  <p className="text-sm text-orange-800 whitespace-pre-wrap">
                    {orderDetail.specialRequests}
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-4 py-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-sm text-neutral-700 hover:text-neutral-900"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  handleStatusUpdate('Rejected');
                }}
                className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-md"
              >
                Reject Order
              </button>
            </div>
          </div>
        </div>
      )}
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


