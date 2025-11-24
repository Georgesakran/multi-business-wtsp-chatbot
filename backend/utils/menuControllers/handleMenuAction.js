
module.exports = async function handleMenuAction({ action, payload, lang, langKey, biz, state, from }) {
    const actions = {
      book_appointment: require("./actions/bookAppointment"),
      view_services: require("./actions/viewServices"),
      view_products: require("./actions/viewProducts"),
      view_courses: require("./actions/viewCourses"),
      about_location: require("./actions/aboutLocation"),
      my_appointments: require("./actions/myAppointments"),
      my_orders: require("./actions/myOrders"),
      reschedule_appointment: require("./actions/reschedule"),
      contact_us: require("./actions/contactUs"),
      follow_instagram: require("./actions/followInstagram"),
      custom: require("./actions/customFallback"),
    };
  
    const fn = actions[action] || actions["custom"];
  
    return fn({ action, payload, lang, langKey, biz, state, from });
  };