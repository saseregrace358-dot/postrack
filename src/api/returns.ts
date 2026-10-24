
import api from "./api";

export type ReturnItemCreate = {
  product_id: number;
  quantity: number;
  item_condition: "Resellable" | "Damaged";
};

export type ReturnCreate = {
  sale_id: number;
  reason: string;
  items: ReturnItemCreate[];
};

export const createReturnApi = (data: ReturnCreate) =>
  api.post("/returns", data);

export const getReturnsApi = () =>
  api.get("/returns");
