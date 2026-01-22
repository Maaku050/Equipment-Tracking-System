export type TransactionStatus =
    | 'Ongoing'
    | 'Incomplete'
    | 'Overdue'
    | 'Complete'
    | 'Request'
    | 'Incomplete and Overdue'
    | 'Complete and Overdue';

export type BorrowedItem = {
    id: string;
    itemName: string;
    pricePerQuantity: number;
    quantity: number;
    returned: boolean;
    returnedQuantity: number;
}

export type Transaction = {
    id: string;
    studentName: string;
    studentEmail: string;
    dueDate: Date;
    borrowedDate: Date;
    items: BorrowedItem[];
    status: TransactionStatus;
    totalPrice: number;
}