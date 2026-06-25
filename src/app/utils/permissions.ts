export const hasPermission = (
  permission: string
) => {
  const user = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  if (user.role === "owner") {
    return true;
  }

  return (
    user.permissions?.includes(permission)
  );
};