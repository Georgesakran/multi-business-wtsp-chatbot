import React from "react";
import "./ToggleSwitch.css";

const ToggleSwitch = ({ checked, onChange }) => (
  <label className="switch">
    <input type="checkbox" checked={checked} onChange={onChange} />
    <span className="slider round"></span>
  </label>
);

export default ToggleSwitch;