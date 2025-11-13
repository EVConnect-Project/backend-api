import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// PDF Export for Analytics
export const exportAnalyticsToPDF = (data: any, startDate: string, endDate: string) => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(20);
  doc.text('EVConnect Analytics Report', 14, 20);
  
  // Date Range
  doc.setFontSize(10);
  doc.text(`Date Range: ${startDate} to ${endDate}`, 14, 28);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 33);
  
  // Summary Section
  doc.setFontSize(14);
  doc.text('Summary', 14, 45);
  
  const summaryData = [
    ['Total Revenue', `$${data.summary.totalRevenue.toLocaleString()}`],
    ['Revenue Growth', `${data.summary.revenueGrowth}%`],
    ['Total Bookings', data.summary.totalBookings.toString()],
    ['Booking Growth', `${data.summary.bookingGrowth}%`],
    ['Avg Session Duration', `${data.summary.avgSessionDuration} minutes`],
    ['Peak Hour', data.summary.peakHour],
  ];
  
  autoTable(doc, {
    startY: 50,
    head: [['Metric', 'Value']],
    body: summaryData,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
  });
  
  // User Growth Section
  let finalY = (doc as any).lastAutoTable.finalY || 50;
  doc.setFontSize(14);
  doc.text('User Growth', 14, finalY + 15);
  
  const userGrowthData = data.userGrowth.slice(0, 10).map((item: any) => [
    item.date,
    item.users.toString(),
    item.newUsers.toString(),
  ]);
  
  autoTable(doc, {
    startY: finalY + 20,
    head: [['Date', 'Total Users', 'New Users']],
    body: userGrowthData,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
  });
  
  // Revenue by Location (New Page)
  doc.addPage();
  doc.setFontSize(14);
  doc.text('Revenue by Location', 14, 20);
  
  const revenueData = data.revenueByLocation.map((item: any) => [
    item.location,
    `$${item.revenue.toFixed(2)}`,
    item.bookings.toString(),
  ]);
  
  autoTable(doc, {
    startY: 25,
    head: [['Location', 'Revenue', 'Bookings']],
    body: revenueData,
    theme: 'striped',
    headStyles: { fillColor: [16, 185, 129] },
  });
  
  // Charger Utilization
  finalY = (doc as any).lastAutoTable.finalY || 25;
  doc.setFontSize(14);
  doc.text('Charger Utilization', 14, finalY + 15);
  
  const utilizationData = data.chargerUtilization.map((item: any) => [
    item.charger,
    `${item.utilization}%`,
    `${item.hours} hours`,
  ]);
  
  autoTable(doc, {
    startY: finalY + 20,
    head: [['Charger', 'Utilization', 'Hours Used']],
    body: utilizationData,
    theme: 'grid',
    headStyles: { fillColor: [139, 92, 246] },
  });
  
  // Save PDF
  doc.save(`evconnect-analytics-${startDate}-to-${endDate}.pdf`);
};

