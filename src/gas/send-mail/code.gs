/**
 * DH26NHE — GAS Mail Relay (Web App)
 *
 * Luồng: Client → Cloudflare Worker (/send-email-upload) → GAS (file này) → MailApp
 *
 * Deploy:  Deploy > New deployment > Web app
 *          - Execute as: Me
 *          - Who has access: Anyone
 *          Sau khi deploy, cập nhật secret GAS_WEB_APP_URL của Worker:
 *          cd workers/api && npx wrangler secret put GAS_WEB_APP_URL
 *
 * Request (application/x-www-form-urlencoded):
 *   action=send_email            (bắt buộc)
 *   email, subject               (bắt buộc)
 *   body | contentHtml           (body = plain text; contentHtml = HTML, ưu tiên nếu có)
 *   fileUrl + fileName           (1 tệp đính kèm)
 *   fileList                     (JSON [{ url, name }] — nhiều tệp, ưu tiên hơn fileUrl)
 *   userName
 */

const CONFIG = {
  APP_NAME: 'DH26NHE',
  SENDER_NAME: 'Ban Cán Sự DH26NHE',
  LOG_SHEET_ID: '', // Dán ID Google Sheet để ghi log; để trống = tắt ghi log
  LOG_SHEET_NAME: 'LogData',
};

const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'application/pdf': '.pdf',
  'application/zip': '.zip',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
};

function recordLog(logType, logMessage, rawData) {
  if (!CONFIG.LOG_SHEET_ID) return;
  try {
    const ss = SpreadsheetApp.openById(CONFIG.LOG_SHEET_ID);
    let sheet = ss.getSheetByName(CONFIG.LOG_SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.LOG_SHEET_NAME);
      sheet.appendRow(['Timestamp', 'Log Type', 'Message', 'Raw Data']);
    }
    sheet.appendRow([new Date(), logType, logMessage, String(rawData || '')]);
  } catch (err) {
    console.error('LỖI GHI LOG: ' + err.message);
  }
}

function jsonOut(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function textToHtml(text) {
  const escaped = String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped
    .split(/\n{2,}/)
    .map((block) => `<p class="message">${block.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function withExtension(fileName, blob) {
  const safeName = String(fileName || 'attachment').replace(/[\\/:*?"<>|]/g, '_');
  if (/\.[a-z0-9]{2,5}$/i.test(safeName)) return safeName;
  return safeName + (EXT_BY_MIME[blob.getContentType()] || '');
}

function fetchAttachments(files, fallbackName) {
  const blobs = [];
  for (const file of files) {
    if (!file || !file.url) continue;
    try {
      const response = UrlFetchApp.fetch(file.url, { muteHttpExceptions: true });
      if (response.getResponseCode() !== 200) {
        recordLog('WARN', `Attachment HTTP ${response.getResponseCode()}`, file.url);
        continue;
      }
      const blob = response.getBlob();
      blobs.push(blob.setName(withExtension(file.name || fallbackName, blob)));
    } catch (err) {
      recordLog('WARN', 'Failed to fetch attachment', err.message);
    }
  }
  return blobs;
}

function parseFileList(e) {
  const raw = e.parameter.fileList;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    recordLog('WARN', 'Failed to parse fileList', err.message);
    return [];
  }
}

function handleSendEmail(e) {
  const email = e.parameter.email;
  const subject = e.parameter.subject;

  try {
    if (!email || !subject) throw new Error('Thiếu email hoặc subject.');
    recordLog('INFO', 'Handling send_email', `${email} - ${subject}`);

    const files = parseFileList(e);
    if (files.length === 0 && e.parameter.fileUrl) {
      files.push({ url: e.parameter.fileUrl, name: e.parameter.fileName });
    }
    const attachments = fetchAttachments(files, e.parameter.fileName);

    const template = HtmlService.createTemplateFromFile('email_template');
    template.contentHtml = e.parameter.contentHtml || textToHtml(e.parameter.body);
    const htmlBody = template.evaluate().getContent();

    MailApp.sendEmail({
      to: email,
      subject: subject,
      htmlBody: htmlBody,
      name: CONFIG.SENDER_NAME,
      attachments: attachments.length ? attachments : undefined,
    });

    recordLog('SUCCESS', 'Email sent', email);
    return jsonOut({ status: 'success', message: 'Email sent' });
  } catch (err) {
    recordLog('ERROR', 'Email send failed', err.message);
    return jsonOut({ status: 'error', message: err.message });
  }
}

function doGet() {
  return jsonOut({ status: 'ok', app: CONFIG.APP_NAME, message: 'Mail relay active' });
}

function doPost(e) {
  const action = (e && e.parameter && e.parameter.action) || '';
  if (action === 'send_email') return handleSendEmail(e);
  return jsonOut({ status: 'error', message: `Unknown action: ${action || '(empty)'}` });
}

function testSendEmail() {
  handleSendEmail({
    parameter: {
      action: 'send_email',
      email: Session.getActiveUser().getEmail(),
      subject: `[${CONFIG.APP_NAME}] Kiểm tra gửi mail`,
      body: `Xin chào,\n\nĐây là email kiểm tra từ GAS Mail Relay của ${CONFIG.APP_NAME}.\n\nTrân trọng,\nBan Cán Sự.`,
      userName: 'Test User',
    },
  });
}
