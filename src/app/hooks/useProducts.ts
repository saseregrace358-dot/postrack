
import { useQuery } from "@tanstack/react-query";
import { getProducts } from "../../api/products";

export const productQueryKey = ["products"];

export function useProducts() {
  return useQuery({
    queryKey: productQueryKey,

    queryFn: async () => {
      const response = await getProducts();
      return response.data;
    },
  });
}
