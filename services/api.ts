
import { Order, MenuItem, Branch, Employee, SyncStatus } from '../types';

const API_BASE_URL = 'http://localhost:3001/api';

export class ApiService {
    private static async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options?.headers,
                },
            });

            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } catch (e) {
                    const text = await response.text();
                    errorMessage = text || errorMessage;
                }
                throw new Error(`API Error: ${errorMessage}`);
            }

            return response.json();
        } catch (error) {
            console.error(`API Request failed for ${endpoint}:`, error);
            throw error;
        }
    }

    // Push local orders to MySQL
    static async syncOrders(orders: Order[]): Promise<{ success: boolean; message: string }> {
        return this.request('/sync/orders', {
            method: 'POST',
            body: JSON.stringify({ orders }),
        });
    }

    // Pull products from Master DB
    static async getMasterProducts(): Promise<MenuItem[]> {
        return this.request<MenuItem[]>('/products');
    }

    // Log attendance to cloud
    static async logAttendance(employeeId: string, type: 'check-in' | 'check-out', branchId?: string): Promise<void> {
        return this.request('/attendance', {
            method: 'POST',
            body: JSON.stringify({ employeeId, type, branchId }),
        });
    }

    // Sync payment transactions to cloud
    static async syncPayment(paymentData: any): Promise<{ success: boolean; message: string }> {
        console.log('Syncing payment data:', paymentData);
        return this.request('/sync/payment', {
            method: 'POST',
            body: JSON.stringify(paymentData),
        });
    }
}
