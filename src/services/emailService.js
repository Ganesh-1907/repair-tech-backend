import nodemailer from 'nodemailer';

const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn('[Email] EMAIL_USER / EMAIL_PASSWORD not configured — email will be skipped.');
    return null;
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

const from = () => `"RepairBoy Enterprise" <${process.env.ADMIN_EMAIL || process.env.EMAIL_USER}>`;

export const sendCredentialEmail = async ({ to, customerName, password, contractIds, loginUrl }) => {
  const transporter = createTransporter();
  if (!transporter) return { skipped: true };

  const contractList = (contractIds || []).join(', ') || 'N/A';

  await transporter.sendMail({
    from: from(),
    to,
    subject: 'Your Customer Portal Access — RepairBoy Enterprise',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#0f172a;">
        <div style="background:#4f46e5;padding:24px 28px;border-radius:12px 12px 0 0;">
          <h2 style="margin:0;color:#fff;font-size:1.3rem;">RepairBoy Customer Portal</h2>
        </div>
        <div style="padding:28px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
          <p style="margin:0 0 16px;">Dear <strong>${customerName}</strong>,</p>
          <p style="margin:0 0 20px;color:#475569;">Your portal access has been set up. Use the credentials below to log in and view your contracts, repair history, and invoices.</p>
          <table style="width:100%;border-collapse:collapse;margin:0 0 20px;">
            <tr>
              <td style="padding:10px 14px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:600;width:36%;color:#64748b;font-size:0.85rem;">PORTAL URL</td>
              <td style="padding:10px 14px;border:1px solid #e2e8f0;border-left:none;"><a href="${loginUrl}" style="color:#4f46e5;">${loginUrl}</a></td>
            </tr>
            <tr>
              <td style="padding:10px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-top:none;font-weight:600;color:#64748b;font-size:0.85rem;">EMAIL</td>
              <td style="padding:10px 14px;border:1px solid #e2e8f0;border-left:none;border-top:none;">${to}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-top:none;font-weight:600;color:#64748b;font-size:0.85rem;">PASSWORD</td>
              <td style="padding:10px 14px;border:1px solid #e2e8f0;border-left:none;border-top:none;font-family:monospace;font-size:1.1rem;color:#4f46e5;letter-spacing:2px;font-weight:700;">${password}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-top:none;font-weight:600;color:#64748b;font-size:0.85rem;">CONTRACT(S)</td>
              <td style="padding:10px 14px;border:1px solid #e2e8f0;border-left:none;border-top:none;">${contractList}</td>
            </tr>
          </table>
          <p style="margin:0;color:#94a3b8;font-size:0.82rem;">If you did not expect this email, please contact us immediately. This message was sent automatically by RepairBoy Enterprise.</p>
        </div>
      </div>
    `,
  });

  console.log(`[Email] Credential email sent to ${to}`);
  return { sent: true };
};

export const sendStaffCredentialEmail = async ({ to, name, password, loginUrl }) => {
  const transporter = createTransporter();
  if (!transporter) return { skipped: true };

  await transporter.sendMail({
    from: from(),
    to,
    subject: 'Your RepairBoy Staff Account — Login Credentials',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#0f172a;">
        <div style="background:#0f172a;padding:24px 28px;border-radius:12px 12px 0 0;">
          <h2 style="margin:0;color:#fff;font-size:1.3rem;">RepairBoy Staff Portal</h2>
        </div>
        <div style="padding:28px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
          <p style="margin:0 0 16px;">Hello <strong>${name}</strong>,</p>
          <p style="margin:0 0 20px;color:#475569;">Your staff account has been created. Use the credentials below to sign in. You will be asked to set a new password on your first login.</p>
          <table style="width:100%;border-collapse:collapse;margin:0 0 20px;">
            <tr>
              <td style="padding:10px 14px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:600;width:36%;color:#64748b;font-size:0.85rem;">LOGIN URL</td>
              <td style="padding:10px 14px;border:1px solid #e2e8f0;border-left:none;"><a href="${loginUrl}" style="color:#4f46e5;">${loginUrl}</a></td>
            </tr>
            <tr>
              <td style="padding:10px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-top:none;font-weight:600;color:#64748b;font-size:0.85rem;">EMAIL</td>
              <td style="padding:10px 14px;border:1px solid #e2e8f0;border-left:none;border-top:none;">${to}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-top:none;font-weight:600;color:#64748b;font-size:0.85rem;">TEMP PASSWORD</td>
              <td style="padding:10px 14px;border:1px solid #e2e8f0;border-left:none;border-top:none;font-family:monospace;font-size:1.1rem;color:#4f46e5;letter-spacing:2px;font-weight:700;">${password}</td>
            </tr>
          </table>
          <p style="margin:0;color:#94a3b8;font-size:0.82rem;">If you did not expect this email, please contact your administrator immediately.</p>
        </div>
      </div>
    `,
  });

  console.log(`[Email] Staff credential email sent to ${to}`);
  return { sent: true };
};

