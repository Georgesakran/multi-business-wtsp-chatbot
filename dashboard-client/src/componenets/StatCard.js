import "../styles/StatCard.css";


    function StatCard({ icon, iconBg, label, value, growth, subtext }) {
      return (
        <div className="pro-card">
          <div className="pro-card-header">
            <div className="pro-icon" style={{ background: iconBg }}>
              <span className="material-icons-round">{icon}</span>
            </div>
            <div className="pro-meta">
              <span className="pro-label">{label}</span>
              <h4 className="pro-value">{value}</h4>
            </div>
          </div>
          <hr className="pro-divider" />
          <div className="pro-growth">
            <span className="pro-growth-positive">+{growth}%</span> {subtext}
          </div>
        </div>
      );
    }
    
    export default StatCard;