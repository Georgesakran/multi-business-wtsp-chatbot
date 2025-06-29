import React from "react";
import Sidebar from "../componenets/Sidebar";
import Header from "../componenets/Header";

function Layout({ children, role, collapsed, setCollapsed }) {
  return (
    <div className="app-layout" style={{ display: "flex", flexDirection: "row" }}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} role={role} />
      <div style={{ flex: 1 }}>
        <Header setCollapsed={setCollapsed} />
      <div className="content" style={{ paddingRight: "20px" , paddingLeft: "20px", paddingBottom: "20px" }}>
          {children}
      </div>
      </div>
    </div>
  );
}

export default Layout;