// Excel Export for Tables
export const exportToExcel = (data: any[], filename: string, sheetName: string = 'Sheet1') => {
  // Create a new workbook
  const wb = XLSX.utils.book_new();
  
  // Convert data to worksheet
  const ws = XLSX.utils.json_to_sheet(data);
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  
  // Save file
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

// Export Users to Excel
export const exportUsersToExcel = (users: any[]) => {
  const data = users.map(user => ({
    ID: user.id,
    Name: user.name,
    Email: user.email,
    Role: user.role,
    Status: user.isBanned ? 'Banned' : 'Active',
    'Created At': new Date(user.createdAt).toLocaleString(),
  }));
  
  exportToExcel(data, 'evconnect-users', 'Users');
};

// Export Chargers to Excel
export const exportChargersToExcel = (chargers: any[]) => {
  const data = chargers.map(charger => ({
    ID: charger.id,
    Name: charger.name,
    Address: charger.address,
    'Power (kW)': charger.powerKw,
    'Price per kWh': `$${charger.pricePerKwh}`,
    Status: charger.status,
    Verified: charger.verified ? 'Yes' : 'No',
    Owner: charger.owner?.name || 'N/A',
    'Owner Email': charger.owner?.email || 'N/A',
    'Created At': new Date(charger.createdAt).toLocaleString(),
  }));
  
  exportToExcel(data, 'evconnect-chargers', 'Chargers');
};

// Export Bookings to Excel
export const exportBookingsToExcel = (bookings: any[]) => {
  const data = bookings.map(booking => ({
    ID: booking.id,
    User: booking.user?.name || 'N/A',
    'User Email': booking.user?.email || 'N/A',
    Charger: booking.charger?.name || 'N/A',
    Location: booking.charger?.address || 'N/A',
    'Start Time': new Date(booking.startTime).toLocaleString(),
    'End Time': new Date(booking.endTime).toLocaleString(),
    Status: booking.status,
    'Energy (kWh)': booking.energyConsumed.toFixed(2),
    Cost: `$${booking.totalCost.toFixed(2)}`,
    'Created At': new Date(booking.createdAt).toLocaleString(),
  }));
  
  exportToExcel(data, 'evconnect-bookings', 'Bookings');
};

// PDF Export for Data Tables
export const exportTableToPDF = (
  data: any[],
  columns: { header: string; dataKey: string }[],
  title: string,
  filename: string
) => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.text(title, 14, 20);
  
  // Date
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
  
  // Extract body data based on columns
  const body = data.map(row => 
    columns.map(col => {
      const value = col.dataKey.split('.').reduce((obj, key) => obj?.[key], row);
      return value !== null && value !== undefined ? value.toString() : 'N/A';
    })
  );
  
  // Create table
  autoTable(doc, {
    startY: 35,
    head: [columns.map(col => col.header)],
    body: body,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 9 },
    margin: { top: 35 },
  });
  
  // Save PDF
  doc.save(`${filename}.pdf`);
};

// Export Users to PDF
export const exportUsersToPDF = (users: any[]) => {
  const columns = [
    { header: 'Name', dataKey: 'name' },
    { header: 'Email', dataKey: 'email' },
    { header: 'Role', dataKey: 'role' },
    { header: 'Status', dataKey: 'status' },
    { header: 'Created', dataKey: 'createdAt' },
  ];
  
  const formattedUsers = users.map(user => ({
    ...user,
    status: user.isBanned ? 'Banned' : 'Active',
    createdAt: new Date(user.createdAt).toLocaleDateString(),
  }));
  
  exportTableToPDF(formattedUsers, columns, 'EVConnect Users', 'evconnect-users');
};

// Export Chargers to PDF
export const exportChargersToPDF = (chargers: any[]) => {
  const columns = [
    { header: 'Name', dataKey: 'name' },
    { header: 'Location', dataKey: 'address' },
    { header: 'Power', dataKey: 'powerKw' },
    { header: 'Price', dataKey: 'pricePerKwh' },
    { header: 'Status', dataKey: 'status' },
    { header: 'Verified', dataKey: 'verified' },
  ];
  
  const formattedChargers = chargers.map(charger => ({
    ...charger,
    powerKw: `${charger.powerKw} kW`,
    pricePerKwh: `$${charger.pricePerKwh}`,
    verified: charger.verified ? 'Yes' : 'No',
  }));
  
  exportTableToPDF(formattedChargers, columns, 'EVConnect Chargers', 'evconnect-chargers');
};

// Export Bookings to PDF
export const exportBookingsToPDF = (bookings: any[]) => {
  const columns = [
    { header: 'User', dataKey: 'user.name' },
    { header: 'Charger', dataKey: 'charger.name' },
    { header: 'Start', dataKey: 'startTime' },
    { header: 'Status', dataKey: 'status' },
    { header: 'Energy', dataKey: 'energyConsumed' },
    { header: 'Cost', dataKey: 'totalCost' },
  ];
  
  const formattedBookings = bookings.map(booking => ({
    ...booking,
    startTime: new Date(booking.startTime).toLocaleDateString(),
    energyConsumed: `${booking.energyConsumed.toFixed(2)} kWh`,
    totalCost: `$${booking.totalCost.toFixed(2)}`,
  }));
  
  exportTableToPDF(formattedBookings, columns, 'EVConnect Bookings', 'evconnect-bookings');
};
