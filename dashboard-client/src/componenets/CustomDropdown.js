import React from "react";
import "./CustomDropdown.css";

const CustomDropdown = ({
  options,
  value,
  onChange,
  placeholder,
  isRtl = false,
  className = "",
}) => {
  const [open, setOpen] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 768);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".custom-dropdown")) setOpen(false);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div
      className={`custom-dropdown ${isRtl ? "rtl" : "ltr"} ${
        isMobile ? "mobile" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="dropdown-toggle-booking"
      >
        {selectedOption ? selectedOption.label : placeholder}
      </button>

      {open && (
        <ul className="dropdown-options">
          {options.map((opt) => (
            <li
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={opt.value === value ? "selected" : ""}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CustomDropdown;
