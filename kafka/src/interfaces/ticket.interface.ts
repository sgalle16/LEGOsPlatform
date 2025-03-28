export interface Ticket {
    id: string;
    eventName: string;
    userId: string;
    purchaseDate: Date;
    price: number;
    status: 'PURCHASED' | 'TRANSFERRED' | 'CANCELLED';
  }