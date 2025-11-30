const { getLocalized } = require('./localization');
function productText(fieldObj, langKey) {
    return getLocalized(fieldObj, langKey);
}
module.exports = productText;
