const { businessNameFor } = require("../business/businessNameHelper"); 
function getConfigMessage(biz, langKey, type, fallbackText = "") {
    const msg =
      biz?.config?.messages?.[langKey]?.[type] ||
      biz?.config?.messages?.en?.[type] ||
      fallbackText ||
      "";
  
    const name = businessNameFor(biz, langKey);
    return msg.replaceAll("{{business_name}}", name);
}

  module.exports = getConfigMessage;
