function getVisibleMenuItemsSorted(biz) {
    return (biz?.config?.menuItems || [])
      .filter((i) => i && i.enabled !== false)
      .sort((a, b) => (parseInt(a.id) || 0) - (parseInt(b.id) || 0));
}
  
module.exports = { getVisibleMenuItemsSorted };
  