import { PaymentTransaction, PaymentBreakdown, RefundRequest, AuditLog } from '../types';
import { supabase } from './supabase';

const PAYMENT_TOLERANCE = 0.01;

export class PaymentService {
  static async validatePartialPayment(
    cashAmount: number,
    cardAmount: number,
    expectedTotal: number
  ): Promise<{
    isValid: boolean;
    variance: number;
    status: 'valid' | 'mismatch';
    message: string;
  }> {
    const totalProvided = cashAmount + cardAmount;
    const variance = Math.abs(totalProvided - expectedTotal);
    const isValid = variance < PAYMENT_TOLERANCE;

    return {
      isValid,
      variance,
      status: isValid ? 'valid' : 'mismatch',
      message: isValid
        ? 'Payment amounts validated successfully'
        : `Payment mismatch: Expected ${expectedTotal.toFixed(2)}, received ${totalProvided.toFixed(2)} (variance: ${variance.toFixed(2)})`
    };
  }

  static async processPayment(
    orderId: string,
    cashAmount: number,
    cardAmount: number,
    totalAmount: number,
    cardReference?: string,
    processedById?: string
  ): Promise<PaymentTransaction> {
    const validation = await this.validatePartialPayment(
      cashAmount,
      cardAmount,
      totalAmount
    );

    if (!validation.isValid) {
      throw new Error(validation.message);
    }

    const transactionType =
      cashAmount > 0 && cardAmount > 0 ? 'partial' :
      cashAmount > 0 ? 'cash' : 'card';

    const { data, error } = await supabase
      .from('payment_transactions')
      .insert([{
        order_id: orderId,
        transaction_type: transactionType,
        cash_amount: cashAmount,
        card_amount: cardAmount,
        total_amount: totalAmount,
        validation_status: validation.status,
        status: 'pending',
        payment_reference: cardReference,
        processed_by_id: processedById,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data as PaymentTransaction;
  }

  static async completePayment(
    transactionId: string,
    paymentReference?: string
  ): Promise<PaymentTransaction> {
    const { data, error } = await supabase
      .from('payment_transactions')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString(),
        payment_reference: paymentReference
      })
      .eq('id', transactionId)
      .select()
      .single();

    if (error) throw error;

    const transaction = data as PaymentTransaction;

    await this.logAuditAction(
      transaction.processedById,
      'payment',
      'order',
      transaction.orderId,
      { status: 'pending' },
      { status: 'completed', ...transaction }
    );

    return transaction;
  }

  static async requestRefund(
    orderId: string,
    transactionId: string,
    refundAmount: number,
    refundMethod: 'cash' | 'card' | 'partial',
    reason: string,
    approvedById?: string
  ): Promise<RefundRequest> {
    const { data: transaction, error: txError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (txError) throw txError;

    if (refundAmount > transaction.total_amount) {
      throw new Error(
        `Refund amount (${refundAmount}) cannot exceed transaction total (${transaction.total_amount})`
      );
    }

    const { data, error } = await supabase
      .from('refund_history')
      .insert([{
        order_id: orderId,
        original_transaction_id: transactionId,
        refund_amount: refundAmount,
        refund_method: refundMethod,
        reason,
        approved_by_id: approvedById,
        status: 'pending',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    await this.logAuditAction(
      approvedById,
      'refund_requested',
      'refund',
      (data as any).id,
      null,
      { ...data, status: 'pending' }
    );

    return data as RefundRequest;
  }

  static async approveRefund(refundId: string): Promise<RefundRequest> {
    const { data, error } = await supabase
      .from('refund_history')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString()
      })
      .eq('id', refundId)
      .select()
      .single();

    if (error) throw error;

    await this.logAuditAction(
      undefined,
      'refund_approved',
      'refund',
      refundId,
      { status: 'pending' },
      { status: 'completed' }
    );

    return data as RefundRequest;
  }

  static async reconcileCash(
    branchId: string,
    expectedCash: number,
    actualCash: number,
    notes?: string,
    employeeId?: string
  ): Promise<{ balanced: boolean; variance: number }> {
    const variance = Math.abs(expectedCash - actualCash);
    const balanced = variance < PAYMENT_TOLERANCE;

    const { error } = await supabase
      .from('payment_ledger')
      .insert([{
        employee_id: employeeId,
        branch_id: branchId,
        cash_in: expectedCash,
        cash_out: actualCash,
        balance_difference: actualCash - expectedCash,
        reconciled_at: new Date().toISOString(),
        notes: notes || (balanced ? 'Balanced' : `Variance: ${variance.toFixed(2)}`),
        created_at: new Date().toISOString()
      }]);

    if (error) throw error;

    await this.logAuditAction(
      employeeId,
      'cash_reconciliation',
      'ledger',
      branchId,
      { expectedCash, previousActual: undefined },
      { expectedCash, actualCash, variance, balanced }
    );

    return { balanced, variance };
  }

  static async getOrderPaymentHistory(orderId: string): Promise<PaymentTransaction[]> {
    const { data, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as PaymentTransaction[];
  }

  static async getRefundHistory(orderId: string): Promise<RefundRequest[]> {
    const { data, error } = await supabase
      .from('refund_history')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as RefundRequest[];
  }

  static async logAuditAction(
    employeeId: string | undefined,
    actionType: string,
    resourceType: string,
    resourceId: string,
    oldValues: Record<string, any> | null,
    newValues: Record<string, any>
  ): Promise<AuditLog> {
    const { data, error } = await supabase
      .from('audit_logs')
      .insert([{
        employee_id: employeeId,
        action_type: actionType,
        resource_type: resourceType,
        resource_id: resourceId,
        old_values: oldValues,
        new_values: newValues,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data as AuditLog;
  }

  static async getAuditLogs(
    filters?: {
      employeeId?: string;
      actionType?: string;
      resourceType?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<AuditLog[]> {
    let query = supabase
      .from('audit_logs')
      .select('*');

    if (filters?.employeeId) {
      query = query.eq('employee_id', filters.employeeId);
    }
    if (filters?.actionType) {
      query = query.eq('action_type', filters.actionType);
    }
    if (filters?.resourceType) {
      query = query.eq('resource_type', filters.resourceType);
    }
    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate.toISOString());
    }
    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate.toISOString());
    }

    const limit = filters?.limit || 100;
    query = query.order('created_at', { ascending: false }).limit(limit);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as AuditLog[];
  }

  static calculatePaymentBreakdown(
    cashAmount: number,
    cardAmount: number,
    totalAmount: number,
    cardReference?: string
  ): PaymentBreakdown {
    const totalProvided = cashAmount + cardAmount;
    const variance = totalAmount - totalProvided;
    const validationStatus = Math.abs(variance) < PAYMENT_TOLERANCE ? 'valid' : 'mismatch';

    return {
      cashAmount,
      cardAmount,
      totalAmount,
      validationStatus,
      variance: Math.abs(variance),
      cardReference
    };
  }
}
