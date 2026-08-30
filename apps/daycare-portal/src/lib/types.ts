export type Severity = "mild" | "moderate" | "severe";

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface Allergen {
  id: string;
  name: string;
  severity: Severity;
  reaction: string;
}

export interface PlanForm {
  childName: string;
  childDob: string;
  guardianName: string;
  guardianPhone: string;
  emergencyContact: EmergencyContact;
  allergens: Allergen[];
  symptoms: string[];
  epinephrineMedication: string;
  epinephrineLocation: string;
  physicianName: string;
  physicianClinic: string;
  physicianPhone: string;
  appointmentInfo: string;
  signature: string;
  signedDate: string;
}
