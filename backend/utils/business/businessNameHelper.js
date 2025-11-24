function businessNameFor(biz, langKey) {
    if (!biz) return "";
    if (langKey === "ar") return biz.nameArabic || biz.nameEnglish || "";
    if (langKey === "he") return biz.nameHebrew || biz.nameEnglish || "";
    return biz.nameEnglish || biz.nameArabic || biz.nameHebrew || "";
}
module.exports = { businessNameFor };
