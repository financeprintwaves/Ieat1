import { Order, MenuItem } from '../types';

interface PrinterDevice {
  device: USBDevice;
  endpointOut: number;
}

class PrinterService {
  private printer: PrinterDevice | null = null;
  private isConnected: boolean = false;

  private ESC = '\x1B';
  private GS = '\x1D';

  async requestPrinter(): Promise<boolean> {
    try {
      if (!('usb' in navigator)) {
        throw new Error('WebUSB is not supported in this browser');
      }

      const device = await (navigator as any).usb.requestDevice({
        filters: [
          { vendorId: 0x0525 },
          { vendorId: 0x04b8 },
          { vendorId: 0x0483 },
          { vendorId: 0x0456 }
        ]
      });

      await device.open();

      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }

      await device.claimInterface(0);

      let endpointOut = 1;
      const iface = device.configuration.interfaces[0];
      if (iface && iface.alternate && iface.alternate.endpoints) {
        const outEndpoint = iface.alternate.endpoints.find(
          (ep: any) => ep.direction === 'out'
        );
        if (outEndpoint) {
          endpointOut = outEndpoint.endpointNumber;
        }
      }

      this.printer = { device, endpointOut };
      this.isConnected = true;

      return true;
    } catch (error) {
      console.error('Failed to connect to printer:', error);
      throw error;
    }
  }

  async getPairedPrinters(): Promise<USBDevice[]> {
    try {
      if (!('usb' in navigator)) {
        return [];
      }
      const devices = await (navigator as any).usb.getDevices();
      return devices;
    } catch (error) {
      console.error('Failed to get paired printers:', error);
      return [];
    }
  }

  async connectToExistingPrinter(device: USBDevice): Promise<boolean> {
    try {
      await device.open();

      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }

      await device.claimInterface(0);

      let endpointOut = 1;
      const iface = device.configuration?.interfaces[0];
      if (iface && iface.alternate && iface.alternate.endpoints) {
        const outEndpoint = iface.alternate.endpoints.find(
          (ep: any) => ep.direction === 'out'
        );
        if (outEndpoint) {
          endpointOut = outEndpoint.endpointNumber;
        }
      }

      this.printer = { device, endpointOut };
      this.isConnected = true;

      return true;
    } catch (error) {
      console.error('Failed to connect to existing printer:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.printer) {
      try {
        await this.printer.device.close();
      } catch (error) {
        console.error('Error disconnecting printer:', error);
      }
      this.printer = null;
      this.isConnected = false;
    }
  }

  private async sendData(data: string | Uint8Array): Promise<void> {
    if (!this.printer || !this.isConnected) {
      throw new Error('Printer not connected');
    }

    const bytes = typeof data === 'string'
      ? new TextEncoder().encode(data)
      : data;

    try {
      await this.printer.device.transferOut(this.printer.endpointOut, bytes);
    } catch (error) {
      console.error('Failed to send data to printer:', error);
      throw error;
    }
  }

  private cmd(command: string): string {
    return command;
  }

  async printReceipt(
    order: Order,
    branchName: string,
    branchAddress: string,
    currency: string
  ): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Printer not connected. Please connect a printer first.');
    }

    try {
      await this.sendData(this.cmd(`${this.ESC}@`));
      await this.sendData(this.cmd(`${this.ESC}a\x01`));
      await this.sendData(this.cmd(`${this.ESC}E\x01`));
      await this.sendData(`${branchName}\n`);
      await this.sendData(this.cmd(`${this.ESC}E\x00`));
      await this.sendData(this.cmd(`${this.ESC}a\x01`));
      await this.sendData(`${branchAddress}\n`);
      await this.sendData('--------------------------------\n');

      await this.sendData(this.cmd(`${this.ESC}a\x00`));
      await this.sendData(`Order #: ${order.uuid.substring(0, 8).toUpperCase()}\n`);
      await this.sendData(`Date: ${new Date(order.createdAt).toLocaleString()}\n`);

      if (order.tableNo) {
        await this.sendData(`Table: ${order.tableNo}\n`);
      }
      if (order.serverName) {
        await this.sendData(`Server: ${order.serverName}\n`);
      }

      await this.sendData('--------------------------------\n');

      for (const item of order.items) {
        const itemName = item.name.length > 24 ? item.name.substring(0, 24) : item.name;
        const qty = `${item.qty}x`;
        const price = `${currency} ${(item.price * item.qty).toFixed(3)}`;

        await this.sendData(`${itemName}\n`);
        await this.sendData(`  ${qty.padEnd(4)} ${price.padStart(12)}\n`);

        if (item.selectedModifiers && item.selectedModifiers.length > 0) {
          for (const mod of item.selectedModifiers) {
            await this.sendData(`  + ${mod.name}\n`);
          }
        }
      }

      await this.sendData('--------------------------------\n');

      const subtotal = `${currency} ${order.subtotal.toFixed(3)}`;
      const tax = `${currency} ${order.tax.toFixed(3)}`;
      const discount = order.discount ? `${currency} ${order.discount.toFixed(3)}` : `${currency} 0.000`;
      const total = `${currency} ${order.totalAmount.toFixed(3)}`;

      await this.sendData(`Subtotal: ${subtotal.padStart(20)}\n`);
      await this.sendData(`Tax:      ${tax.padStart(20)}\n`);
      if (order.discount && order.discount > 0) {
        await this.sendData(`Discount: ${discount.padStart(20)}\n`);
      }
      await this.sendData('--------------------------------\n');
      await this.sendData(this.cmd(`${this.ESC}E\x01`));
      await this.sendData(`TOTAL:    ${total.padStart(20)}\n`);
      await this.sendData(this.cmd(`${this.ESC}E\x00`));
      await this.sendData('--------------------------------\n');

      if (order.paymentMethod) {
        const method = order.paymentMethod.toUpperCase();
        await this.sendData(`Payment: ${method}\n`);
      }

      await this.sendData('\n');
      await this.sendData(this.cmd(`${this.ESC}a\x01`));
      await this.sendData('Thank you for your order!\n');
      await this.sendData(this.cmd(`${this.ESC}a\x00`));

      await this.sendData('\n\n\n');
      await this.sendData(this.cmd(`${this.GS}V\x00`));

    } catch (error) {
      console.error('Failed to print receipt:', error);
      throw error;
    }
  }

  async printKitchenOrder(
    order: Order,
    branchName: string
  ): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Printer not connected. Please connect a printer first.');
    }

    try {
      await this.sendData(this.cmd(`${this.ESC}@`));
      await this.sendData(this.cmd(`${this.ESC}a\x01`));
      await this.sendData(this.cmd(`${this.ESC}E\x01`));
      await this.sendData('KITCHEN ORDER\n');
      await this.sendData(this.cmd(`${this.ESC}E\x00`));
      await this.sendData('================================\n');

      await this.sendData(this.cmd(`${this.ESC}a\x00`));
      await this.sendData(`Order #: ${order.uuid.substring(0, 8).toUpperCase()}\n`);
      await this.sendData(`Time: ${new Date(order.createdAt).toLocaleTimeString()}\n`);

      if (order.tableNo) {
        await this.sendData(this.cmd(`${this.ESC}E\x01`));
        await this.sendData(`Table: ${order.tableNo}\n`);
        await this.sendData(this.cmd(`${this.ESC}E\x00`));
      }

      await this.sendData('================================\n\n');

      const kitchenItems = order.items.filter(item => item.isKitchenItem);

      for (const item of kitchenItems) {
        await this.sendData(this.cmd(`${this.ESC}E\x01`));
        await this.sendData(`${item.qty}x ${item.name}\n`);
        await this.sendData(this.cmd(`${this.ESC}E\x00`));

        if (item.selectedModifiers && item.selectedModifiers.length > 0) {
          for (const mod of item.selectedModifiers) {
            await this.sendData(`  + ${mod.name}\n`);
          }
        }
        await this.sendData('\n');
      }

      await this.sendData('================================\n');
      await this.sendData(`Server: ${order.serverName || 'N/A'}\n`);

      await this.sendData('\n\n\n');
      await this.sendData(this.cmd(`${this.GS}V\x00`));

    } catch (error) {
      console.error('Failed to print kitchen order:', error);
      throw error;
    }
  }

  getStatus(): { connected: boolean; printerName: string | null } {
    return {
      connected: this.isConnected,
      printerName: this.printer?.device.productName || null
    };
  }
}

export const printerService = new PrinterService();
