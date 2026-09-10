import mongoose, { Schema, model, models } from "mongoose";

export interface IEmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  isPrimary: boolean;
}

export interface IEmergencySharingSettings {
  isPubliclyAccessibleViaEmergencyLink: boolean;
  publicToken?: string;
  showAllergies: boolean;
  showBloodGroup: boolean;
  showMeds: boolean;
  showConditions: boolean;
  showContacts: boolean;
}

export interface IEmergencyProfile {
  userId: string;
  profileId: string; // "myself" or dependentId
  patientName: string;
  bloodGroup?: string;
  allergies: string[];
  chronicConditions: string[];
  currentEmergencyMeds: string[];
  emergencyContacts: IEmergencyContact[];
  hospitalPreference?: string;
  insuranceInfo?: {
    provider?: string;
    policyNumber?: string;
  };
  organDonor?: boolean;
  specialMedicalNotes?: string;
  sharingSettings: IEmergencySharingSettings;
  updatedAt: number;
}

const EmergencyContactSchema = new Schema<IEmergencyContact>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    relationship: { type: String, required: true },
    phone: { type: String, required: true },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false }
);

const EmergencyProfileSchema = new Schema<IEmergencyProfile>(
  {
    userId: { type: String, required: true, index: true },
    profileId: { type: String, default: "myself", index: true },
    patientName: { type: String, required: true },
    bloodGroup: { type: String },
    allergies: { type: [String], default: [] },
    chronicConditions: { type: [String], default: [] },
    currentEmergencyMeds: { type: [String], default: [] },
    emergencyContacts: [EmergencyContactSchema],
    hospitalPreference: { type: String },
    insuranceInfo: {
      provider: { type: String },
      policyNumber: { type: String },
    },
    organDonor: { type: Boolean, default: false },
    specialMedicalNotes: { type: String },
    sharingSettings: {
      isPubliclyAccessibleViaEmergencyLink: { type: Boolean, default: false },
      publicToken: { type: String, index: true, sparse: true },
      showAllergies: { type: Boolean, default: true },
      showBloodGroup: { type: Boolean, default: true },
      showMeds: { type: Boolean, default: true },
      showConditions: { type: Boolean, default: true },
      showContacts: { type: Boolean, default: true },
    },
    updatedAt: { type: Number, default: Date.now },
  },
  { timestamps: true }
);

EmergencyProfileSchema.index({ userId: 1, profileId: 1 }, { unique: true });

const EmergencyProfile =
  models.EmergencyProfile ||
  model<IEmergencyProfile>("EmergencyProfile", EmergencyProfileSchema);
export default EmergencyProfile;
