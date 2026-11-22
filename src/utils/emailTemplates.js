export const getEmailTemplate = (templateName, data) => {
  const brandHeader = `
    <div style="background-color: #071C2C; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="color: #ffffff; margin: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 24px; letter-spacing: 1px;">
        AERO<span style="color: #16A6A1;">MARINE</span>
      </h1>
      <p style="color: #94A3B8; margin: 6px 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 2px;">
        Global Container Logistics Platform
      </p>
    </div>
  `;

  const brandFooter = `
    <div style="background-color: #F8FAFC; padding: 20px; text-align: center; border-top: 1px solid #E2E8F0; border-radius: 0 0 8px 8px; font-size: 12px; color: #64748B;">
      <p style="margin: 0 0 6px;">AeroMarine Operations Hub &bull; Audited Maritime Capital Infrastructure</p>
      <p style="margin: 0;">This is an automated operational notification. Never share your security credentials.</p>
    </div>
  `;

  switch (templateName) {
    case 'admin_deposit_notification':
      return {
        subject: `[AeroMarine] New Deposit Request — ${data.requestId}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 8px;">
            ${brandHeader}
            <div style="padding: 28px; background-color: #ffffff;">
              <h2 style="color: #0F172A; font-size: 18px; margin-top: 0;">Action Required: New Deposit Awaiting Verification</h2>
              <p style="color: #334155; line-height: 1.5;">A new user deposit request has been submitted and is currently pending verification.</p>
              
              <div style="background-color: #F1F5F9; border-left: 4px solid #16A6A1; padding: 16px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 4px 0;"><strong>Request ID:</strong> ${data.requestId}</p>
                <p style="margin: 4px 0;"><strong>User Name:</strong> ${data.userName}</p>
                <p style="margin: 4px 0;"><strong>Phone:</strong> ${data.userPhone}</p>
                <p style="margin: 4px 0;"><strong>Amount:</strong> ₹${data.amount.toLocaleString('en-IN')}</p>
                <p style="margin: 4px 0;"><strong>Payment Method:</strong> ${data.paymentMethod.toUpperCase()}</p>
                <p style="margin: 4px 0;"><strong>UTR / Reference:</strong> ${data.paymentReference}</p>
              </div>

              <p style="color: #DC2626; font-size: 13px; font-weight: bold;">
                PENDING VERIFICATION — NO USER BALANCE HAS BEEN CREDITED.
              </p>
              
              <p style="color: #475569; font-size: 14px;">Please review the banking credit before approving this deposit in the admin portal.</p>
            </div>
            ${brandFooter}
          </div>
        `,
      };

    case 'deposit_approved':
      return {
        subject: `[AeroMarine] Deposit Verified & Credited — ${data.requestId}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 8px;">
            ${brandHeader}
            <div style="padding: 28px; background-color: #ffffff;">
              <h2 style="color: #16865B; font-size: 18px; margin-top: 0;">Payment Verified Successfully</h2>
              <p style="color: #334155;">Hello ${data.userName},</p>
              <p style="color: #334155; line-height: 1.5;">Your deposit of <strong>₹${data.amount.toLocaleString('en-IN')}</strong> has been verified by our operations desk and posted to your available balance.</p>
              
              <div style="background-color: #ECFDF5; border-left: 4px solid #16865B; padding: 16px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 4px 0;"><strong>Request ID:</strong> ${data.requestId}</p>
                <p style="margin: 4px 0;"><strong>Amount Credited:</strong> ₹${data.amount.toLocaleString('en-IN')}</p>
                <p style="margin: 4px 0;"><strong>Status:</strong> Approved & Credited</p>
              </div>

              <p style="color: #475569; font-size: 14px;">You can now view your updated ledger balance in your user dashboard.</p>
            </div>
            ${brandFooter}
          </div>
        `,
      };

    case 'deposit_rejected':
      return {
        subject: `[AeroMarine] Deposit Request Update — ${data.requestId}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 8px;">
            ${brandHeader}
            <div style="padding: 28px; background-color: #ffffff;">
              <h2 style="color: #C74747; font-size: 18px; margin-top: 0;">Deposit Request Declined</h2>
              <p style="color: #334155;">Hello ${data.userName},</p>
              <p style="color: #334155; line-height: 1.5;">Your deposit request of <strong>₹${data.amount.toLocaleString('en-IN')}</strong> could not be verified.</p>
              
              <div style="background-color: #FEF2F2; border-left: 4px solid #C74747; padding: 16px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 4px 0;"><strong>Reason:</strong> ${data.adminNote || 'Transaction reference could not be matched with bank ledger.'}</p>
                <p style="margin: 4px 0;"><strong>Status:</strong> Rejected — No funds were credited</p>
              </div>

              <p style="color: #475569; font-size: 14px;">If you believe this was an error, please reach out to AeroMarine support with your bank payment advice.</p>
            </div>
            ${brandFooter}
          </div>
        `,
      };

    case 'withdrawal_submitted':
      return {
        subject: `[AeroMarine] Withdrawal Request Received — ${data.requestId}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 8px;">
            ${brandHeader}
            <div style="padding: 28px; background-color: #ffffff;">
              <h2 style="color: #0F172A; font-size: 18px; margin-top: 0;">Withdrawal Request Pending Review</h2>
              <p style="color: #334155;">Hello ${data.userName},</p>
              <p style="color: #334155; line-height: 1.5;">We have received your withdrawal request for <strong>₹${data.amount.toLocaleString('en-IN')}</strong>. The requested amount is now reserved in your account.</p>
              
              <div style="background-color: #F8FAFC; border-left: 4px solid #F28C45; padding: 16px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 4px 0;"><strong>Request ID:</strong> ${data.requestId}</p>
                <p style="margin: 4px 0;"><strong>Requested Amount:</strong> ₹${data.amount.toLocaleString('en-IN')}</p>
                <p style="margin: 4px 0;"><strong>Processing Fee:</strong> ₹${(data.fee || 0).toLocaleString('en-IN')}</p>
                <p style="margin: 4px 0;"><strong>Net Payout:</strong> ₹${data.netAmount.toLocaleString('en-IN')}</p>
              </div>

              <p style="color: #475569; font-size: 14px;">Our finance desk processes payouts within standard banking windows.</p>
            </div>
            ${brandFooter}
          </div>
        `,
      };

    case 'withdrawal_paid':
      return {
        subject: `[AeroMarine] Withdrawal Payout Completed — ${data.requestId}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 8px;">
            ${brandHeader}
            <div style="padding: 28px; background-color: #ffffff;">
              <h2 style="color: #16865B; font-size: 18px; margin-top: 0;">Payout Dispatched</h2>
              <p style="color: #334155;">Hello ${data.userName},</p>
              <p style="color: #334155; line-height: 1.5;">Your payout of <strong>₹${data.netAmount.toLocaleString('en-IN')}</strong> has been completed and sent to your destination account.</p>
              
              <div style="background-color: #ECFDF5; border-left: 4px solid #16865B; padding: 16px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 4px 0;"><strong>Request ID:</strong> ${data.requestId}</p>
                <p style="margin: 4px 0;"><strong>Bank / UPI Reference (UTR):</strong> ${data.payoutReference}</p>
                <p style="margin: 4px 0;"><strong>Status:</strong> Paid</p>
              </div>

              <p style="color: #475569; font-size: 14px;">Funds should reflect in your bank account shortly according to IMPS/NEFT/UPI turnaround times.</p>
            </div>
            ${brandFooter}
          </div>
        `,
      };

    case 'withdrawal_rejected':
      return {
        subject: `[AeroMarine] Withdrawal Request Declined & Funds Released — ${data.requestId}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 8px;">
            ${brandHeader}
            <div style="padding: 28px; background-color: #ffffff;">
              <h2 style="color: #C74747; font-size: 18px; margin-top: 0;">Withdrawal Request Declined</h2>
              <p style="color: #334155;">Hello ${data.userName},</p>
              <p style="color: #334155; line-height: 1.5;">Your withdrawal request for <strong>₹${data.amount.toLocaleString('en-IN')}</strong> could not be completed.</p>
              
              <div style="background-color: #FEF2F2; border-left: 4px solid #C74747; padding: 16px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 4px 0;"><strong>Reason:</strong> ${data.adminNote || 'Invalid account information or regulatory verification required.'}</p>
                <p style="margin: 4px 0;"><strong>Action Taken:</strong> The reserved amount of ₹${data.amount.toLocaleString('en-IN')} has been returned to your available balance.</p>
              </div>

              <p style="color: #475569; font-size: 14px;">Please update your payout destination details or contact support for assistance.</p>
            </div>
            ${brandFooter}
          </div>
        `,
      };

    default:
      return {
        subject: `[AeroMarine] Operational Notification`,
        html: `<p>${JSON.stringify(data)}</p>`,
      };
  }
};
