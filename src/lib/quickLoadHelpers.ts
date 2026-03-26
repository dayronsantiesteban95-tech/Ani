export interface OrderFormData {
  client_name: string;
  requested_by: string;
  pickup_address: string;
  pickup_zone: string;
  pickup_date: string;
  pickup_time_from: string;
  pickup_time_to: string;
  delivery_address: string;
  delivery_zone: string;
  delivery_date: string;
  delivery_time_from: string;
  delivery_time_to: string;
  description: string;
  packages: number;
  weight_lbs: number;
  distance_miles: number;
  dim_length: number;
  dim_width: number;
  dim_height: number;
  reference_number: string;
  purchase_order: string;
  package_type: string;
  vehicle_type: string;
  service_type: string;
  pricing_method: string;
  base_rate: number;
  per_mile_rate: number;
  fuel_surcharge: number;
  additional_charges: number;
  total_cost: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  hub: string;
  comments: string;
}

export function generateReference(): string {
  const d = new Date();
  const datePart = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = (Date.now() % 100000).toString(36).toUpperCase() +
    Math.random().toString(36).substring(2, 4).toUpperCase();
  return `ANK-${datePart}-${rand.slice(0, 5)}`;
}

export function exportToCSV(rows: Record<string, unknown>[], filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((h) => {
        const val = row[h] ?? "";
        const str = String(val);
        return str.includes(",") || str.includes('"') || str.includes("\n")
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(","),
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function cloneLoadData(existingLoad: Record<string, unknown>): Partial<OrderFormData> {
  return {
    client_name: (existingLoad.client_name as string) ?? "",
    pickup_address: (existingLoad.pickup_address as string) ?? "",
    delivery_address: (existingLoad.delivery_address as string) ?? "",
    customer_name: (existingLoad.customer_name as string) ?? "",
    customer_phone: (existingLoad.customer_phone as string) ?? "",
    packages: (existingLoad.packages as number) ?? 1,
    service_type: (existingLoad.service_type as string) ?? "standard",
    comments: (existingLoad.comments as string) ?? "",
    hub: (existingLoad.hub as string) ?? "phoenix",
    total_cost: (existingLoad.revenue as number) ?? 0,
    base_rate: (existingLoad.revenue as number) ?? 0,
    distance_miles: (existingLoad.miles as number) ?? 0,
    weight_lbs: (existingLoad.weight_lbs as number) ?? 0,
    reference_number: generateReference(),
  };
}
