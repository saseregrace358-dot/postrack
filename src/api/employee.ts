import api from "axios";

export const getEmployees = () =>
  api.get("/employees");

export const createEmployee = (data: any) =>
  api.post("/employees", data);

export const updateEmployee = (
  id: string | number,
  data: any
) =>
  api.put(`/employees/${id}`, data);

export const deleteEmployee = (
  id: string | number
) =>
  api.delete(`/employees/${id}`);