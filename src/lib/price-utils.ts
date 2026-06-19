// Utility to calculate price based on unit selection
// basePrice is per baseUnit (e.g., ₹80 per 1kg)

export function parseUnitToMultiplier(unit: string): number {
  const cleaned = unit.trim().toLowerCase();

  // Handle "1kg", "2kg", "5kg" etc.
  const kgMatch = cleaned.match(/^([\d.]+)\s*kg$/);
  if (kgMatch) return parseFloat(kgMatch[1]);

  // Handle "500g", "250g", "100g", "50g", "25g" etc.
  const gMatch = cleaned.match(/^([\d.]+)\s*g$/);
  if (gMatch) return parseFloat(gMatch[1]) / 1000;

  // Handle "1L", "2L", "500ml", "250ml" etc.
  const lMatch = cleaned.match(/^([\d.]+)\s*l$/);
  if (lMatch) return parseFloat(lMatch[1]);

  const mlMatch = cleaned.match(/^([\d.]+)\s*ml$/);
  if (mlMatch) return parseFloat(mlMatch[1]) / 1000;

  // Handle "1pc", "2pc", "5pc" etc.
  const pcMatch = cleaned.match(/^([\d.]+)\s*pc$/);
  if (pcMatch) return parseFloat(pcMatch[1]);

  return 1;
}

export function calculatePrice(basePrice: number, baseUnit: string, selectedUnit: string): number {
  const baseMultiplier = parseUnitToMultiplier(baseUnit);
  const selectedMultiplier = parseUnitToMultiplier(selectedUnit);
  return Math.round((basePrice * selectedMultiplier / baseMultiplier) * 100) / 100;
}

export function getBaseUnitMultiplier(baseUnit: string): number {
  return parseUnitToMultiplier(baseUnit);
}