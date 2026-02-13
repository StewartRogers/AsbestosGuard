import { ApplicationWizardData } from '../../../types';

export const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
export const validatePhone = (phone: string) => /^\d{10}$/.test(phone.replace(/\D/g, ''));

export function validateStep(step: number, data: ApplicationWizardData): string | null {
  switch (step) {
    case 1:
      if (!data.contactFirstName || !data.contactLastName) {
        return 'First and Last Name are required.';
      }
      if (!validatePhone(data.contactPhone)) {
        return 'Please enter a valid 10-digit phone number.';
      }
      if (!validateEmail(data.contactEmail)) {
        return 'Please enter a valid email address.';
      }
      if (!data.isAdultAndAuthorized) {
        return 'You must certify that you are 18+ and authorized to represent the firm.';
      }
      if (!data.permissionToEmail) {
        return 'You must grant permission for WorkSafeBC to email you.';
      }
      return null;

    case 3:
      if (!data.firmLegalName) return 'Legal name is required.';
      if (!data.firmAccountNumber) return 'Account number is required.';
      if (!data.firmAddress) return 'Mailing address is required.';
      if (data.firmWorkersCount < 0) return 'Worker counts cannot be negative.';
      if (!data.ackNonTransferable) {
        return 'You must acknowledge the license transferability restriction to proceed.';
      }
      return null;

    case 5:
      for (const [index, asc] of data.associates.entries()) {
        if (!asc.relationship || asc.relationship === 'Please select') {
          return `Please select a relationship for Associate #${index + 1}.`;
        }
        const hasPersonName = asc.firstName && asc.lastName;
        const hasBusinessName = asc.businessName;
        if (!hasPersonName && !hasBusinessName) {
          return `Associate #${index + 1} must have either a person's name (First and Last) or a Firm Name.`;
        }
        if (!asc.email || !validateEmail(asc.email)) {
          return `Please enter a valid email for Associate #${index + 1}.`;
        }
        if (!asc.phone || !validatePhone(asc.phone)) {
          return `Please enter a valid 10-digit phone number for Associate #${index + 1}.`;
        }
      }
      return null;

    case 6:
      for (const asc of data.associates) {
        if (!asc.history) {
          return `Please complete the declaration for associate: ${asc.businessName || (asc.firstName + ' ' + asc.lastName)}`;
        }
      }
      if (!data.ackOutstandingAmounts || !data.ackCompliance || !data.ackEnforcement) {
        return "You must acknowledge all items in the 'Final Acknowledgments' section.";
      }
      if (!data.reqWorkersCert || !data.reqCompliance || !data.reqRecords || !data.reqCooperation) {
        return "You must agree to all items in the 'License Requirements' section.";
      }
      return null;

    default:
      return null;
  }
}
