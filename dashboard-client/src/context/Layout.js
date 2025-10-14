import React, { useEffect, useState } from "react";
import Sidebar from "../componenets/Sidebar";
import Header from "../componenets/Header";

function Layout({ children, role, collapsed, setCollapsed }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const contentStyle = {
    paddingRight: isMobile ? "10px" : "20px",
    paddingLeft: isMobile ? "10px" : "20px",
    paddingBottom: "20px",
  };

  return (
    <div className="app-layout" style={{ display: "flex", flexDirection: "row" }}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} role={role} />
      <div style={{ flex: 1 }}>
      <Header collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className="content" style={contentStyle}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default Layout;
