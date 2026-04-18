import jsPDF from 'jspdf';

interface QuoteData {
  ticketId: string;
  machineType: string;
  machineModel: string;
  machineSerial: string;
  location: string;
  urgency: string;
  description: string;
  errorCodes: string;
  quoteAmount: number;
  quoteDescription: string;
  quoteSentAt: string;
  quoteExpiresAt: string;
  ownerName: string;
}

export function generateQuotePdf(data: QuoteData) {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  const addLine = (text: string, size: number, bold: boolean, color: [number, number, number] = [33, 33, 33]) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(text, margin, y);
    y += size * 0.5 + 2;
  };

  const addKeyValue = (key: string, value: string) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(key, margin, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(33, 33, 33);
    doc.text(value, margin + 50, y);
    y += 6;
  };

  doc.setFillColor(17, 24, 39);
  doc.rect(0, 0, pageW, 42, 'F');

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(251, 191, 36);
  doc.text('EquipLink', margin, 18);

  doc.setFontSize(9);
  doc.setTextColor(180, 180, 180);
  doc.text('Verified Service Dispatch Platform', margin, 26);

  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('SERVICE QUOTATION', margin, 37);

  doc.setFontSize(9);
  doc.setTextColor(180, 180, 180);
  doc.text(`Quote #${data.ticketId.slice(0, 8).toUpperCase()}`, pageW - margin - 40, 18);
  doc.text(`Date: ${new Date(data.quoteSentAt).toLocaleDateString()}`, pageW - margin - 40, 26);

  y = 54;
  addLine('Prepared For', 10, true, [120, 120, 120]);
  y += 1;
  addLine(data.ownerName || 'Machine Owner', 13, true);
  y += 6;

  doc.setDrawColor(230, 230, 230);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  addLine('MACHINE DETAILS', 10, true, [120, 120, 120]);
  y += 2;
  addKeyValue('Type:', data.machineType || '--');
  addKeyValue('Model:', data.machineModel || '--');
  addKeyValue('Serial No.:', data.machineSerial || '--');
  addKeyValue('Location:', data.location || '--');
  addKeyValue('Urgency:', data.urgency ? data.urgency.toUpperCase() : '--');
  y += 4;

  addLine('REPORTED ISSUE', 10, true, [120, 120, 120]);
  y += 2;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  const descLines = doc.splitTextToSize(data.description || '--', pageW - margin * 2);
  doc.text(descLines, margin, y);
  y += descLines.length * 5 + 4;

  if (data.errorCodes) {
    addKeyValue('Error Codes:', data.errorCodes);
    y += 4;
  }

  doc.setDrawColor(230, 230, 230);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  addLine('SCOPE & DESCRIPTION', 10, true, [120, 120, 120]);
  y += 2;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  const scopeLines = doc.splitTextToSize(data.quoteDescription || '--', pageW - margin * 2);
  doc.text(scopeLines, margin, y);
  y += scopeLines.length * 5 + 8;

  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, y - 2, pageW - margin * 2, 24, 3, 3, 'F');
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text('Total Service Cost', margin + 6, y + 8);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text(`ETB ${data.quoteAmount.toLocaleString()}`, pageW - margin - 6, y + 12, { align: 'right' });
  y += 30;

  if (data.quoteExpiresAt) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 80, 80);
    doc.text(`This quotation expires on ${new Date(data.quoteExpiresAt).toLocaleDateString()}`, margin, y);
    y += 8;
  }

  y += 4;
  doc.setDrawColor(230, 230, 230);
  doc.line(margin, y, pageW - margin, y);
  y += 10;

  doc.setFontSize(8);
  doc.setTextColor(160, 160, 160);
  doc.text('This is a system-generated quotation from EquipLink.', margin, y);
  y += 5;
  doc.text('All dispatch is coordinated through the EquipLink platform for your security.', margin, y);
  y += 5;
  doc.text('Payment is held securely until the job is confirmed complete.', margin, y);

  doc.save(`EquipLink-Quote-${data.ticketId.slice(0, 8).toUpperCase()}.pdf`);
}
