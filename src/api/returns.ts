
import api from "./api";

export type RefundStatus = "PENDING" | "COMPLETED";

export type ReturnItemCreate = {
  product_id: number;
  quantity: number;
  item_condition: "Resellable" | "Damaged";
};

export type ReturnCreate = {
  sale_id: number;
  reason: string;
  refund_status: RefundStatus;
  items: ReturnItemCreate[];
};

export type RefundStatusUpdate = {
  refund_status: RefundStatus;
};

export const createReturnApi = (data: ReturnCreate) =>
  api.post("/returns", data);

export const getReturnsApi = () =>
  api.get("/returns");

export const updateReturnStatusApi = (
  returnId: number,
  refund_status: RefundStatus,
) =>
  api.patch(`/returns/${returnId}/status`, {
    refund_status,
  });