export const sendPasswordResetEmail = async ({ to, name, resetUrl, isCustomer = false }) => {
  const transporter = createTransporter();
  if (!transporter) return { skipped: true };

  const portalLabel = isCustomer ? 'Customer Portal' : 'Staff Portal';
  const bgColor = isCustomer ? '#4f46e5' : '#0f172a';

  await transporter.sendMail({
    from: from(),
    to,
    subject: `Reset Your Password — RepairBoy ${portalLabel}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#0f172a;">
        <div style="background:${bgColor};padding:24px 28px;border-radius:12px 12px 0 0;">
          <h2 style="margin:0;color:#fff;font-size:1.3rem;">RepairBoy ${portalLabel}</h2>
        </div>
        <div style="padding:28px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
          <p style="margin:0 0 16px;">Hello <strong>${name}</strong>,</p>
          <p style="margin:0 0 20px;color:#475569;">We received a request to reset your password. Click the button below — this link expires in 1 hour.</p>
          <div style="text-align:center;margin:28px 0;">
            <a href="${resetUrl}" style="background:#4f46e5;color:#fff;padding:13px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:0.95rem;display:inline-block;">Reset Password</a>
          </div>
          <p style="margin:0 0 8px;font-size:0.83rem;color:#64748b;">Or copy this link:</p>
          <p style="margin:0;font-size:0.8rem;color:#94a3b8;word-break:break-all;">${resetUrl}</p>
          <hr style="border:none;border-top:1px solid #f1f5f9;margin:20px 0;" />
          <p style="margin:0;color:#94a3b8;font-size:0.82rem;">If you did not request a password reset, you can safely ignore this email.</p>
        </div>
      </div>
    `,
  });

  console.log(`[Email] Password reset email sent to ${to}`);
  return { sent: true };
};

