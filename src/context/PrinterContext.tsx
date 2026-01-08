/// <reference path="../types/bluetooth.d.ts" />
import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useCampus } from '@/context/CampusContext';
import { PrinterSettings } from '@/types/campus';

interface PrinterDevice {
  device: BluetoothDevice | null;
  server: BluetoothRemoteGATTServer | null;
  characteristic: BluetoothRemoteGATTCharacteristic | null;
}

interface OrderData {
  orderNumber: string;
  items: { name: string; quantity: number; price: number }[];
  totalAmount: number;
  customerName: string;
  createdAt: string;
}

interface PrinterContextType {
  isPrinterConnected: boolean;
  printerDevice: PrinterDevice | null;
  isConnecting: boolean;
  isPrinting: boolean;
  printerSettings: PrinterSettings | null;
  connectPrinter: () => Promise<boolean>;
  disconnectPrinter: () => void;
  printTicket: (orderData: OrderData) => Promise<boolean>;
}

const PrinterContext = createContext<PrinterContextType | null>(null);

// ESC/POS Commands
const ESC = 0x1B;
const GS = 0x1D;

// Common ESC/POS Printer Service UUIDs
const PRINTER_SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb';
const PRINTER_CHAR_UUID = '00002af1-0000-1000-8000-00805f9b34fb';

// Fallback UUIDs for different printer brands
const FALLBACK_SERVICE_UUIDS = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // Generic SPP
  '0000ff00-0000-1000-8000-00805f9b34fb', // Some thermal printers
];

// Default printer settings
const DEFAULT_PRINTER_SETTINGS: PrinterSettings = {
  paper_width: '58mm',
  bluetooth_name_prefix: 'MTP',
  print_logo: true,
  footer_text: 'Thank you for your order!',
};

