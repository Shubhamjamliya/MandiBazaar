import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getOrderById, updateOrderStatus, OrderDetail } from '../../../services/api/orderService';
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
  gstin: "08DGVPP0057C1Z7",
  address: "Krishna Vila, 75 D, E Block, Pratap Nagar, Udaipur, Rajasthan 313001",
  phone: "91 8959522509",
  state: "RAJASTHAN",
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
    doc.text(`Invoice No: ${orderDetail.invoiceNumber}`, margin + 5, yPos + 7);
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
    doc.text(`Subtotal: ${totalSubtotal.toFixed(2)}`, pageWidth - margin - 5, yPos + 7, { align: 'right' });
    doc.text(`Tax: ${totalTax.toFixed(2)}`, pageWidth - margin - 5, yPos + 15, { align: 'right' });
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

      {/* Reusable Tax Invoice Section (Matches Image 1) */}
      <div className="bg-white rounded-lg shadow-lg border border-neutral-200 overflow-hidden print:shadow-none print:border-0 print:p-0">
        <div className="bg-teal-600 text-white px-4 sm:px-6 py-3 print:hidden">
          <h2 className="text-base sm:text-lg font-semibold">Tax Invoice Preview</h2>
        </div>
        
        {/* The Actual Invoice (Styled to match IMAGE 1) */}
        <div className="p-4 sm:p-8 font-serif text-black max-w-[210mm] mx-auto bg-white print:p-0">
          {/* Header Section */}
          <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-2">
            <div className="flex-1">
              <p className="text-[10px] sm:text-xs font-bold">GSTIN : {COMPANY_DETAILS.gstin}</p>
              <div className="mt-2 text-[10px] sm:text-[11px] leading-tight">
                <p className="font-bold text-xs sm:text-sm">Mandi Bazaar</p>
                <p>{COMPANY_DETAILS.address}</p>
                <p>Phone : {COMPANY_DETAILS.phone}</p>
              </div>
            </div>
            
            <div className="text-center flex-1">
              <p className="text-[10px] sm:text-xs font-bold tracking-widest mb-1 underline">TAX INVOICE</p>
              <div className="flex flex-col items-center justify-center">
                <img src="/assets/logo/logo.png" alt="Mandi Bazaar Logo" className="w-8 h-8 sm:w-12 sm:h-12 object-contain" />
                <p className="text-[8px] sm:text-[10px] font-bold">TM</p>
              </div>
            </div>

            <div className="text-right flex-1 flex flex-col items-end">
              <h1 className="text-xl sm:text-3xl font-bold tracking-tighter">MANDI BAZAAR</h1>
            </div>
          </div>

          {/* Invoice Info Grid */}
          <div className="grid grid-cols-2 border border-black text-[10px] sm:text-[11px] mb-2">
            <div className="border-r border-black p-1 space-y-1">
              <p className="flex gap-2"><span className="w-20 sm:w-24 font-bold">Invoice No</span> : <span className="text-red-600 font-bold">{orderDetail.invoiceNumber || orderDetail.id?.split('-').pop()?.toUpperCase()}</span></p>
              <p className="flex gap-2"><span className="w-20 sm:w-24 font-bold">Reverse Charge</span> : <span>No</span></p>
            </div>
            <div className="p-1 space-y-1">
              <p className="flex gap-2"><span className="w-20 sm:w-24 font-bold">Invoice Date</span> : <span>{formatDate(orderDetail.orderDate)}</span></p>
              <div className="flex items-center gap-4">
                <p className="flex gap-2"><span className="w-20 sm:w-24 font-bold">State</span> : <span>{COMPANY_DETAILS.state}</span></p>
                <p className="flex gap-2"><span className="w-20 sm:w-16 font-bold">Code</span> : <span>{COMPANY_DETAILS.stateCode}</span></p>
              </div>
            </div>
          </div>

          {/* Receiver Details */}
          <div className="border border-black bg-gray-50 p-1 text-[10px] sm:text-[11px] font-bold mb-0">
            Details of Receiver | Billed to :
          </div>
          <div className="border border-black p-1 sm:p-2 text-[10px] sm:text-[11px] space-y-1 mb-2">
            {(() => {
              const addr = (orderDetail.deliveryAddress || (orderDetail as any).address || {}) as any;
              const name = addr.name || orderDetail.customerName || 'N/A';
              const phone = addr.phone || orderDetail.customerPhone || 'N/A';
              const fullAddress = addr.address || addr.street || '-';
              const city = addr.city || '-';
              const pincode = addr.pincode || '';
              
              return (
                <>
                  <p className="flex gap-2"><span className="w-20 sm:w-24 font-bold">Name</span> : <span className="font-bold">{name}</span></p>
                  <p className="flex gap-2"><span className="w-20 sm:w-24 font-bold">Address</span> : <span>{fullAddress}, {city} {pincode ? `(${pincode})` : ''}</span></p>
                  <div className="flex flex-wrap gap-x-8">
                    <p className="flex gap-2"><span className="w-20 sm:w-24 font-bold">Mob.</span> : <span>{phone}</span></p>
                    <p className="flex gap-2"><span className="w-20 sm:w-24 font-bold">Place of Supply</span> : <span>{city}</span></p>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Items Table */}
          <div className="border border-black mb-2">
            <table className="w-full text-[10px] sm:text-[11px] border-collapse">
              <thead>
                <tr className="border-b border-black font-bold bg-gray-50">
                  <th className="border-r border-black p-1 w-8">Sr.</th>
                  <th className="border-r border-black p-1 text-left">Name of Product / Service</th>
                  <th className="border-r border-black p-1 w-16">HSN</th>
                  <th className="border-r border-black p-1 w-10">Qty</th>
                  <th className="border-r border-black p-1 w-16">Rate</th>
                  <th className="p-1 w-20 sm:w-24">Amount (Rs)</th>
                </tr>
              </thead>
              <tbody>
                {orderDetail.items.map((item, index) => (
                  <tr key={index} className="border-b border-black/10 last:border-0 h-8">
                    <td className="border-r border-black p-1 text-center">{index + 1}</td>
                    <td className="border-r border-black p-1">{item.product}</td>
                    <td className="border-r border-black p-1 text-center">{item.hsnCode || '-'}</td>
                    <td className="border-r border-black p-1 text-center">{item.qty}</td>
                    <td className="border-r border-black p-1 text-right">{item.price.toFixed(0)}</td>
                    <td className="p-1 text-right">{item.subtotal.toFixed(2)}</td>
                  </tr>
                ))}
                {/* Filler rows to maintain height */}
                {Array.from({ length: Math.max(0, 8 - orderDetail.items.length) }).map((_, i) => (
                  <tr key={`filler-${i}`} className="h-8 border-b border-black/5 last:border-0">
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    <td></td>
                  </tr>
                ))}
                <tr className="h-10 border-t border-black">
                   <td className="border-r border-black"></td>
                   <td className="p-1 align-bottom border-r border-black">
                     <span className="bg-black text-white px-2 py-0.5 rounded text-[8px] font-bold italic">CASH/CREDIT</span>
                   </td>
                   <td className="border-r border-black"></td>
                   <td className="border-r border-black"></td>
                   <td className="border-r border-black"></td>
                   <td></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer Summary Section */}
          {(() => {
            const totalSubtotal = orderDetail.items.reduce((sum, item) => sum + item.subtotal, 0);
            const totalTax = orderDetail.items.reduce((sum, item) => sum + item.tax, 0);
            const grandTotal = totalSubtotal + totalTax;
            return (
              <div className="grid grid-cols-[1fr_200px] border border-black text-[10px] sm:text-[11px]">
                <div className="flex flex-col border-r border-black">
                  <div className="p-2 border-b border-black min-h-[40px]">
                    <p className="font-bold uppercase text-[9px]">Total Invoice Amount in words :</p>
                    <p className="mt-1 italic">{numberToWords(grandTotal)}</p>
                  </div>
                  <div className="grid grid-cols-[1.2fr_1fr] flex-1">
                    <div className="p-2 border-r border-black leading-tight">
                      <p className="font-bold underline mb-1">Bank Name : {BANK_DETAILS.name}</p>
                      <p><span className="w-20 inline-block font-bold">A/c No.</span> : {BANK_DETAILS.accountNo}</p>
                      <p><span className="w-20 inline-block font-bold">IFSC</span> : {BANK_DETAILS.ifsc}</p>
                    </div>
                    <div className="flex flex-col justify-end items-center p-2 text-center italic">
                      <p className="text-[8px] mb-4">(Customer Sign & Common Seal)</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col">
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr className="border-b border-black h-7">
                        <td className="p-1 font-bold text-right pr-2">Subtotal</td>
                        <td className="border-l border-black p-1 text-right w-20">{totalSubtotal.toFixed(2)}</td>
                      </tr>
                      <tr className="border-b border-black h-7">
                        <td className="p-1 text-right pr-2">Tax Amount</td>
                        <td className="border-l border-black p-1 text-right">{totalTax.toFixed(2)}</td>
                      </tr>
                      <tr className="border-b border-black h-7 bg-gray-100">
                        <td className="p-1 font-bold text-right pr-2 uppercase">Grand Total</td>
                        <td className="border-l border-black p-1 text-right font-bold">{grandTotal.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="flex-1 border-t border-black p-2 flex flex-col justify-between items-center text-center">
                    <p className="text-[7px] leading-tight">Certified that the particulars given above are true and correct</p>
                    <p className="font-bold text-[9px] mt-1">for MANDI BAZAAR</p>
                    <div className="h-4"></div>
                    <p className="text-[8px] font-bold underline">Authorised Signatory</p>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="mt-2 text-[8px] sm:text-[9px] font-medium flex justify-between">
            <p>Subject to Udaipur Jurisdiction</p>
            <p>E. & OE.</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-6 px-4 sm:px-6 text-center py-4 bg-neutral-100 rounded-lg">
        <p className="text-xs sm:text-sm text-neutral-600">
          Copyright 2025. Developed By{' '}
          <span className="font-semibold text-teal-600">Mandi Bazaar - 20 MIN App</span>
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
          /* Hide everything except the invoice section when printing */
          .print\\:hidden, 
          header, 
          aside, 
          footer, 
          nav,
          .bg-neutral-50.pb-8 > div:not(.print\\:shadow-none) {
            display: none !important;
          }
          .min-h-screen {
            min-height: 0 !important;
          }
          .bg-neutral-50 {
             background-color: white !important;
          }
          /* Ensure the invoice container takes full width and looks perfect */
          .max-w-[210mm] {
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 15mm !important;
            box-shadow: none !important;
            border: 0 !important;
          }
          /* Fix font for printing */
          * {
            color: black !important;
          }
        }
      `}</style>
    </div>
  );
}