export const sendRentalQuotationEmail = async ({
  to, customerName, contactPerson, quoteNo, date, validity, grandTotal, pdfBase64,
}) => {
  const transporter = createTransporter();
  if (!transporter) return { skipped: true };

  const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
  const name = contactPerson || customerName || 'Customer';

  const attachments = pdfBase64
    ? [{ filename: `Quotation-${quoteNo}.pdf`, content: Buffer.from(pdfBase64, 'base64'), contentType: 'application/pdf' }]
    : [];

  await transporter.sendMail({
    from: from(),
    to,
    subject: `Rental Quotation ${quoteNo} — RepairBoy Enterprise`,
    attachments,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;color:#0f172a;">
        <div style="background:#0f172a;padding:24px 28px;border-radius:12px 12px 0 0;">
          <h2 style="margin:0;color:#fff;font-size:1.3rem;letter-spacing:-0.3px;">REPAIRBOY ENTERPRISE</h2>
          <p style="margin:4px 0 0;color:#94a3b8;font-size:0.8rem;">Authorized Service Center</p>
        </div>
        <div style="padding:28px 28px 24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
          <p style="margin:0 0 14px;font-size:1rem;">Hi <strong>${name}</strong>,</p>
          <p style="margin:0 0 16px;color:#334155;line-height:1.6;">Thank you for choosing <strong>RepairBoy Enterprise</strong>! We truly appreciate your trust in us.</p>
          <p style="margin:0 0 16px;color:#334155;line-height:1.6;">Please find attached your rental quotation <strong>${quoteNo}</strong>${date ? ` dated ${date}` : ''}. The quotation covers the devices and pricing we discussed, with a monthly total of <strong>₹${fmt(grandTotal)}</strong>.</p>
          <p style="margin:0 0 24px;color:#334155;line-height:1.6;">Kindly review the attached PDF and let us know if you have any questions or need any changes. We are happy to assist!</p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
            <p style="margin:0 0 6px;font-size:0.75rem;font-weight:700;text-transform:uppercase;color:#64748b;letter-spacing:0.05em;">Quote Reference</p>
            <p style="margin:0;font-size:1rem;font-weight:700;color:#0f172a;">${quoteNo}</p>
            ${validity ? `<p style="margin:4px 0 0;font-size:0.83rem;color:#64748b;">Valid for ${validity}</p>` : ''}
          </div>
          <p style="margin:0 0 8px;color:#475569;font-size:0.87rem;">To proceed or discuss further, simply reply to this email or call us directly.</p>
          <p style="margin:24px 0 0;color:#94a3b8;font-size:0.78rem;border-top:1px solid #f1f5f9;padding-top:16px;">This email was sent automatically by RepairBoy Enterprise · Rental Management System</p>
        </div>
      </div>
    `,
  });

  console.log(`[Email] Rental quotation ${quoteNo} sent to ${to}`);
  return { sent: true };
};

export const sendRentalAgreementEmail = async ({
  to, customerName, contactPerson, agreementNo, startDate, endDate,
  grandTotal, pdfBase64,
}) => {
  const transporter = createTransporter();
  if (!transporter) return { skipped: true };

  const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
  const name = contactPerson || customerName || 'Customer';

  const attachments = pdfBase64
    ? [{ filename: `Agreement-${agreementNo}.pdf`, content: Buffer.from(pdfBase64, 'base64'), contentType: 'application/pdf' }]
    : [];

  await transporter.sendMail({
    from: from(),
    to,
    subject: `Rental Agreement ${agreementNo} — RepairBoy Enterprise`,
    attachments,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;color:#0f172a;">
        <div style="background:#0f172a;padding:24px 28px;border-radius:12px 12px 0 0;">
          <h2 style="margin:0;color:#fff;font-size:1.3rem;letter-spacing:-0.3px;">REPAIRBOY ENTERPRISE</h2>
          <p style="margin:4px 0 0;color:#94a3b8;font-size:0.8rem;">Authorized Service Center</p>
        </div>
        <div style="padding:28px 28px 24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
          <p style="margin:0 0 14px;font-size:1rem;">Hi <strong>${name}</strong>,</p>
          <p style="margin:0 0 16px;color:#334155;line-height:1.6;">Thank you for choosing <strong>RepairBoy Enterprise</strong>! We are excited to be your trusted service partner.</p>
          <p style="margin:0 0 16px;color:#334155;line-height:1.6;">Please find attached your rental agreement <strong>${agreementNo}</strong>${startDate && endDate ? ` covering the period from <strong>${startDate}</strong> to <strong>${endDate}</strong>` : ''}. The monthly total for the services is <strong>₹${fmt(grandTotal)}</strong>.</p>
          <p style="margin:0 0 24px;color:#334155;line-height:1.6;">Kindly review the attached agreement, sign it, and send it back to us at your earliest convenience. Please do not hesitate to reach out if you have any questions.</p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
            <p style="margin:0 0 6px;font-size:0.75rem;font-weight:700;text-transform:uppercase;color:#64748b;letter-spacing:0.05em;">Agreement Reference</p>
            <p style="margin:0;font-size:1rem;font-weight:700;color:#0f172a;">${agreementNo}</p>
            ${startDate && endDate ? `<p style="margin:4px 0 0;font-size:0.83rem;color:#64748b;">${startDate} → ${endDate}</p>` : ''}
          </div>
          <p style="margin:0 0 8px;color:#475569;font-size:0.87rem;">To confirm or request changes, simply reply to this email or contact us directly.</p>
          <p style="margin:24px 0 0;color:#94a3b8;font-size:0.78rem;border-top:1px solid #f1f5f9;padding-top:16px;">This email was sent automatically by RepairBoy Enterprise · Rental Management System</p>
        </div>
      </div>
    `,
  });

  console.log(`[Email] Rental agreement ${agreementNo} sent to ${to}`);
  return { sent: true };
};

