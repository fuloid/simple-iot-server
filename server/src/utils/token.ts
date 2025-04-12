// --- utils/token.ts ---
import { sign, verify } from 'jsonwebtoken';
import { Database } from './database';
import { createLogger } from '@/utils/logger';

const JWT_SECRET = process.env.JWT_SECRET!;
const EXPIRES_IN = '14d';
const logger = createLogger('Token');

class Token {
    // Create a JWT token and save to DB
    static async create(device_id: string): Promise<{ c:string; token?: string }> {
        try {
            const payload = { device_id };
            logger.debug('Creating token with payload:', payload);
            const token = sign(payload, JWT_SECRET, { expiresIn: EXPIRES_IN });
            const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days

            await Database.updateDeviceToken(device_id, token, expiresAt);
            logger.info('Token creation successful:', token);
            return { c: 'OK', token };
        } catch (err) {
            logger.error('Token creation or DB save failed:', err);
            return { c: 'ERROR' };
        }
    }

    // Verify a JWT token
    static verify(token: string) {
        try {
            const decoded = verify(token, JWT_SECRET);
            logger.debug('Token verified successfully:', decoded);
            return { c:"OK", device_id: (decoded as any).device_id };
        } catch (err) {
            logger.debug('Token verification failed:', err);
            return { c:"ERROR" };
        }
    }

    // Get token from DB, check expiration, create if expired
    static async getDeviceToken(device_id: string): Promise<{ c:string; t?: string }> {
        try {
            const result = await Database.getDeviceToken(device_id);
            if (!result) {
                logger.debug('Device not found in DB');
                return { c: 'ERROR' };
            }

            const { token, token_expires_at } = result;
            if (!token || !token_expires_at || new Date(token_expires_at).getTime() < Date.now()) {
                logger.debug('[Token expired or missing, creating new one');
                return await this.create(device_id);
            }

            logger.debug('Valid token found in DB');
            return { c: 'OK', t: token };
        } catch (err) {
            logger.error('Error fetching device token:', err);
            return { c: 'ERROR' };
        }
    }
}

export default Token;