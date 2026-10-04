import bcrypt from "bcrypt";
import prisma from "./src/config/db.js";

const email = "mgr1_ops_223455@criclive.test";
const newPassword = "Manager@123";

try {
    const user = await prisma.user.findUnique({
        where: { email },
        include: { role: true }
    });

    if (!user) {
        console.log("User not found:", email);
        process.exit(1);
    }

    console.log("User found:");
    console.log({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role.name
    });

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
        where: { id: user.id },
        data: {
            password: hashedPassword,
            isActive: true
        }
    });

    console.log("\nPassword reset successfully!");
    console.log("Email:", email);
    console.log("Password:", newPassword);
} catch (error) {
    console.error("Failed:", error);
} finally {
    await prisma.$disconnect();
}
