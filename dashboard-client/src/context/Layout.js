// src/components/Layout.js
import React from "react";
import Sidebar from "../componenets/Sidebar";
import Header from "../componenets/Header";

function Layout({ children, role, collapsed, setCollapsed }) {
  return (
    <div className="app-layout" style={{ display: "flex", flexDirection: "row" }}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} role={role} />
      <div style={{ flex: 1 }}>
        <Header />
        <div style={{ padding: "20px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default Layout;
