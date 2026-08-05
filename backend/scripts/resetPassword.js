import bcrypt from "bcrypt";
import prisma from "../src/config/db.js";

async function resetPassword() {
    const email = "nil122@example.com";
    const newPassword = "Admin@123";

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
        where: {
            email
        },
        data: {
            password: hashedPassword
        }
    });

    console.log("✅ Password reset successfully.");
    console.log("Email:", email);
    console.log("Password:", newPassword);

    await prisma.$disconnect();
}

resetPassword().catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
});