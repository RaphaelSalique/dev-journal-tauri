interface ThemeToggleProps {
  isDark: boolean;
  onToggle: () => void;
}

export default function ThemeToggle({ isDark, onToggle }: ThemeToggleProps) {
  return (
    <button 
      className="theme-toggle"
      onClick={onToggle}
      title={`Passer au thème ${isDark ? 'clair' : 'sombre'}`}
      aria-label={`Basculer vers le thème ${isDark ? 'clair' : 'sombre'}`}
    >
      <div className="theme-toggle-track">
        <div className="theme-toggle-thumb">
          <span className="theme-icon">
            {isDark ? '☀️' : '🌙'}
          </span>
        </div>
      </div>
      <span className="theme-label">
        {isDark ? 'Clair' : 'Sombre'}
      </span>
    </button>
  );
}