export const sendAMCQuotationEmail = async ({
  to, customerName, contactPerson, quoteNo, date, validity, grandTotal, pdfBase64,
}) => {
  const transporter = createTransporter();
  if (!transporter) return { skipped: true };

  const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
  const name = contactPerson || customerName || 'Customer';

  const attachments = pdfBase64
    ? [{ filename: `AMC-Quotation-${quoteNo}.pdf`, content: Buffer.from(pdfBase64, 'base64'), contentType: 'application/pdf' }]
    : [];

  await transporter.sendMail({
    from: from(),
    to,
    subject: `AMC Quotation ${quoteNo} — RepairBoy Enterprise`,
    attachments,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;color:#0f172a;">
        <div style="background:#0f172a;padding:24px 28px;border-radius:12px 12px 0 0;">
          <h2 style="margin:0;color:#fff;font-size:1.3rem;letter-spacing:-0.3px;">REPAIRBOY ENTERPRISE</h2>
          <p style="margin:4px 0 0;color:#94a3b8;font-size:0.8rem;">Authorized Service Center</p>
        </div>
        <div style="padding:28px 28px 24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
          <p style="margin:0 0 14px;font-size:1rem;">Hi <strong>${name}</strong>,</p>
          <p style="margin:0 0 16px;color:#334155;line-height:1.6;">Thank you for choosing <strong>RepairBoy Enterprise</strong>! Please find attached your AMC quotation <strong>${quoteNo}</strong>${date ? ` dated ${date}` : ''}.</p>
          <p style="margin:0 0 16px;color:#334155;line-height:1.6;">The quotation covers the devices and pricing we discussed, with a total of <strong>₹${fmt(grandTotal)}</strong>${validity ? ` and is valid for <strong>${validity}</strong>` : ''}.</p>
          <p style="margin:0 0 24px;color:#334155;line-height:1.6;">Kindly review the attached PDF and let us know if you have any questions or need any changes.</p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
            <p style="margin:0 0 6px;font-size:0.75rem;font-weight:700;text-transform:uppercase;color:#64748b;letter-spacing:0.05em;">Quote Reference</p>
            <p style="margin:0;font-size:1rem;font-weight:700;color:#0f172a;">${quoteNo}</p>
            ${validity ? `<p style="margin:4px 0 0;font-size:0.83rem;color:#64748b;">Valid for ${validity}</p>` : ''}
          </div>
          <p style="margin:24px 0 0;color:#94a3b8;font-size:0.78rem;border-top:1px solid #f1f5f9;padding-top:16px;">This email was sent automatically by RepairBoy Enterprise · AMC Management System</p>
        </div>
      </div>
    `,
  });

  console.log(`[Email] AMC quotation ${quoteNo} sent to ${to}`);
  return { sent: true };
};

export const sendAMCAgreementEmail = async ({
  to, customerName, contactPerson, agreementNo, startDate, endDate, grandTotal, pdfBase64,
}) => {
  const transporter = createTransporter();
  if (!transporter) return { skipped: true };

  const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
  const name = contactPerson || customerName || 'Customer';

  const attachments = pdfBase64
    ? [{ filename: `AMC-Agreement-${agreementNo}.pdf`, content: Buffer.from(pdfBase64, 'base64'), contentType: 'application/pdf' }]
    : [];

  await transporter.sendMail({
    from: from(),
    to,
    subject: `AMC Agreement ${agreementNo} — RepairBoy Enterprise`,
    attachments,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;color:#0f172a;">
        <div style="background:#0f172a;padding:24px 28px;border-radius:12px 12px 0 0;">
          <h2 style="margin:0;color:#fff;font-size:1.3rem;letter-spacing:-0.3px;">REPAIRBOY ENTERPRISE</h2>
          <p style="margin:4px 0 0;color:#94a3b8;font-size:0.8rem;">Authorized Service Center</p>
        </div>
        <div style="padding:28px 28px 24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
          <p style="margin:0 0 14px;font-size:1rem;">Hi <strong>${name}</strong>,</p>
          <p style="margin:0 0 16px;color:#334155;line-height:1.6;">Thank you for choosing <strong>RepairBoy Enterprise</strong>! Please find attached your AMC agreement <strong>${agreementNo}</strong>${startDate && endDate ? ` covering the period from <strong>${startDate}</strong> to <strong>${endDate}</strong>` : ''}.</p>
          ${grandTotal ? `<p style="margin:0 0 16px;color:#334155;line-height:1.6;">The total contract value is <strong>₹${fmt(grandTotal)}</strong>.</p>` : ''}
          <p style="margin:0 0 24px;color:#334155;line-height:1.6;">Kindly review the attached agreement and revert with your signed copy at your earliest convenience.</p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
            <p style="margin:0 0 6px;font-size:0.75rem;font-weight:700;text-transform:uppercase;color:#64748b;letter-spacing:0.05em;">Agreement Reference</p>
            <p style="margin:0;font-size:1rem;font-weight:700;color:#0f172a;">${agreementNo}</p>
            ${startDate && endDate ? `<p style="margin:4px 0 0;font-size:0.83rem;color:#64748b;">${startDate} → ${endDate}</p>` : ''}
          </div>
          <p style="margin:24px 0 0;color:#94a3b8;font-size:0.78rem;border-top:1px solid #f1f5f9;padding-top:16px;">This email was sent automatically by RepairBoy Enterprise · AMC Management System</p>
        </div>
      </div>
    `,
  });

  console.log(`[Email] AMC agreement ${agreementNo} sent to ${to}`);
  return { sent: true };
};

