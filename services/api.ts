
import { Order, MenuItem, Branch, Employee, SyncStatus } from '../types';

const API_BASE_URL = 'http://localhost:3001/api';

export class ApiService {
    private static async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Network response was not ok');
        }

        return response.json();
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
}
