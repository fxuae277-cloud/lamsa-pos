import bcrypt from "bcryptjs";
import { db } from "./db.ts";
import { sql } from "drizzle-orm";

async function resetMyPassword() {
  const newPassword = "admin123";
  const hash = await bcrypt.hash(newPassword, 10);

  // استخدام أمر SQL مباشرة بدون الحاجة لاستيراد users
  await db.execute(sql`
    UPDATE users 
    SET password = ${hash} 
    WHERE username = 'admin'
  `);

  console.log("✅ تم تغيير كلمة المرور بنجاح!");
  console.log("اسم المستخدم: admin");
  console.log("كلمة المرور الجديدة: admin123");
  process.exit(0);
}

resetMyPassword();
