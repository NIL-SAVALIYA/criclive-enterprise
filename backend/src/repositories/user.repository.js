import prisma from "../config/db.js";

export async function findUserByEmail(email, db = prisma) {
    const normalizedEmail = email ? email.trim().toLowerCase() : "";
    return db.user.findUnique({
        where: {
            email: normalizedEmail
        },
        include: {
            role: true
        }
    });
}

export async function findRoleByName(name, db = prisma) {
    return db.role.findUnique({
        where: {
            name
        }
    });
}

export async function createUser(data, db = prisma) {
    const normalizedData = {
        ...data,
        email: data.email ? data.email.trim().toLowerCase() : data.email
    };
    return db.user.create({
        data: normalizedData
    });
}

export async function findUserById(id, db = prisma) {
    return db.user.findUnique({
        where: {
            id
        },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            profileImageUrl: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            role: {
                select: {
                    id: true,
                    name: true,
                    description: true
                }
            }
        }
    });
}

export async function getAllUsers(db = prisma) {
    return db.user.findMany({
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            profileImageUrl: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            role: {
                select: {
                    id: true,
                    name: true,
                    description: true
                }
            }
        },
        orderBy: {
            createdAt: "asc"
        }
    });
}

export async function updateUser(id, data, db = prisma) {
    return db.user.update({
        where: {
            id
        },
        data
    });
}

export async function deleteUser(id, db = prisma) {
    return db.user.delete({
        where: {
            id
        }
    });
}