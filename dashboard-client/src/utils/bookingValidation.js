// utils/bookingValidation.js

/**
 * Validates phone number format:
 * - Must be exactly 10 digits
 * - Must start with "05"
 * - The third digit must be one of [0,1,2,3,4,5,8,9]
 */
  export function isValidPhoneNumber(phone) {
    return /^05[01234589]\d{7}$/.test(phone);
  }
  
  /**
   * Validates customer name max length
   */
  export function isValidCustomerName(name) {
    return typeof name === "string" &&
      /^[A-Za-z\u0590-\u05FF\u0600-\u06FF\s]+$/.test(name.trim()) && // allows letters and spaces (Latin, Hebrew, Arabic)
      name.trim().length <= 30;
  }
  
  
  /**
   * Validates that the selected date and time is today or in the future
   */
  export function isDateTimeInFuture(dateStr, timeStr) {
    const selectedDateTime = new Date(`${dateStr}T${timeStr}`);
    const now = new Date();
  
    // 6 months from now
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
  
    return selectedDateTime >= now && selectedDateTime <= sixMonthsFromNow;
  }
  
  export function isTimeWithinWorkingHours(timeStr, openingTime, closingTime) {
    return timeStr >= openingTime && timeStr <= closingTime;
  }
  