export const AZURE_REGIONS = [
  { value: "eastus", label: "East US" },
  { value: "westus", label: "West US" },
  { value: "westus2", label: "West US 2" },
  { value: "eastasia", label: "East Asia" },
  { value: "southeastasia", label: "Southeast Asia" },
  { value: "northeurope", label: "North Europe" },
  { value: "westeurope", label: "West Europe" },
] as const;

export type AzureRegion = typeof AZURE_REGIONS[number]['value'];

