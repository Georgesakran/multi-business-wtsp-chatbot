// utils/phone.js
import { parsePhoneNumberFromString } from 'libphonenumber-js';

export const formatPhoneNumber = (phoneNumber) => {
  const parsed = parsePhoneNumberFromString(phoneNumber);

  if (parsed && parsed.isValid()) {
    return parsed.formatNational(); // You can also use formatInternational()
  }

  return phoneNumber; // fallback to original if not valid
};
