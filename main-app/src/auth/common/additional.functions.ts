import { randomBytes } from "crypto";

export function generateToken(length = 32): string {
    return randomBytes(length).toString('hex'); 
}