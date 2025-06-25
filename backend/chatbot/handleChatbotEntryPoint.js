// /chatbot/handleChatbotEntryPoint.js

const startBookingFlow = require('./flows/startBookingFlow');
const showProductCatalog = require('./flows/showProductCatalog');
const sendGPTResponse = require('./flows/sendGPTResponse');
const askUserToChooseFlow = require('./flows/askUserToChooseFlow');
const sendEventRSVP = require('./flows/sendEventRSVP');
const startDeliveryFlow = require('./flows/startDeliveryFlow');
const sendFallbackResponse = require('./sendFallbackResponse');

function handleChatbotEntryPoint(userMsg, business) {
  switch (business.businessType) {
    case 'booking':
      return startBookingFlow(userMsg, business);
    case 'product':
      return showProductCatalog(userMsg, business);
    case 'info':
      return sendGPTResponse(userMsg, business);
    case 'mixed':
      return askUserToChooseFlow(userMsg, business); // then branch
    case 'event':
      return sendEventRSVP(userMsg, business);
    case 'delivery':
      return startDeliveryFlow(userMsg, business);
    default:
      return sendFallbackResponse(userMsg, business);
  }
}

module.exports = handleChatbotEntryPoint;