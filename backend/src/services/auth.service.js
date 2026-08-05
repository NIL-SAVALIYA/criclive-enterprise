import bcrypt from "bcrypt";
import prisma from "../config/db.js";

import {

    findUserByEmail,
    findRoleByName,
    createUser

} from "../repositories/user.repository.js";
import { create } from "node:domain";


export async function registerUser(userData) {

    const {

        firstName,
        lastName,
        email,
        password,
        role

    } = userData;


    const existingUser = await findUserByEmail(email);


    if (existingUser) {
        throw new Error("Email already registered.");
    }

    const roleData = await findRoleByName(role);

    if (!roleData) {
        throw new Error("Invalid role.");
    }

    const hasedPassword = await bcrypt.hash(password, 10);


    const user = await createUser({

        firstName,
        lastName,
        email,
        password: hasedPassword,
        roleId: roleData.id

    });


    return {

        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: roleData.name



    };


}


//LoginUSer Validation api making  new import for login user ........

import jwt from "jsonwebtoken";
import env from "../config/env.js";

export async function loginUser(loginData) {

    const {
        email,
        password
    } = loginData;

    console.log("LOGIN EMAIL:", email);
    //find User 

    const user = await findUserByEmail(email);

    console.log("FOUND USER:", user);

    // Check if user exists
    if (!user) {
        throw new Error("Invalid email or password.");
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(
        password,
        user.password
    );

    if (!isPasswordValid) {
        throw new Error("Invalid email or password.");
    }

    //Generate JWT

    const token = jwt.sign(
        {

            userId: user.id,
            role: user.role.name
        },
        env.JWT_SECRET,
        {
            expiresIn: "7d"
        }



    );


    return {
        token,
        user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role.name

        }
    };

}
// NEW import for getprofile of user by ID:

import { findUserById } from "../repositories/user.repository.js";

export async function getProfile(userId) {

    const user = await findUserById(userId);

    if (!user) {
        throw new Error("User not found.");
    }

    return {

        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role.name

    };

}