export const sendCMCQuotationEmail = async ({
  to, customerName, contactPerson, quoteNo, date, validity, grandTotal, pdfBase64,
}) => {
  const transporter = createTransporter();
  if (!transporter) return { skipped: true };

  const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
  const name = contactPerson || customerName || 'Customer';

  const attachments = pdfBase64
    ? [{ filename: `CMC-Quotation-${quoteNo}.pdf`, content: Buffer.from(pdfBase64, 'base64'), contentType: 'application/pdf' }]
    : [];

  await transporter.sendMail({
    from: from(),
    to,
    subject: `CMC Quotation ${quoteNo} — RepairBoy Enterprise`,
    attachments,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;color:#0f172a;">
        <div style="background:#0f172a;padding:24px 28px;border-radius:12px 12px 0 0;">
          <h2 style="margin:0;color:#fff;font-size:1.3rem;letter-spacing:-0.3px;">REPAIRBOY ENTERPRISE</h2>
          <p style="margin:4px 0 0;color:#94a3b8;font-size:0.8rem;">Authorized Service Center</p>
        </div>
        <div style="padding:28px 28px 24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
          <p style="margin:0 0 14px;font-size:1rem;">Hi <strong>${name}</strong>,</p>
          <p style="margin:0 0 16px;color:#334155;line-height:1.6;">Thank you for choosing <strong>RepairBoy Enterprise</strong>! Please find attached your CMC quotation <strong>${quoteNo}</strong>${date ? ` dated ${date}` : ''}.</p>
          <p style="margin:0 0 16px;color:#334155;line-height:1.6;">The quotation covers the devices and pricing we discussed, with a total of <strong>₹${fmt(grandTotal)}</strong>${validity ? ` and is valid for <strong>${validity}</strong>` : ''}.</p>
          <p style="margin:0 0 24px;color:#334155;line-height:1.6;">Kindly review the attached PDF and let us know if you have any questions or need any changes.</p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
            <p style="margin:0 0 6px;font-size:0.75rem;font-weight:700;text-transform:uppercase;color:#64748b;letter-spacing:0.05em;">Quote Reference</p>
            <p style="margin:0;font-size:1rem;font-weight:700;color:#0f172a;">${quoteNo}</p>
            ${validity ? `<p style="margin:4px 0 0;font-size:0.83rem;color:#64748b;">Valid for ${validity}</p>` : ''}
          </div>
          <p style="margin:24px 0 0;color:#94a3b8;font-size:0.78rem;border-top:1px solid #f1f5f9;padding-top:16px;">This email was sent automatically by RepairBoy Enterprise · CMC Management System</p>
        </div>
      </div>
    `,
  });

  console.log(`[Email] CMC quotation ${quoteNo} sent to ${to}`);
  return { sent: true };
};

export const sendCMCAgreementEmail = async ({
  to, customerName, contactPerson, agreementNo, startDate, endDate, grandTotal, pdfBase64,
}) => {
  const transporter = createTransporter();
  if (!transporter) return { skipped: true };

  const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
  const name = contactPerson || customerName || 'Customer';

  const attachments = pdfBase64
    ? [{ filename: `CMC-Agreement-${agreementNo}.pdf`, content: Buffer.from(pdfBase64, 'base64'), contentType: 'application/pdf' }]
    : [];

  await transporter.sendMail({
    from: from(),
    to,
    subject: `CMC Agreement ${agreementNo} — RepairBoy Enterprise`,
    attachments,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;color:#0f172a;">
        <div style="background:#0f172a;padding:24px 28px;border-radius:12px 12px 0 0;">
          <h2 style="margin:0;color:#fff;font-size:1.3rem;letter-spacing:-0.3px;">REPAIRBOY ENTERPRISE</h2>
          <p style="margin:4px 0 0;color:#94a3b8;font-size:0.8rem;">Authorized Service Center</p>
        </div>
        <div style="padding:28px 28px 24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
          <p style="margin:0 0 14px;font-size:1rem;">Hi <strong>${name}</strong>,</p>
          <p style="margin:0 0 16px;color:#334155;line-height:1.6;">Thank you for choosing <strong>RepairBoy Enterprise</strong>! Please find attached your CMC agreement <strong>${agreementNo}</strong>${startDate && endDate ? ` covering the period from <strong>${startDate}</strong> to <strong>${endDate}</strong>` : ''}.</p>
          ${grandTotal ? `<p style="margin:0 0 16px;color:#334155;line-height:1.6;">The total contract value is <strong>₹${fmt(grandTotal)}</strong>.</p>` : ''}
          <p style="margin:0 0 24px;color:#334155;line-height:1.6;">Kindly review the attached agreement and revert with your signed copy at your earliest convenience.</p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
            <p style="margin:0 0 6px;font-size:0.75rem;font-weight:700;text-transform:uppercase;color:#64748b;letter-spacing:0.05em;">Agreement Reference</p>
            <p style="margin:0;font-size:1rem;font-weight:700;color:#0f172a;">${agreementNo}</p>
            ${startDate && endDate ? `<p style="margin:4px 0 0;font-size:0.83rem;color:#64748b;">${startDate} → ${endDate}</p>` : ''}
          </div>
          <p style="margin:24px 0 0;color:#94a3b8;font-size:0.78rem;border-top:1px solid #f1f5f9;padding-top:16px;">This email was sent automatically by RepairBoy Enterprise · CMC Management System</p>
        </div>
      </div>
    `,
  });

  console.log(`[Email] CMC agreement ${agreementNo} sent to ${to}`);
  return { sent: true };
};
