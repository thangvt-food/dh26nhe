/**
 * Gán Firebase Auth custom claim { admin: true } cho tài khoản.
 *
 * Cách dùng:
 *   1. Firebase Console > Project dh26nhe > Project settings > Service accounts
 *      > Generate new private key > lưu thành `serviceAccountKey.json` ở root project
 *      (file này đã gitignore, KHÔNG commit).
 *   2. Tài khoản cần gán phải ĐĂNG NHẬP app ít nhất 1 lần trước (để tồn tại trong Auth).
 *   3. Chạy:  pnpm set-admin aczaao12@gmail.com
 *      hoặc nhiều email: pnpm set-admin a@gmail.com b@st.hcmuaf.edu.vn
 *   4. User đăng xuất rồi đăng nhập lại để token mới có claim admin.
 */
const path = require('path');
const fs = require('fs');

const KEY_PATH = path.join(__dirname, '..', 'serviceAccountKey.json');

if (!fs.existsSync(KEY_PATH)) {
  console.error(
    '[set-admin] Không tìm thấy serviceAccountKey.json ở root project.\n' +
      '  Tải key tại: Firebase Console > dh26nhe > Project settings > Service accounts > Generate new private key.',
  );
  process.exit(1);
}

const admin = require('firebase-admin');
const serviceAccount = require(KEY_PATH);

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const emails = process.argv.slice(2);
if (emails.length === 0) {
  console.error('[set-admin] Thiếu email. Ví dụ: pnpm set-admin aczaao12@gmail.com');
  process.exit(1);
}

async function main() {
  let failed = 0;
  for (const email of emails) {
    try {
      const user = await admin.auth().getUserByEmail(email);
      const current = user.customClaims || {};
      await admin.auth().setCustomUserClaims(user.uid, { ...current, admin: true });
      console.log(`[set-admin] OK: ${email} (uid=${user.uid}) đã có claim admin=true`);
    } catch (error) {
      failed += 1;
      console.error(`[set-admin] LỖI ${email}: ${error.message}`);
    }
  }
  process.exit(failed > 0 ? 1 : 0);
}

main();