export function PrinterProvider({ children }: { children: React.ReactNode }) {
  const [isPrinterConnected, setIsPrinterConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const printerRef = useRef<PrinterDevice | null>(null);
  const { toast } = useToast();
  const { settings: campusSettings } = useCampus();

  // Get printer settings from campus or use defaults
  const printerSettings = campusSettings?.printer || DEFAULT_PRINTER_SETTINGS;

  // Text encoder for ESC/POS commands
  const textEncoder = new TextEncoder();

  const createESCPOSCommands = useCallback((orderData: OrderData): Uint8Array => {
    const commands: number[] = [];
    
    // Determine character width based on paper size
    // 58mm paper: ~32 characters, 80mm paper: ~48 characters
    const is80mm = printerSettings.paper_width === '80mm';
    const lineWidth = is80mm ? 48 : 32;
    const separator = '-'.repeat(lineWidth);
    
    // Initialize printer
    commands.push(ESC, 0x40); // ESC @ - Initialize
    
    // Center align
    commands.push(ESC, 0x61, 0x01); // ESC a 1 - Center
    
    // Bold ON + Double size
    commands.push(ESC, 0x45, 0x01); // ESC E 1 - Bold
    commands.push(GS, 0x21, 0x11); // GS ! 17 - Double width/height
    
    // Print header
    const header = `TOKEN #${orderData.orderNumber}\n`;
    commands.push(...textEncoder.encode(header));
    
    // Normal size
    commands.push(GS, 0x21, 0x00); // GS ! 0 - Normal
    commands.push(ESC, 0x45, 0x00); // ESC E 0 - Bold OFF
    
    // Separator
    commands.push(...textEncoder.encode(`${separator}\n`));
    
    // Left align for items
    commands.push(ESC, 0x61, 0x00); // ESC a 0 - Left
    
    // Customer name
    commands.push(...textEncoder.encode(`Customer: ${orderData.customerName}\n\n`));
    
    // Items header
    commands.push(ESC, 0x45, 0x01); // Bold ON
    commands.push(...textEncoder.encode('ITEMS:\n'));
    commands.push(ESC, 0x45, 0x00); // Bold OFF
    
    // Print items
    orderData.items.forEach(item => {
      const itemLine = `${item.quantity}x ${item.name}\n`;
      commands.push(...textEncoder.encode(itemLine));
      const priceLine = `   Rs.${item.price * item.quantity}\n`;
      commands.push(...textEncoder.encode(priceLine));
    });
    
    // Separator
    commands.push(...textEncoder.encode(`${separator}\n`));
    
    // Total
    commands.push(ESC, 0x45, 0x01); // Bold ON
    commands.push(GS, 0x21, 0x01); // Slightly larger
    const totalLine = `TOTAL: Rs.${orderData.totalAmount}\n`;
    commands.push(...textEncoder.encode(totalLine));
    commands.push(GS, 0x21, 0x00); // Normal size
    commands.push(ESC, 0x45, 0x00); // Bold OFF
    
    // Center for footer
    commands.push(ESC, 0x61, 0x01); // Center
    
    // Date/Time
    const date = new Date(orderData.createdAt);
    const dateStr = date.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    commands.push(...textEncoder.encode(`\n${dateStr}\n`));
    
    // Dynamic footer text from campus settings
    const footerText = printerSettings.footer_text || 'Thank you!';
    commands.push(...textEncoder.encode(`\n${footerText}\n\n`));
    
    // Feed and cut
    commands.push(ESC, 0x64, 0x04); // ESC d 4 - Feed 4 lines
    commands.push(GS, 0x56, 0x00); // GS V 0 - Full cut
    
    return new Uint8Array(commands);
  }, [printerSettings]);

  const connectPrinter = useCallback(async (): Promise<boolean> => {
    if (!navigator.bluetooth) {
      toast({
        title: 'Bluetooth Not Supported',
        description: 'This browser does not support Bluetooth. Use Chrome on Android.',
        variant: 'destructive',
      });
      return false;
    }

    setIsConnecting(true);

    try {
      // Build filter based on campus printer settings
      const namePrefix = printerSettings.bluetooth_name_prefix || 'MTP';
      
      // Request Bluetooth device with name prefix filter
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix }],
        optionalServices: FALLBACK_SERVICE_UUIDS,
      }).catch(async () => {
        // Fallback to accept all devices if prefix filter fails
        return await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: FALLBACK_SERVICE_UUIDS,
        });
      });

      if (!device.gatt) {
        throw new Error('GATT not available on device');
      }

      // Handle disconnection
      device.addEventListener('gattserverdisconnected', () => {
        setIsPrinterConnected(false);
        printerRef.current = null;
        toast({
          title: 'Printer Disconnected',
          description: 'Bluetooth connection lost. Please reconnect.',
          variant: 'destructive',
        });
      });

      // Connect to GATT server
      const server = await device.gatt.connect();

      // Try to find a suitable service
      let characteristic: BluetoothRemoteGATTCharacteristic | null = null;
      
      for (const serviceUUID of FALLBACK_SERVICE_UUIDS) {
        try {
          const service = await server.getPrimaryService(serviceUUID);
          const characteristics = await service.getCharacteristics();
          
          // Find a writable characteristic
          characteristic = characteristics.find(c => 
            c.properties.write || c.properties.writeWithoutResponse
          ) || null;
          
          if (characteristic) break;
        } catch {
          // Try next service UUID
          continue;
        }
      }

      if (!characteristic) {
        throw new Error('No writable characteristic found. Printer may not be compatible.');
      }

      printerRef.current = { device, server, characteristic };
      setIsPrinterConnected(true);
      
      toast({
        title: 'Printer Connected!',
        description: `Connected to ${device.name || 'Bluetooth Printer'}`,
      });

      return true;
    } catch (error) {
      console.error('Bluetooth connection error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (!errorMessage.includes('cancelled')) {
        toast({
          title: 'Connection Failed',
          description: errorMessage,
          variant: 'destructive',
        });
      }
      
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [toast]);

  const disconnectPrinter = useCallback(() => {
    if (printerRef.current?.server?.connected) {
      printerRef.current.server.disconnect();
    }
    printerRef.current = null;
    setIsPrinterConnected(false);
    toast({
      title: 'Printer Disconnected',
      description: 'Bluetooth printer has been disconnected.',
    });
  }, [toast]);

  const printTicket = useCallback(async (orderData: OrderData): Promise<boolean> => {
    if (!printerRef.current?.characteristic) {
      toast({
        title: 'Printer Not Connected',
        description: 'Please connect to a printer first.',
        variant: 'destructive',
      });
      return false;
    }

    setIsPrinting(true);

    try {
      const printData = createESCPOSCommands(orderData);
      
      // Some printers have a max write size, chunk the data
      const CHUNK_SIZE = 100;
      const characteristic = printerRef.current.characteristic;
      
      for (let i = 0; i < printData.length; i += CHUNK_SIZE) {
        const chunk = printData.slice(i, i + CHUNK_SIZE);
        
        if (characteristic.properties.writeWithoutResponse) {
          await characteristic.writeValueWithoutResponse(chunk);
        } else {
          await characteristic.writeValue(chunk);
        }
        
        // Small delay between chunks
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      return true;
    } catch (error) {
      console.error('Print error:', error);
      toast({
        title: 'Print Failed',
        description: 'Failed to print ticket. Check printer connection.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsPrinting(false);
    }
  }, [toast]);

  return (
    <PrinterContext.Provider
      value={{
        isPrinterConnected,
        printerDevice: printerRef.current,
        isConnecting,
        isPrinting,
        printerSettings,
        connectPrinter,
        disconnectPrinter,
        printTicket,
      }}
    >
      {children}
    </PrinterContext.Provider>
  );
}

export function usePrinter() {
  const context = useContext(PrinterContext);
  if (!context) {
    throw new Error('usePrinter must be used within a PrinterProvider');
  }
  return context;
}
